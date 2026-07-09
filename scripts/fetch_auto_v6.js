/**
 * 灵工打卡自动抓取 v6（headless + Element UI 分页器翻页）
 *
 * 关键发现：灵工管家用的是 Element UI（不是 Ant Design）！
 * 分页器是 .el-pager，页码是 .el-pager .number，下一页是 .btn-next
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取 v6（Element UI 分页）');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);
  log('✅ Cookies: ' + authState.cookies.length);

  const page = await context.newPage();

  const allResults = [];
  let summaryData = null;

  // 被动收集
  page.on('response', async response => {
    const url = response.url();
    try {
      if (url.includes('pageByParam') && response.status() === 200) {
        const parsed = JSON.parse(await response.text());
        if (parsed.success && parsed.data?.results) {
          allResults.push(...parsed.data.results);
          log('📊 第' + parsed.data.pageNum + '页: +' + parsed.data.results.length + ' (累计 ' + allResults.length + ')');
        }
      }
      if (url.includes('summaryByTime') && response.status() === 200 && !summaryData) {
        summaryData = JSON.parse(await response.text()).data;
      }
    } catch (e) {}
  });

  const ATTENDANCE_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
  log('📡 访问考勤页面...');
  await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  if (page.url().includes('login')) {
    log('❌ Cookie 失效');
    process.exit(1);
  }
  log('✅ 免登录成功');
  await page.waitForTimeout(5000);

  // 点击"过去一个月"
  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(6000);
    log('   已收集 ' + allResults.length + ' 条');
  }

  // 查看总页数
  const pageNumbers = await page.$$eval('.el-pager .number', els =>
    els.map(e => parseInt(e.textContent.trim())).filter(n => !isNaN(n))
  ).catch(() => []);
  log('📄 可用页码: ' + JSON.stringify(pageNumbers));

  const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1;
  log('📄 最大页码: ' + maxPage);

  // 用 Element UI 下一页按钮翻页
  let stuck = 0;
  let pageNum = 2;

  for (let i = 0; i < maxPage && stuck < 3; i++) {
    const before = allResults.length;

    // Element UI 的下一页按钮
    const nextBtn = await page.$('.el-pagination .btn-next:not(.disabled)').catch(() => null);
    if (!nextBtn) {
      log('⚠️ 无下一页按钮');
      // 尝试直接点击页码
      const numBtn = await page.$('.el-pager .number.number' + pageNum).catch(() => null);
      if (numBtn) {
        await numBtn.click();
        await page.waitForTimeout(3000);
        if (allResults.length > before) {
          log('📄 点击页码 ' + pageNum + ' → ' + allResults.length);
          pageNum++;
          stuck = 0;
          continue;
        }
      }
      stuck++;
      continue;
    }

    const isDisabled = await nextBtn.evaluate(el =>
      el.classList.contains('disabled') || el.getAttribute('disabled') !== null
    ).catch(() => true);

    if (isDisabled) {
      log('📄 下一页已禁用');
      break;
    }

    await nextBtn.click();
    await page.waitForTimeout(3000);

    if (allResults.length === before) {
      stuck++;
      log('⚠️ 无增长 (' + stuck + '/3)');
    } else {
      stuck = 0;
      log('📄 第' + pageNum + '页 → ' + allResults.length + ' 条');
      pageNum++;
    }
  }

  log('\n📊 总计 ' + allResults.length + ' 条');

  // 去重 + 解析
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

  if (records.length > 0) {
    const dates = [...new Set(records.map(r => r.date))].sort();
    log('📅 ' + dates.length + ' 天:');
    dates.forEach(d => log('  ' + d + ': ' + records.filter(r => r.date === d).length + '人'));

    let existing = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).records || [];
    }
    const map = new Map();
    [...existing, ...records].forEach(r => {
      map.set(r.name + '_' + r.date + '_' + r.scheduleTime, r);
    });
    const unique = Array.from(map.values()).sort((a, b) =>
      a.date.replace(/\//g, '-').localeCompare(b.date.replace(/\//g, '-')) || a.name.localeCompare(b.name)
    );
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
    log('💾 保存 ' + unique.length + ' 条 (+' + records.length + ' 新)');
  }

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  log('🎉 完成！');
})().catch(err => { console.error('❌', err.message); process.exit(1); });
