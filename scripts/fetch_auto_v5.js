/**
 * 灵工打卡自动抓取 v5（headless + 补全 total 字段触发翻页）
 *
 * 关键洞察：API 的 pageByParam 响应中 total 字段是 undefined/0（API bug），
 *           导致前端不渲染分页器。我们在 route 拦截中补上 total（用 summary 的数据），
 *           让前端正确渲染分页按钮，然后自动翻页。
 *
 * 策略：只修改 response body 的 total 字段（不改 request），签名校验不受影响。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取 v5（补全 total + 翻页）');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);

  const page = await context.newPage();

  const allResults = [];
  let summaryData = null;
  let expectedTotal = 0;

  // 关键：拦截 pageByParam 响应，补全 total 字段
  await page.route('**/pageByParam', async (route, request) => {
    const response = await route.fetch();
    const body = await response.text();

    try {
      const parsed = JSON.parse(body);
      if (parsed.success && parsed.data) {
        // 用 summary 的总数补全 total（触发前端分页器）
        if (expectedTotal > 0 && (!parsed.data.total || parsed.data.total === 0)) {
          parsed.data.total = expectedTotal;
          log('🔧 补全 total=' + expectedTotal + ' (第' + parsed.data.pageNum + '页)');
        }
        if (parsed.data.results) {
          allResults.push(...parsed.data.results);
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(parsed),
        });
        return;
      }
    } catch (e) {}

    await route.fulfill({ response });
  });

  // 被动收集 summary
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('summaryByTime') && response.status() === 200 && !summaryData) {
      try {
        summaryData = JSON.parse(await response.text()).data;
        if (summaryData.arrangedNumber) {
          expectedTotal = summaryData.arrangedNumber;
          log('📈 summary: 排班 ' + expectedTotal + ' 人次 → 需翻 ' + Math.ceil(expectedTotal / 10) + ' 页');
        }
      } catch (e) {}
    }
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
  log('   收集 ' + allResults.length + ' 条');

  // 点击"过去一个月"
  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(6000);
    log('   收集 ' + allResults.length + ' 条, expectedTotal=' + expectedTotal);
  }

  // 现在前端应该有分页器了（因为 total 被补全了），翻页
  let pageNum = 2;
  let stuck = 0;
  let maxPages = 60;

  while (maxPages-- > 0 && stuck < 3 && allResults.length < expectedTotal) {
    const before = allResults.length;

    const next = await page.$('.ant-pagination-next:not(.ant-pagination-disabled)').catch(() => null);
    if (!next) {
      // 尝试其他选择器
      const altNext = await page.$('li[title="下一页"]:not(.ant-pagination-disabled)').catch(() => null);
      if (!altNext) {
        log('📄 无下一页');
        break;
      }
      await altNext.click();
    } else {
      await next.click();
    }

    await page.waitForTimeout(2500);

    if (allResults.length === before) {
      stuck++;
    } else {
      stuck = 0;
      log('📄 第' + pageNum + '页 → ' + allResults.length + '/' + expectedTotal);
      pageNum++;
    }
  }

  log('\n📊 总计 ' + allResults.length + ' 条');

  // 去重
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
