/**
 * Headless fetch 测试脚本 - 验证 AI 环境能否自动抓取灵工考勤
 * 使用 auth_state.json 免登录，headless chromium 无头模式
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 Headless fetch 测试');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });

  // 加载 cookies
  if (!fs.existsSync(AUTH_FILE)) {
    log('❌ auth_state.json 不存在');
    process.exit(1);
  }
  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);
  log('✅ Cookies loaded: ' + authState.cookies.length);

  const page = await context.newPage();

  // 拦截 API
  const intercepted = [];
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  log('📅 Range: ' + new Date(startTime).toLocaleDateString() + ' ~ ' + new Date(endTime).toLocaleDateString());

  await page.route('**/pageByParam', async (route, request) => {
    const originalBody = request.postData();
    if (originalBody) {
      try {
        const body = JSON.parse(originalBody);
        body.startTime = startTime;
        body.endTime = endTime;
        body.pageSize = 200;
        body.pageNum = 1;

        log('🔄 拦截 pageByParam，URL: ' + request.url());

        const response = await route.fetch({
          method: request.method(),
          headers: request.headers(),
          postData: JSON.stringify(body),
        });
        const responseBody = await response.text();
        try {
          const parsed = JSON.parse(responseBody);
          if (parsed.data && parsed.data.results) {
            log('   ✅ 获取到 ' + parsed.data.results.length + ' 条 (total: ' + parsed.data.total + ')');
          }
        } catch (e) {}
        intercepted.push({ url: request.url(), body: responseBody });
        await route.fulfill({ status: response.status(), headers: response.headers(), body: responseBody });
        return;
      } catch (e) {
        log('   ⚠️ 修改失败: ' + e.message);
      }
    }
    await route.continue();
  });

  await page.route('**/summaryByTime', async (route, request) => {
    const originalBody = request.postData();
    if (originalBody) {
      try {
        const body = JSON.parse(originalBody);
        body.startTime = startTime;
        body.endTime = endTime;
        const response = await route.fetch({
          method: request.method(),
          headers: request.headers(),
          postData: JSON.stringify(body),
        });
        const responseBody = await response.text();
        intercepted.push({ url: request.url(), body: responseBody });
        await route.fulfill({ status: response.status(), headers: response.headers(), body: responseBody });
        return;
      } catch (e) {}
    }
    await route.continue();
  });

  // 访问考勤页面
  const ATTENDANCE_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
  log('📡 访问考勤页面...');
  await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  log('📍 URL: ' + page.url());

  if (page.url().includes('login')) {
    log('❌ Cookie 失效！需要人工登录');
    await browser.close();
    process.exit(1);
  }
  log('✅ 免登录成功！');

  // 等待初始加载
  log('⏳ 等待页面加载...');
  await page.waitForTimeout(8000);
  log('   已收到 ' + intercepted.length + ' 个响应');

  // 点击"过去一个月"
  log('🖱️ 尝试点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    log('   ✅ 已点击');
    await page.waitForTimeout(5000);
  } else {
    log('   ⚠️ 未找到，尝试"过去一周"');
    const weekBtn = await page.$('text=过去一周');
    if (weekBtn) {
      await weekBtn.click();
      log('   ✅ 已点击"过去一周"');
      await page.waitForTimeout(5000);
    }
  }

  log('\n📊 共收到 ' + intercepted.length + ' 个响应');

  // 解析数据
  const allRecords = [];
  const seenKeys = new Set();

  for (const resp of intercepted) {
    try {
      const parsed = JSON.parse(resp.body);
      if (resp.url.includes('pageByParam') && parsed.data && parsed.data.results) {
        log('📊 pageByParam: ' + parsed.data.results.length + ' 条');
        parsed.data.results.forEach(r => {
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
      }
    } catch (e) {}
  }

  log('\n✅ 本次抓取 ' + allRecords.length + ' 条新记录');
  if (allRecords.length > 0) {
    const dates = [...new Set(allRecords.map(r => r.date))].sort();
    log('日期范围: ' + dates[0] + ' ~ ' + dates[dates.length - 1]);
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
    const unique = Array.from(recordMap.values()).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

    const output = {
      fetchedAt: new Date().toISOString(),
      totalCount: unique.length,
      dateRange: new Date(startTime).toISOString().split('T')[0] + ' ~ ' + new Date(endTime).toISOString().split('T')[0],
      records: unique,
    };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    log('💾 已保存: ' + unique.length + ' 条 (+' + allRecords.length + ' 新)');
  } else {
    log('⚠️ 没有抓到新数据（可能页面没触发 API，或数据已是最新的）');
  }

  await browser.close();
  log('🎉 Headless fetch 完成！');
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
