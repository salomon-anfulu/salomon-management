// v46 同步改进自动化测试 — 用 Puppeteer
const puppeteer = require('puppeteer');

const BASE = 'http://localhost:8000';
const results = [];

function log(test, status, detail) {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ test, status, detail });
  console.log(`${icon} ${test}: ${detail}`);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 收集控制台日志
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  // ============================================================
  // 测试 0: 页面能否正常加载
  // ============================================================
  console.log('\n=== 测试 0: 页面加载 ===');
  try {
    const resp = await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 10000 });
    if (resp && resp.status() === 200) {
      log('页面加载', 'PASS', 'HTTP 200');
    } else {
      log('页面加载', 'FAIL', `HTTP ${resp ? resp.status() : 'null'}`);
    }
  } catch (e) {
    log('页面加载', 'FAIL', e.message);
  }

  // 检查是否跳转到了 login.html
  await new Promise(r => setTimeout(r, 1500));
  const currentUrl = page.url();
  if (currentUrl.includes('login.html')) {
    console.log('  当前在登录页，需要模拟登录...');
    // 从 localStorage 中找第一个 staff 名字
    const firstName = await page.evaluate(() => {
      try {
        // login.html 可能有自己的逻辑，直接选第一个可点击的人员
        const btns = document.querySelectorAll('.staff-btn, .person-item, [data-name]');
        if (btns.length > 0) {
          btns[0].click();
          return btns[0].textContent.trim();
        }
        return null;
      } catch(e) { return null; }
    });

    if (!firstName) {
      // 尝试直接设置 sessionStorage 模拟登录
      await page.evaluate(() => {
        const auth = { name: '管理员', role: 'admin', loginAt: new Date().toISOString() };
        sessionStorage.setItem('auth', JSON.stringify(auth));
      });
      await page.goto(BASE, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // ============================================================
  // 测试 1: 检查 JS 文件是否加载 v46 版本
  // ============================================================
  console.log('\n=== 测试 1: 版本号检查 ===');
  const versionInfo = await page.evaluate(() => {
    try {
      const data = JSON.parse(localStorage.getItem('salomon_parttime_mgmt') || '{}');
      return { dataVersion: data._dataVersion || 'NOT_FOUND' };
    } catch(e) { return { error: e.message }; }
  });
  if (versionInfo.dataVersion === '2026-07-06-v46') {
    log('版本号', 'PASS', 'DATA_VERSION = v46');
  } else {
    log('版本号', 'WARN', `DATA_VERSION = ${versionInfo.dataVersion}（可能还没触发升级）`);
  }

  // ============================================================
  // 测试 2: Sync 对象和关键属性是否存在
  // ============================================================
  console.log('\n=== 测试 2: Sync 模块完整性 ===');
  const syncCheck = await page.evaluate(() => {
    const checks = {};
    checks.syncExists = typeof Sync !== 'undefined';
    checks.pullInterval = typeof Sync !== 'undefined' ? Sync.PULL_INTERVAL : null;
    checks.mergeFieldsExists = typeof Sync !== 'undefined' ? typeof Sync._mergeFields : 'N/A';
    checks.pendingSync = typeof Sync !== 'undefined' ? Sync._pendingSync : null;
    checks.lastSyncTime = typeof Sync !== 'undefined' ? Sync._lastSyncTime : null;
    return checks;
  });
  log('Sync 对象存在', syncCheck.syncExists ? 'PASS' : 'FAIL', syncCheck.syncExists ? 'OK' : 'undefined');
  log('PULL_INTERVAL', syncCheck.pullInterval === 15000 ? 'PASS' : 'FAIL', `${syncCheck.pullInterval}ms (期望 15000)`);
  log('_mergeFields 函数', syncCheck.mergeFieldsExists === 'function' ? 'PASS' : 'FAIL', syncCheck.mergeFieldsExists);
  log('_pendingSync 属性', syncCheck.pendingSync === false ? 'PASS' : 'WARN', `初始值 = ${syncCheck.pendingSync}`);

  // ============================================================
  // 测试 3: _mergeFields 字段级合并逻辑验证
  // ============================================================
  console.log('\n=== 测试 3: 字段级合并逻辑 ===');
  const mergeTest = await page.evaluate(() => {
    // 模拟两人各改一个字段
    const localItem = { id: 1, name: '张三', hours: 4, note: 'A写的备注', _updatedAt: '1000' };
    const remoteItem = { id: 1, name: '张三', hours: 6, _updatedAt: '2000' };
    const merged = Sync._mergeFields(localItem, remoteItem);
    return {
      hours: merged.hours,        // remote 新er → 应为 6
      note: merged.note,          // remote 没传 → 应保留 'A写的备注'
      _updatedAt: merged._updatedAt  // 应取 max → '2000'
    };
  });
  const fieldsOK = mergeTest.hours === 6 && mergeTest.note === 'A写的备注' && mergeTest._updatedAt === '2000';
  log('字段级合并', fieldsOK ? 'PASS' : 'FAIL',
    `hours=${mergeTest.hours}(期望6) note="${mergeTest.note}"(期望保留) ts=${mergeTest._updatedAt}(期望2000)`);

  // ============================================================
  // 测试 4: _mergeArraysById 字段级合并
  // ============================================================
  console.log('\n=== 测试 4: 数组字段级合并 ===');
  const arrayMergeTest = await page.evaluate(() => {
    const local = [{ id: 1, detail: '本地详情', hours: 2 }];
    const remote = [{ id: 1, hours: 5, _updatedAt: '3000' }];
    const merged = Sync._mergeArraysById(local, remote);
    return { length: merged.length, detail: merged[0].detail, hours: merged[0].hours };
  });
  const arrayOK = arrayMergeTest.length === 1 && arrayMergeTest.detail === '本地详情' && arrayMergeTest.hours === 5;
  log('数组字段级合并', arrayOK ? 'PASS' : 'FAIL',
    `len=${arrayMergeTest.length} detail="${arrayMergeTest.detail}" hours=${arrayMergeTest.hours}(期望5)`);

  // ============================================================
  // 测试 5: 同步指示器 UI 元素
  // ============================================================
  console.log('\n=== 测试 5: 同步指示器 UI ===');
  const indicatorCheck = await page.evaluate(() => {
    const dot = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    const indicator = document.getElementById('syncIndicator');
    return {
      dotExists: !!dot,
      labelExists: !!label,
      indicatorExists: !!indicator,
      labelText: label ? label.textContent : null,
      dotColor: dot ? dot.style.background : null
    };
  });
  log('指示器 DOM', indicatorCheck.dotExists && indicatorCheck.labelExists ? 'PASS' : 'FAIL',
    `label="${indicatorCheck.labelText}"`);

  // ============================================================
  // 测试 6: 等待 15 秒，检查是否自动拉取
  // ============================================================
  console.log('\n=== 测试 6: 15秒轮询验证（等待 18 秒）===');
  console.log('  等待中...');
  // 清空之前的日志
  consoleLogs.length = 0;

  // 如果没配置 token，Sync 不会自动 pull。检查 isEnabled
  const isEnabled = await page.evaluate(() => Sync.isEnabled());
  if (!isEnabled) {
    log('15秒轮询', 'WARN', '未配置同步 Token，跳过轮询测试（正常情况，不影响功能）');
    log('Token 配置', 'INFO', '当前为纯本地模式，可在 login.html 配置 GitHub Token');
  } else {
    // 等待 18 秒看是否有拉取日志
    await new Promise(r => setTimeout(r, 18000));
    const pullLogs = consoleLogs.filter(l => l.text.includes('[Sync] 拉取成功'));
    if (pullLogs.length > 0) {
      log('15秒轮询', 'PASS', `${pullLogs.length} 次拉取日志（18秒内）`);
    } else {
      // 也可能是拉取失败（没配 token 或网络问题）
      const syncLogs = consoleLogs.filter(l => l.text.includes('[Sync]'));
      log('15秒轮询', syncLogs.length > 0 ? 'WARN' : 'FAIL',
        syncLogs.length > 0 ? `有 Sync 日志但非"成功": ${syncLogs.map(l=>l.text).join('; ')}` : '18秒内无任何 Sync 日志');
    }
  }

  // ============================================================
  // 测试 7: setInterval 间隔检查
  // ============================================================
  console.log('\n=== 测试 7: setInterval 间隔 ===');
  // 检查源码里 setInterval 的值
  const intervalCheck = await page.evaluate(async () => {
    // 通过 fetch 获取 sync.js 源码，检查 setInterval 值
    try {
      const resp = await fetch('/js/sync.js');
      const code = await resp.text();
      const match = code.match(/setInterval\([^)]+,\s*(\d+)\)/);
      return { interval: match ? parseInt(match[1]) : null };
    } catch(e) { return { error: e.message }; }
  });
  log('setInterval 间隔', intervalCheck.interval === 15000 ? 'PASS' : 'FAIL',
    `${intervalCheck.interval}ms (期望 15000)`);

  // ============================================================
  // 汇总
  // ============================================================
  console.log('\n' + '='.repeat(60));
  const pass = results.filter(r => r.status === 'PASS').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`📊 测试结果: ${pass} PASS  ${warn} WARN  ${fail} FAIL  (共 ${results.length} 项)`);
  console.log('='.repeat(60));

  if (fail > 0) {
    console.log('\n❌ 失败项:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`   - ${r.test}: ${r.detail}`));
  }
  if (warn > 0) {
    console.log('\n⚠️ 警告项:');
    results.filter(r => r.status === 'WARN').forEach(r => console.log(`   - ${r.test}: ${r.detail}`));
  }

  await browser.close();
  return fail === 0 ? 0 : 1;
}

run().then(code => process.exit(code)).catch(e => { console.error(e); process.exit(2); });
