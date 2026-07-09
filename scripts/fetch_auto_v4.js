/**
 * 灵工打卡自动抓取 v4（headless + evaluate 注入修改 pageSize）
 *
 * 原理：在页面 JS 上下文里修改 Vue/React 组件的分页大小变量，
 *       让前端自己发带正确签名的请求。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');
const RAW_FILE = path.join(__dirname, '..', 'data', 'full_attendance_raw.json');

function log(msg) { console.log(`[${new Date().toLocaleTimeString()}] ${msg}`); }

(async () => {
  log('🚀 灵工打卡自动抓取 v4（headless + evaluate）');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);

  const page = await context.newPage();

  // 收集所有响应
  const allResults = [];
  let summaryData = null;

  page.on('response', async response => {
    const url = response.url();
    try {
      if (url.includes('pageByParam') && response.status() === 200) {
        const body = await response.text();
        const parsed = JSON.parse(body);
        if (parsed.success && parsed.data && parsed.data.results) {
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

  // 尝试在页面 JS 上下文里找到分页组件并修改 pageSize
  log('🔧 尝试通过 JS 修改分页...');
  const modified = await page.evaluate(() => {
    // 查找 Vue 实例
    const results = [];

    // 方法1：通过 __vue__ 找到 Vue 组件
    const app = document.querySelector('#app');
    if (app && app.__vue_app__) {
      results.push('Found Vue3 app');
    }

    // 方法2：查找所有带 __vue__ 的元素
    const vueEls = document.querySelectorAll('[class*="pagination"], .ant-pagination');
    vueEls.forEach(el => {
      if (el.__vue__) {
        results.push('Vue component: ' + el.className);
        // 尝试修改 pageSize
        if (el.__vue__.pageSize !== undefined) {
          el.__vue__.pageSize = 200;
          results.push('  → pageSize changed to 200');
        }
        if (el.__vue_.$data && el.__vue_.$data.pageSize !== undefined) {
          el.__vue_.$data.pageSize = 200;
        }
      }
    });

    // 方法3：检查全局 store
    if (window.__INITIAL_STATE__) results.push('Has initial state');
    if (window.store) {
      results.push('Has global store');
      // 尝试找分页相关
    }

    // 方法4：尝试通过 XHR prototype 修改（捕获并放大 pageSize）
    const origSend = XMLHttpRequest.prototype.send;
    const origOpen = XMLHttpRequest.prototype.open;
    // 不修改，只报告
    results.push('Total pagination elements: ' + document.querySelectorAll('.ant-pagination').length);
    results.push('Total table elements: ' + document.querySelectorAll('table').length);

    // 打印所有 Vue 组件的 data
    const allEls = document.querySelectorAll('*');
    let vueCount = 0;
    for (const el of allEls) {
      if (el.__vue__ && vueCount < 5) {
        vueCount++;
        const d = el.__vue_.$data || el.__vue_.$options?.data?.() || {};
        if (d.pageSize || d.pageNum || d.size) {
          results.push('Vue data with pagination: ' + JSON.stringify({pageSize: d.pageSize, pageNum: d.pageNum, size: d.size}));
        }
      }
    }

    return results;
  });
  log('   页面探测: ' + modified.join(' | '));

  // 点击"过去一个月"
  log('🖱️ 点击"过去一个月"...');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(6000);
    log('   已收集 ' + allResults.length + ' 条');
  }

  // 翻页
  let page_num = 2;
  let maxAttempts = 50;
  let lastCount = allResults.length;
  let stuck = 0;

  while (maxAttempts-- > 0 && stuck < 3) {
    // 找下一页按钮
    const next = await page.$('.ant-pagination-next:not(.ant-pagination-disabled)');
    if (!next) {
      log('📄 无下一页按钮');
      break;
    }

    const disabled = await next.evaluate(el =>
      el.classList.contains('ant-pagination-disabled') || el.getAttribute('aria-disabled') === 'true'
    ).catch(() => true);

    if (disabled) {
      log('📄 下一页已禁用');
      break;
    }

    await next.click();
    await page.waitForTimeout(2500);

    if (allResults.length === lastCount) {
      stuck++;
      log('⚠️ 无增长 (' + stuck + '/3)');
    } else {
      stuck = 0;
      lastCount = allResults.length;
      log('📄 第' + page_num + '页 → ' + allResults.length + ' 条');
      page_num++;
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

  log('✅ 去重后 ' + records.length + ' 条');

  if (records.length > 0) {
    const dates = [...new Set(records.map(r => r.date))].sort();
    log('📅 ' + dates.length + ' 天:');
    dates.forEach(d => log('  ' + d + ': ' + records.filter(r => r.date === d).length + '人'));

    // 合并
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
      totalCount: unique.length,
      summary: summaryData,
      records: unique,
    }, null, 2));
    fs.writeFileSync(RAW_FILE, JSON.stringify(allResults, null, 2));
    log('💾 保存 ' + unique.length + ' 条 (+' + records.length + ' 新)');
  }

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  log('🎉 完成！');
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
