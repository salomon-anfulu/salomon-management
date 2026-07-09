/**
 * 灵工打卡自动抓取 v3（headless + 被动收集 + 翻页）
 * 
 * 原理：不修改任何请求（避免签名校验失败），完全被动收集页面原生请求的响应。
 *       pageSize=10 每页只 10 条，通过自动翻页收集全部 292 条。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取 v3（headless + 翻页）');

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

  // 被动收集所有响应
  const allPageResults = [];
  let summaryData = null;
  let totalRecords = 0;

  page.on('response', async response => {
    const url = response.url();
    try {
      if (url.includes('pageByParam') && response.status() === 200) {
        const body = await response.text();
        const parsed = JSON.parse(body);
        if (parsed.success && parsed.data && parsed.data.results) {
          allPageResults.push(...parsed.data.results);
          totalRecords = parsed.data.total || totalRecords;
          log('📊 第' + parsed.data.pageNum + '页: +' + parsed.data.results.length + ' (累计 ' + allPageResults.length + '/' + totalRecords + ')');
        }
      }
      if (url.includes('summaryByTime') && response.status() === 200 && !summaryData) {
        const body = await response.text();
        summaryData = JSON.parse(body).data;
        if (summaryData.arrangedNumber > 10) {
          log('📈 summary: 排班' + summaryData.arrangedNumber + ' 出勤' + summaryData.attendanceTimeNumber + ' → 需要 ' + Math.ceil(summaryData.arrangedNumber / 10) + ' 页');
        }
      }
    } catch (e) {}
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

  log('⏳ 等待初始加载...');
  await page.waitForTimeout(8000);

  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    log('   ✅ 已点击');
    await page.waitForTimeout(6000);
  } else {
    log('   ⚠️ 未找到"过去一个月"');
  }

  log('   已收集 ' + allPageResults.length + '/' + totalRecords + ' 条');

  // 自动翻页
  let pageCount = 1;
  let maxPages = 50;
  let stuckCount = 0;
  while (allPageResults.length < totalRecords && maxPages-- > 0 && stuckCount < 3) {
    const before = allPageResults.length;
    
    // 尝试多种翻页选择器
    let clicked = false;
    const selectors = [
      '.ant-pagination-next:not(.ant-pagination-disabled)',
      'li.ant-pagination-next[aria-disabled="false"]',
      'button:has-text("下一页")',
      '.pagination-next:not(.disabled)',
    ];
    for (const sel of selectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          const isDisabled = await btn.evaluate(el =>
            el.classList.contains('ant-pagination-disabled') ||
            el.getAttribute('aria-disabled') === 'true' ||
            el.disabled
          );
          if (!isDisabled) {
            await btn.click();
            clicked = true;
            break;
          }
        }
      } catch (e) {}
    }

    if (!clicked) {
      // 尝试键盘翻页
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      if (allPageResults.length === before) {
        stuckCount++;
        log('⚠️ 翻页可能无效，尝试键盘');
        continue;
      }
    }

    await page.waitForTimeout(3000);
    pageCount++;

    if (allPageResults.length === before) {
      stuckCount++;
      log('⚠️ 数据没增长 (' + stuckCount + '/3)');
    } else {
      stuckCount = 0;
      log('📄 第' + pageCount + '页 → ' + allPageResults.length + '/' + totalRecords);
    }
  }

  log('\n📊 总计收集 ' + allPageResults.length + '/' + totalRecords + ' 条');

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
      const cnt = allRecords.filter(r => r.date === d).length;
      log('  ' + d + ': ' + cnt + '人');
    });

    // 合并已有
    let existing = [];
    if (fs.existsSync(OUTPUT_FILE)) {
      existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')).records || [];
      log('\n📦 已有 ' + existing.length + ' 条，合并...');
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
    log('💾 已保存 ' + unique.length + ' 条 (本次 +' + allRecords.length + ')');

    fs.writeFileSync(RAW_FILE, JSON.stringify(allPageResults, null, 2));
  } else {
    log('⚠️ 没有新数据');
  }

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  log('🎉 完成！');
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
