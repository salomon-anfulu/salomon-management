/**
 * 灵工打卡自动抓取（headless 版）— 不拦截修改请求，只被动收集响应
 * 
 * 原理：页面自身的请求已经带了正确的 authorization JWT + 签名头，
 * 我们只需要翻页收集所有数据即可。
 * 
 * 策略：监听 pageByParam 响应 → 如果有翻页，自动点击下一页 → 收集全部
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取（headless）');

  // 检查 auth
  if (!fs.existsSync(AUTH_FILE)) {
    log('❌ auth_state.json 不存在，请先在有头模式登录一次');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });

  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);
  log('✅ Cookies loaded: ' + authState.cookies.length);

  const page = await context.newPage();

  // 被动收集所有 pageByParam 和 summaryByTime 响应
  const allPageResults = [];
  let summaryData = null;

  page.on('response', async response => {
    const url = response.url();
    try {
      if (url.includes('pageByParam') && response.status() === 200) {
        const body = await response.text();
        const parsed = JSON.parse(body);
        if (parsed.data && parsed.data.results) {
          allPageResults.push(...parsed.data.results);
          log('📊 pageByParam 第' + parsed.data.pageNum + '页: ' + parsed.data.results.length + ' 条 (累计 ' + allPageResults.length + '/' + parsed.data.total + ')');
        }
      }
      if (url.includes('summaryByTime') && response.status() === 200 && !summaryData) {
        const body = await response.text();
        summaryData = JSON.parse(body).data;
        log('📈 summaryByTime: 排班' + summaryData.arrangedNumber + '人次 出勤' + summaryData.attendanceTimeNumber + '人次');
      }
    } catch (e) {}
  });

  // 访问考勤页面
  const ATTENDANCE_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
  log('📡 访问考勤页面...');
  await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  if (page.url().includes('login')) {
    log('❌ Cookie 失效！需要在本地重新登录');
    await browser.close();
    process.exit(1);
  }
  log('✅ 免登录成功');

  // 等待初始加载
  log('⏳ 等待页面加载...');
  await page.waitForTimeout(8000);
  log('   已收集 ' + allPageResults.length + ' 条初始数据');

  // 点击"过去一个月"
  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    log('   ✅ 已点击');
    await page.waitForTimeout(5000);
  } else {
    log('   ⚠️ 未找到"过去一个月"，尝试"过去一周"');
    const weekBtn = await page.$('text=过去一周');
    if (weekBtn) {
      await weekBtn.click();
      await page.waitForTimeout(5000);
    }
  }

  log('   已收集 ' + allPageResults.length + ' 条');

  // 翻页收集（如果 pageSize 不够）
  let pageNum = 2;
  let maxPages = 20; // 安全限制
  while (maxPages-- > 0) {
    // 查找"下一页"按钮
    const nextBtn = await page.$('.ant-pagination-next:not(.ant-pagination-disabled)');
    if (!nextBtn) {
      log('📄 没有下一页了');
      break;
    }
    log('📄 翻到第 ' + pageNum + ' 页...');
    await nextBtn.click();
    await page.waitForTimeout(3000);
    pageNum++;
  }

  log('\n📊 总计收集 ' + allPageResults.length + ' 条原始记录');

  // 去重
  const seenKeys = new Set();
  const allRecords = [];
  allPageResults.forEach(r => {
    const key = r.workerName + '_' + r.effectiveDay + '_' + r.arrangedTimeDetail;
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

  log('✅ 去重后 ' + allRecords.length + ' 条');

  if (allRecords.length === 0) {
    log('⚠️ 没有抓到数据，可能 cookie 过期或页面结构变了');
    await browser.close();
    process.exit(1);
  }

  // 打印日期分布
  const dates = [...new Set(allRecords.map(r => r.date))].sort();
  log('\n📅 日期分布 (' + dates.length + ' 天):');
  dates.forEach(d => {
    const recs = allRecords.filter(r => r.date === d);
    log('  ' + d + ': ' + recs.length + '人');
  });

  // 合并已有数据
  let existing = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    const old = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    existing = old.records || [];
    log('\n📦 已有 ' + existing.length + ' 条，合并中...');
  }
  const merged = [...existing, ...allRecords];
  const recordMap = new Map();
  merged.forEach(r => {
    const key = r.name + '_' + r.date + '_' + r.scheduleTime;
    recordMap.set(key, r);
  });
  const unique = Array.from(recordMap.values()).sort((a, b) => {
    // 归一化日期比较 (2026/07/09 vs 2026-07-09)
    const da = a.date.replace(/\//g, '-');
    const db = b.date.replace(/\//g, '-');
    return da.localeCompare(db) || a.name.localeCompare(b.name);
  });

  // 归一化日期格式 (统一为 YYYY-MM-DD)
  unique.forEach(r => {
    if (r.date.includes('/')) {
      const [y, m, d] = r.date.split('/');
      r.date = y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
    }
  });

  const output = {
    fetchedAt: new Date().toISOString(),
    totalCount: unique.length,
    summary: summaryData,
    records: unique,
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  log('💾 已保存到 weekly_attendance_clean.json: ' + unique.length + ' 条');

  // 保存原始数据
  fs.writeFileSync(RAW_FILE, JSON.stringify(allPageResults, null, 2));
  log('💾 已保存原始数据到 full_attendance_raw.json');

  // 更新 auth_state（保存最新 cookies）
  await context.storageState({ path: AUTH_FILE });
  log('💾 已更新 auth_state.json');

  await browser.close();
  log('🎉 完成！');
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
