/**
 * 灵工打卡自动抓取 — 最终版（headless + 持续翻页直到完成）
 * 
 * 用法（在 AI 环境中）：
 *   PLAYWRIGHT_BROWSERS_PATH=~/Library/Caches/ms-playwright \
 *   NODE_PATH=/Users/a86137/.workbuddy/binaries/node/workspace/node_modules \
 *   /Users/a86137/.workbuddy/binaries/node/versions/22.22.2/bin/node scripts/fetch_auto_final.js
 *
 * 依赖 auth_state.json 有效。失效时需要本地重新登录生成。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取（最终版）');

  if (!fs.existsSync(AUTH_FILE)) {
    log('❌ auth_state.json 不存在，请先在本地有头模式登录一次');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);
  log('✅ Cookies: ' + authState.cookies.length);

  const page = await context.newPage();

  // 被动收集所有 API 响应
  const allResults = [];
  let summaryData = null;

  page.on('response', async response => {
    const url = response.url();
    try {
      if (url.includes('pageByParam') && response.status() === 200) {
        const parsed = JSON.parse(await response.text());
        if (parsed.success && parsed.data?.results) {
          allResults.push(...parsed.data.results);
        }
      }
      if (url.includes('summaryByTime') && response.status() === 200) {
        const d = JSON.parse(await response.text()).data;
        if (d.arrangedNumber > (summaryData?.arrangedNumber || 0)) summaryData = d;
      }
    } catch (e) {}
  });

  // 1. 访问考勤页面
  const ATTENDANCE_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
  log('📡 访问考勤页面...');
  await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  if (page.url().includes('login')) {
    log('❌ Cookie 失效！请在本地重新运行 fetch_linggong.js 登录');
    await browser.close();
    process.exit(1);
  }
  log('✅ 免登录成功');
  await page.waitForTimeout(5000);

  // 2. 点击"过去一个月"
  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(6000);
    log('   已收集 ' + allResults.length + ' 条, summary排班: ' + (summaryData?.arrangedNumber || '?'));
  }

  // 3. 持续翻页（点"下一页"直到禁用）
  let pageNum = 2;
  let stuck = 0;
  const maxPages = 100;

  for (let i = 0; i < maxPages && stuck < 5; i++) {
    const before = allResults.length;

    // 点击 Element UI 下一页
    const nextBtn = await page.$('.el-pagination .btn-next').catch(() => null);
    if (!nextBtn) { log('⚠️ 无下一页按钮'); break; }

    const disabled = await nextBtn.evaluate(el =>
      el.classList.contains('disabled') || el.classList.contains('el-disabled') ||
      el.getAttribute('disabled') !== null || el.disabled
    ).catch(() => true);

    if (disabled) { log('📄 下一页已禁用，翻页完成'); break; }

    await nextBtn.click();
    await page.waitForTimeout(2500);

    if (allResults.length === before) {
      stuck++;
    } else {
      stuck = 0;
      log('📄 第' + pageNum + '页 → 累计 ' + allResults.length + ' 条');
      pageNum++;
    }
  }

  log('\n📊 总计收集 ' + allResults.length + ' 条原始记录');

  // 4. 去重 + 解析
  const seen = new Set();
  const records = [];
  allResults.forEach(r => {
    const k = r.workerName + '_' + r.effectiveDay + '_' + r.arrangedTimeDetail;
    if (!seen.has(k)) {
      seen.add(k);
      records.push({
        name: r.workerName, date: r.effectiveDay,
        scheduleTime: r.arrangedTimeDetail, restTime: r.restTimeDetail,
        clockInTime: r.attendanceDetail, status: r.attendanceTimeStatusRemark,
        totalHours: parseFloat(r.totalTime) || 0, scheduleHours: r.arrangeTime || 0,
        lateMin: r.onWorkLateTime || 0, leaveMin: r.offWorkLeaveTime || 0,
        overtime: parseFloat(r.overtime) || 0, department: r.departmentName,
        project: r.flexibleProjectName, phone: r.workerMobile,
        signIn: r.attendanceDetailMap?.onWorkAttendance || '',
        signOut: r.attendanceDetailMap?.offWorkAttendance || '',
      });
    }
  });
  log('✅ 去重后 ' + records.length + ' 条');

  if (records.length === 0) {
    log('⚠️ 无新数据');
    await browser.close();
    process.exit(0);
  }

  // 5. 打印日期分布
  const dates = [...new Set(records.map(r => r.date))].sort();
  log('📅 ' + dates.length + ' 天: ' + dates[0] + ' ~ ' + dates[dates.length - 1]);

  // 6. 合并已有数据
  let existing = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).records || [];
    log('📦 已有 ' + existing.length + ' 条');
  }
  const map = new Map();
  [...existing, ...records].forEach(r => {
    map.set(r.name + '_' + r.date + '_' + r.scheduleTime, r);
  });
  const unique = Array.from(map.values()).sort((a, b) =>
    a.date.replace(/\//g, '-').localeCompare(b.date.replace(/\//g, '-')) || a.name.localeCompare(b.name)
  );
  // 归一化日期格式
  unique.forEach(r => {
    if (r.date.includes('/')) {
      const [y, m, d] = r.date.split('/');
      r.date = y + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0');
    }
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    totalCount: unique.length, summary: summaryData, records: unique,
  }, null, 2));
  fs.writeFileSync(RAW_FILE, JSON.stringify(allResults, null, 2));
  log('💾 保存 ' + unique.length + ' 条 (本次 +' + records.length + ' 新)');

  // 7. 更新 auth_state（保持 cookie 新鲜）
  await context.storageState({ path: AUTH_FILE });
  log('💾 auth_state.json 已更新');

  await browser.close();
  log('🎉 完成！');
})().catch(err => { console.error('❌', err.message); process.exit(1); });
