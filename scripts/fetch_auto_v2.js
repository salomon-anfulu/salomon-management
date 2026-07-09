/**
 * 灵工打卡自动抓取 v2（headless + 安全拦截增大 pageSize）
 * 
 * 关键改进：使用 route.fetch 时保留所有原始 header（包括 authorization、x-qtb-sign），
 *           只修改 body 中的 pageSize 和时间范围
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取 v2（headless + 安全拦截）');

  if (!fs.existsSync(AUTH_FILE)) {
    log('❌ auth_state.json 不存在');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });

  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);
  log('✅ Cookies: ' + authState.cookies.length);

  const page = await context.newPage();

  // 安全拦截：保留所有原始 header，只改 body
  const allPageResults = [];
  let summaryData = null;
  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  log('📅 范围: ' + new Date(startTime).toLocaleDateString() + ' ~ ' + new Date(endTime).toLocaleDateString());

  await page.route('**/pageByParam', async (route, request) => {
    const postData = request.postData();
    if (!postData) { await route.continue(); return; }
    try {
      const body = JSON.parse(postData);
      body.startTime = startTime;
      body.endTime = endTime;
      body.pageSize = 200;
      body.pageNum = 1;

      log('🔄 拦截 pageByParam → pageSize:200');

      // 关键：保留所有原始 header
      const response = await route.fetch({
        method: request.method(),
        headers: request.headers(),  // 保留 authorization + x-qtb-sign 等
        postData: JSON.stringify(body),
        maxRedirects: 0,
      });
      const responseBody = await response.text();
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed.success && parsed.data && parsed.data.results) {
          allPageResults.push(...parsed.data.results);
          log('   ✅ ' + parsed.data.results.length + ' 条 (total: ' + parsed.data.total + ')');
        } else {
          log('   ⚠️ API返回: ' + parsed.msg + ' (code:' + parsed.code + ')');
          // 如果改 pageSize 失败，回退到原始请求
          await route.continue();
          return;
        }
      } catch (e) {}

      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: responseBody,
      });
    } catch (e) {
      log('   ⚠️ 拦截失败: ' + e.message);
      await route.continue();
    }
  });

  // summaryByTime 不拦截，被动收集
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('summaryByTime') && response.status() === 200 && !summaryData) {
      try {
        const body = await response.text();
        summaryData = JSON.parse(body).data;
        log('📈 summary: 排班' + summaryData.arrangedNumber + ' 出勤' + summaryData.attendanceTimeNumber);
      } catch (e) {}
    }
  });

  // 访问考勤页面
  const ATTENDANCE_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
  log('📡 访问考勤页面...');
  await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  if (page.url().includes('login')) {
    log('❌ Cookie 失效！');
    await browser.close();
    process.exit(1);
  }
  log('✅ 免登录成功');

  log('⏳ 等待加载...');
  await page.waitForTimeout(8000);
  log('   收集 ' + allPageResults.length + ' 条');

  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(6000);
    log('   收集 ' + allPageResults.length + ' 条');
  } else {
    log('   ⚠️ 未找到按钮');
  }

  log('\n📊 总计 ' + allPageResults.length + ' 条原始记录');

  // 去重 + 解析
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

  if (allRecords.length > 0) {
    const dates = [...new Set(allRecords.map(r => r.date))].sort();
    log('📅 ' + dates.length + ' 天: ' + dates[0] + ' ~ ' + dates[dates.length - 1]);
    dates.forEach(d => {
      log('  ' + d + ': ' + allRecords.filter(r => r.date === d).length + '人');
    });

    // 合并已有
    let existing = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).records || [];
    }
    const merged = [...existing, ...allRecords];
    const map = new Map();
    merged.forEach(r => {
      const key = r.name + '_' + r.date + '_' + r.scheduleTime;
      map.set(key, r);
    });
    const unique = Array.from(map.values()).sort((a, b) =>
      a.date.replace(/\//g, '-').localeCompare(b.date.replace(/\//g, '-')) || a.name.localeCompare(b.name)
    );
    // 归一化日期
    unique.forEach(r => {
      if (r.date.includes('/')) {
        const [y, m, d] = r.date.split('/');
        r.date = y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
      }
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      totalCount: unique.length,
      summary: summaryData,
      records: unique,
    }, null, 2));
    log('💾 已保存 ' + unique.length + ' 条');

    fs.writeFileSync(RAW_FILE, JSON.stringify(allPageResults, null, 2));
  }

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  log('🎉 完成！');
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
