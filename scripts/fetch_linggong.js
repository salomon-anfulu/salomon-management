/**
 * 灵工打卡 - 自动化数据拉取脚本（v6 拦截修改版）
 * 
 * 策略：
 *   1. 通过 page.route 拦截 pageByParam API 请求
 *   2. 修改请求体中的 startTime/endTime 为本月范围，pageSize 改为 200
 *   3. 点击"过去一个月"按钮触发请求
 *   4. 截获响应获取全月数据
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, ...vals] = arg.split('=');
  acc[key.replace(/^--/, '')] = vals.join('=') || true;
  return acc;
}, {});

const PHONE = args.phone || '';
const PASSWORD = args.password || '';
const RANGE = args.range || 'month';

if (!PHONE || !PASSWORD) {
  console.log('❌ 用法: node fetch_linggong.js --phone=手机号 --password=密码 [--range=week|month]');
  process.exit(1);
}

const BASE_URL = 'https://qtbcloud.linggongguanjia.com';
const LOGIN_URL = `${BASE_URL}/app/login`;
const ATTENDANCE_URL = `${BASE_URL}/app/employment/projectDataCenter/attendanceData`;
const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const AUTH_FILE = path.join(OUTPUT_DIR, 'auth_state.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

// 计算起止时间戳（毫秒）
// 支持 --range=month（本月）、--range=lastmonth（上月）、--start=YYYY-MM-DD --end=YYYY-MM-DD
function getMonthTimestamps() {
  const now = new Date();
  
  if (RANGE === 'lastmonth') {
    // 上月完整范围
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startTime: firstDay.getTime(), endTime: lastDay.getTime() };
  }
  
  if (args.start && args.end) {
    // 自定义日期范围
    const [sy, sm, sd] = args.start.split('-').map(Number);
    const [ey, em, ed] = args.end.split('-').map(Number);
    const startTime = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    const endTime = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();
    return { startTime, endTime };
  }
  
  // 默认本月
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startTime: firstDay.getTime(),
    endTime: endOfDay.getTime(),
  };
}

(async () => {
  log('🔧 灵工打卡数据拉取工具 v6（拦截修改版）');
  log(`📱 手机号: ${PHONE.slice(0, 3)}****${PHONE.slice(-4)}`);

  const { startTime, endTime } = getMonthTimestamps();
  log(`📅 本月范围: ${new Date(startTime).toLocaleDateString()} ~ ${new Date(endTime).toLocaleDateString()}`);
  log(`   时间戳: ${startTime} ~ ${endTime}`);

  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const page = await context.newPage();

  // ===== 拦截并修改API请求 =====
  const interceptedResponses = [];
  let requestModified = 0;

  await page.route('**/pageByParam', async (route, request) => {
    const originalBody = request.postData();
    if (originalBody) {
      try {
        const body = JSON.parse(originalBody);
        // 修改为本月范围 + 大pageSize
        body.startTime = startTime;
        body.endTime = endTime;
        body.pageSize = 200; // 一次拉取最多200条
        body.pageNum = 1;
        
        log(`🔄 拦截并修改 pageByParam 请求:`);
        log(`   startTime: ${startTime} → ${new Date(startTime).toLocaleDateString()}`);
        log(`   endTime: ${endTime} → ${new Date(endTime).toLocaleDateString()}`);
        log(`   pageSize: ${body.pageSize}`);
        
        requestModified++;
        
        // 用修改后的body继续请求
        const response = await route.fetch({
          method: request.method(),
          headers: request.headers(),
          postData: JSON.stringify(body),
        });
        
        const responseBody = await response.text();
        
        // 解析响应看看有多少数据
        try {
          const parsed = JSON.parse(responseBody);
          if (parsed.data && parsed.data.results) {
            log(`   ✅ 获取到 ${parsed.data.results.length} 条记录 (total: ${parsed.data.total})`);
          }
        } catch (e) {}
        
        interceptedResponses.push({
          url: request.url(),
          body: responseBody,
          modifiedBody: JSON.stringify(body),
        });
        
        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: responseBody,
        });
        return;
      } catch (e) {
        log(`   ⚠️ 修改请求体失败: ${e.message}`);
      }
    }
    await route.continue();
  });

  // 也拦截 summaryByTime
  await page.route('**/summaryByTime', async (route, request) => {
    const originalBody = request.postData();
    if (originalBody) {
      try {
        const body = JSON.parse(originalBody);
        body.startTime = startTime;
        body.endTime = endTime;
        
        requestModified++;
        
        const response = await route.fetch({
          method: request.method(),
          headers: request.headers(),
          postData: JSON.stringify(body),
        });
        
        const responseBody = await response.text();
        interceptedResponses.push({
          url: request.url(),
          body: responseBody,
        });
        
        await route.fulfill({
          status: response.status(),
          headers: response.headers(),
          body: responseBody,
        });
        return;
      } catch (e) {}
    }
    await route.continue();
  });

  // ===== 登录 =====
  let loggedIn = false;
  if (fs.existsSync(AUTH_FILE)) {
    log('🔑 尝试用保存的登录状态...');
    try {
      const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      await context.addCookies(authState.cookies);
      await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      if (!page.url().includes('login')) {
        log('✅ 免登录成功！');
        loggedIn = true;
      }
    } catch (e) {
      log('⚠️ 登录状态失效');
    }
  }

  if (!loggedIn) {
    log('📡 访问登录页面...');
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const pwdTab = await page.$('text=密码登录');
    if (pwdTab) { await pwdTab.click(); await page.waitForTimeout(500); }

    const phoneInput = await page.$('input[placeholder*="账号"]');
    if (phoneInput) { await phoneInput.fill(PHONE); log('✅ 已填写手机号'); }

    const pwdInput = await page.$('input[type="password"]');
    if (pwdInput) { await pwdInput.fill(PASSWORD); log('✅ 已填写密码'); }

    log('═══════════════════════════════════════');
    log('⏳ 请在浏览器中输入验证码并点击登录');
    log('═══════════════════════════════════════');

    try {
      await page.waitForURL(url => !url.toString().includes('login'), { timeout: 180000 });
      log('✅ 登录成功！');
    } catch (e) {
      log('❌ 登录超时');
      await browser.close();
      process.exit(1);
    }

    await context.storageState({ path: AUTH_FILE });
    log('💾 登录状态已保存');

    await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // ===== 等待初始加载 =====
  log('\n📡 等待页面加载...');
  await page.waitForTimeout(5000);
  log(`   已拦截并修改 ${requestModified} 个API请求`);
  log(`   已收到 ${interceptedResponses.length} 个响应`);

  // ===== 点击"过去一个月"按钮触发额外请求 =====
  log('\n📡 尝试点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    log('  ✅ 已点击"过去一个月"');
    await page.waitForTimeout(5000);
  } else {
    log('  ⚠️ 未找到"过去一个月"按钮');
    // 也试试"过去一周"
    const weekBtn = await page.$('text=过去一周');
    if (weekBtn) {
      await weekBtn.click();
      log('  ✅ 已点击"过去一周"');
      await page.waitForTimeout(5000);
    }
  }

  log(`\n📊 共收到 ${interceptedResponses.length} 个API响应，修改了 ${requestModified} 个请求`);

  // ===== 解析数据 =====
  const allRecords = [];
  let summary = null;
  const seenKeys = new Set();

  for (const resp of interceptedResponses) {
    try {
      const parsed = JSON.parse(resp.body);
      if (resp.url.includes('pageByParam') && parsed.data && parsed.data.results) {
        log(`  📊 pageByParam: ${parsed.data.results.length} 条 (total: ${parsed.data.total})`);
        parsed.data.results.forEach(r => {
          const key = `${r.workerName}_${r.effectiveDay}_${r.arrangedTimeDetail}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allRecords.push({
              name: r.workerName,
              date: r.effectiveDay,
              scheduleTime: r.arrangedTimeDetail,
              restTime: r.restTimeDetail,
              clockInTime: r.attendanceDetail,
              status: r.attendanceTimeStatusRemark,
              totalHours: parseFloat(r.totalTime) || 0,
              scheduleHours: r.arrangeTime || 0,
              lateMin: r.onWorkLateTime || 0,
              leaveMin: r.offWorkLeaveTime || 0,
              overtime: parseFloat(r.overtime) || 0,
              department: r.departmentName,
              project: r.flexibleProjectName,
              phone: r.workerMobile,
              signIn: r.attendanceDetailMap?.onWorkAttendance || '',
              signOut: r.attendanceDetailMap?.offWorkAttendance || '',
            });
          }
        });
      }
      if (resp.url.includes('summaryByTime') && parsed.data) {
        summary = parsed.data;
      }
    } catch (e) {}
  }

  // 按日期+姓名排序
  allRecords.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  // 打印摘要
  log(`\n📊 考勤数据摘要（${allRecords.length} 条）:`);
  const dateGroups = {};
  allRecords.forEach(r => {
    if (!dateGroups[r.date]) dateGroups[r.date] = [];
    dateGroups[r.date].push(r);
  });

  Object.keys(dateGroups).sort().forEach(date => {
    const records = dateGroups[date];
    log(`\n  📅 ${date} (${records.length}人):`);
    records.forEach(r => {
      const icon = r.status === '考勤正常' ? '✅' : r.status === '考勤异常' ? '⚠️' : '🕐';
      log(`    ${r.name} | 排班:${r.scheduleTime} | 打卡:${r.clockInTime} | ${icon} ${r.status} | ${r.totalHours}h${r.lateMin > 0 ? ' | 迟到' + r.lateMin + 'min' : ''}`);
    });
  });

  // 打印汇总
  if (summary) {
    log('\n📈 汇总统计:');
    log(`  排班人次: ${summary.arrangedNumber}  出勤人次: ${summary.attendanceTimeNumber}`);
    log(`  排班工时: ${summary.arrangeTime}h  总工时: ${summary.totalTime}h  平均: ${summary.averageTime}h`);
    log(`  迟到: ${summary.lateNumber}  早退: ${summary.leaveNumber}  缺卡: ${summary.missCardNumber}  旷工: ${summary.absenteeismNumber}`);
  }

  // 合并已有数据
  let existingRecords = [];
  const outputFile = path.join(OUTPUT_DIR, 'weekly_attendance_clean.json');
  if (fs.existsSync(outputFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      existingRecords = existing.records || [];
      log(`\n📦 发现已有数据 ${existingRecords.length} 条，将合并新数据`);
    } catch (e) {}
  }

  const mergedRecords = [...existingRecords, ...allRecords];
  const recordMap = new Map();
  mergedRecords.forEach(r => {
    const key = `${r.name}_${r.date}_${r.scheduleTime}`;
    recordMap.set(key, r);
  });
  const uniqueRecords = Array.from(recordMap.values());
  uniqueRecords.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  // 保存
  const output = {
    fetchedAt: new Date().toISOString(),
    totalCount: uniqueRecords.length,
    dateRange: `${new Date(startTime).toISOString().split('T')[0]} ~ ${new Date(endTime).toISOString().split('T')[0]}`,
    summary: summary,
    records: uniqueRecords,
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  log(`\n💾 数据已保存到: ${outputFile}`);
  log(`   本次新增: ${allRecords.length} 条 · 合并后总计: ${uniqueRecords.length} 条`);

  // 保存原始数据
  const rawFile = path.join(OUTPUT_DIR, 'full_attendance_raw.json');
  const rawAllRecords = [];
  for (const resp of interceptedResponses) {
    try {
      const parsed = JSON.parse(resp.body);
      if (resp.url.includes('pageByParam') && parsed.data && parsed.data.results) {
        rawAllRecords.push(...parsed.data.results);
      }
    } catch (e) {}
  }
  fs.writeFileSync(rawFile, JSON.stringify(rawAllRecords, null, 2));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'v6_final_result.png'), fullPage: true });

  log('\n✅ 完成！');
  await page.waitForTimeout(5000);
  await browser.close();
  log('👋 浏览器已关闭');
})().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
