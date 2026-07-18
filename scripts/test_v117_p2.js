/**
 * v117 P2 低危修复验证测试
 *   P2-1: _scoringMonth dead code 注释
 *   P2-2: 脚本 defer 决策注释
 *   P2-3: localStorage 隐私模式全局防护（_safeGetItem/_safeSetItem/_safeRemoveItem）
 *   P2-4: 备份数据完整性校验
 *   P2-5: 全局变量分布文档
 *   附带: defaults._dataVersion 与 DATA_VERSION 一致性校验
 */
const fs = require('fs');
const vm = require('vm');

const APP_JS = fs.readFileSync('js/app.js', 'utf8');
const PAGES_JS = fs.readFileSync('js/pages.js', 'utf8');
const SYNC_JS = fs.readFileSync('js/sync.js', 'utf8');
const INDEX_HTML = fs.readFileSync('index.html', 'utf8');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' → ' + detail : '')); }
}

// ========== 静态代码检查 ==========
console.log('\n=== P2 静态代码检查 ===');

// P2-1
check('P2-1 _scoringMonth 初始化有 typeof 守卫 + 防御性注释',
  APP_JS.includes("typeof MonthConfig !== 'undefined'") && APP_JS.includes('防御性兜底'));

// P2-2
check('P2-2 index.html 有 defer 决策注释', INDEX_HTML.includes('故意不加 defer') && INDEX_HTML.includes('内联 <script> 定义了 Auth'));

// P2-3
check('P2-3 新增 _checkLS 方法', APP_JS.includes('_checkLS()'));
check('P2-3 新增 _safeGetItem 方法', APP_JS.includes('_safeGetItem(key)'));
check('P2-3 新增 _safeSetItem 方法', APP_JS.includes('_safeSetItem(key, value)'));
check('P2-3 新增 _safeRemoveItem 方法', APP_JS.includes('_safeRemoveItem(key)'));
check('P2-3 reset() 使用 _safeSetItem', APP_JS.includes('this._safeSetItem(this.KEY, JSON.stringify(this.defaults))'));
check('P2-3 importData 使用 _safeSetItem', /importData[\s\S]*?this\._safeSetItem/.test(APP_JS));
check('P2-3 createSafetyBackup 使用 _safeGetItem', /createSafetyBackup[\s\S]*?this\._safeGetItem/.test(APP_JS));
check('P2-3 restoreSafetyBackup 使用 _safeGetItem/_safeRemoveItem', /restoreSafetyBackup[\s\S]*?this\._safeGetItem[\s\S]*?this\._safeRemoveItem/.test(APP_JS));
check('P2-3 Store.set 使用 _safeSetItem', /set\(key, value\)[\s\S]*?this\._safeSetItem/.test(APP_JS));

// P2-4
check('P2-4 restoreSafetyBackup 含 JSON.parse 校验', /restoreSafetyBackup[\s\S]*?JSON\.parse\(backup\)[\s\S]*?catch \(parseErr\)/.test(APP_JS));
check('P2-4 restoreSafetyBackup 校验 staff 数组', APP_JS.includes('Array.isArray(parsed.staff)'));
check('P2-4 损坏备份被丢弃', APP_JS.includes('丢弃损坏备份'));

// P2-5
check('P2-5 有全局变量分布说明', APP_JS.includes('P2-5 全局月份变量分布说明') || APP_JS.includes('全局月份变量分布'));

// 附带：版本一致性
const dvMatch = APP_JS.match(/const DATA_VERSION = '([^']+)'/);
const defMatch = APP_JS.match(/_dataVersion: '([^']+)'/);
const htmlMatch = INDEX_HTML.match(/js\/app\.js\?v=(\d+)/);
check('DATA_VERSION = v117', dvMatch && dvMatch[1].endsWith('v117'), dvMatch && dvMatch[1]);
check('defaults._dataVersion = v117', defMatch && defMatch[1].endsWith('v117'), defMatch && defMatch[1]);
check('cache-buster = v117', htmlMatch && htmlMatch[1] === '117', htmlMatch && htmlMatch[1]);
check('DATA_VERSION 与 defaults._dataVersion 一致', dvMatch && defMatch && dvMatch[1] === defMatch[1]);


// ========== 功能测试：localStorage 隐私模式降级 ==========
console.log('\n=== P2-3 功能测试：localStorage 隐私模式降级 ===');

function makeSandbox(lsEnabled) {
  const sandbox = {
    console,
    sessionStorage: { getItem: () => null },
  };
  sandbox.window = sandbox;
  sandbox.document = {
    getElementById: () => ({ innerHTML: '', addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, children: { length: 1 }, appendChild: () => {}, querySelector: () => null, querySelectorAll: () => [], scrollTop: 0 }),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ className: '', innerHTML: '', appendChild: () => {}, style: {}, addEventListener: () => {}, setAttribute: () => {} }),
    body: { appendChild: () => {}, style: {} },
    addEventListener: () => {},
  };
  sandbox.addEventListener = () => {};
  sandbox.location = { hash: '', reload: () => {} };
  sandbox.setTimeout = () => {};
  sandbox.requestAnimationFrame = () => {};
  sandbox.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  sandbox.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  sandbox.Chart = undefined;

  if (lsEnabled) {
    const store = {};
    sandbox.localStorage = {
      getItem(k) { return k in store ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
    };
  } else {
    // 模拟隐私模式：localStorage 存在但 setItem 抛异常
    sandbox.localStorage = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Privacy mode'); },
      removeItem: () => { throw new DOMException('Privacy mode'); },
    };
  }
  vm.createContext(sandbox);
  return sandbox;
}

// 场景1: localStorage 正常
const sb1 = makeSandbox(true);
try { vm.runInContext(APP_JS, sb1); } catch (e) { console.error('[正常模式 app.js]', e.message); }
// 注：const Store 在 VM 内不绑定到 sandbox 全局属性，必须用 runInContext 访问
check('正常模式 Store 初始化成功', vm.runInContext('typeof Store === "object"', sb1) === true);
check('正常模式 _checkLS 返回 true', vm.runInContext('Store._checkLS()', sb1) === true);
check('正常模式 Store.set 不报错', vm.runInContext('try { Store.set("staff", []); true; } catch(e) { false; }', sb1) === true);
check('正常模式 reset 不报错', vm.runInContext('try { Store.reset(); true; } catch(e) { false; }', sb1) === true);

// 场景2: 隐私模式（localStorage.setItem 抛异常）
const sb2 = makeSandbox(false);
let loadOk = true;
try { vm.runInContext(APP_JS, sb2); } catch (e) { loadOk = false; console.error('[隐私模式 app.js]', e.message); }
check('隐私模式 Store 初始化不崩溃', loadOk && vm.runInContext('typeof Store === "object"', sb2) === true);
check('隐私模式 _checkLS 返回 false', vm.runInContext('Store._checkLS()', sb2) === false);
check('隐私模式 Store.set 不崩溃', vm.runInContext('try { Store.set("staff", [{id:1,name:"test"}]); true; } catch(e) { false; }', sb2) === true);
check('隐私模式 Store.set 后内存 cache 有值', vm.runInContext('Store._cache && Array.isArray(Store._cache.staff) && Store._cache.staff.length === 1', sb2) === true);
check('隐私模式 Store.get 能读到内存值', vm.runInContext('try { const s = Store.get("staff"); Array.isArray(s) && s.length === 1; } catch(e) { false; }', sb2) === true);
check('隐私模式 reset 不崩溃', vm.runInContext('try { Store.reset(); true; } catch(e) { false; }', sb2) === true);
check('隐私模式 importData 不崩溃', vm.runInContext('try { const r = Store.importData(JSON.stringify({staff:[{id:1,name:"x"}]})); r.success === true; } catch(e) { false; }', sb2) === true);

// 场景3: 损坏备份恢复
const sb3 = makeSandbox(true);
try { vm.runInContext(APP_JS, sb3); } catch (e) {}
vm.runInContext('localStorage.setItem(Store.KEY + "_safety_backup", "{这不是合法JSON");', sb3);
const restoreResult = vm.runInContext('Store.restoreSafetyBackup()', sb3);
check('P2-4 损坏备份返回 false', restoreResult === false);
check('P2-4 损坏备份被清除', vm.runInContext('localStorage.getItem(Store.KEY + "_safety_backup") === null', sb3) === true);

// 场景4: 结构无效备份（合法 JSON 但缺 staff）
const sb4 = makeSandbox(true);
try { vm.runInContext(APP_JS, sb4); } catch (e) {}
vm.runInContext('localStorage.setItem(Store.KEY + "_safety_backup", JSON.stringify({ foo: "bar" }));', sb4);
const restoreResult2 = vm.runInContext('Store.restoreSafetyBackup()', sb4);
check('P2-4 结构无效备份返回 false', restoreResult2 === false);

// 场景5: 合法备份恢复成功
const sb5 = makeSandbox(true);
try { vm.runInContext(APP_JS, sb5); } catch (e) {}
vm.runInContext('localStorage.setItem(Store.KEY + "_safety_backup", JSON.stringify({ staff: [{id:1,name:"合法"}] }));', sb5);
const restoreResult3 = vm.runInContext('Store.restoreSafetyBackup()', sb5);
check('P2-4 合法备份恢复成功', restoreResult3 === true);


// ========== 全量页面渲染回归 ==========
console.log('\n=== 全量页面渲染回归测试 ===');
const sb6 = makeSandbox(true);
try { vm.runInContext(APP_JS, sb6); } catch (e) { console.error('[app.js]', e.message); }
try { vm.runInContext(SYNC_JS, sb6); } catch (e) { /* setInterval 未定义，忽略 */ }
try { vm.runInContext(PAGES_JS, sb6); } catch (e) { console.error('[pages.js]', e.message); }
vm.runInContext('globalThis.Auth = { isAdmin: true, staffId: null, staffName: null, role: "admin" };', sb6);
vm.runInContext('_scoringMonth = "2026-07";', sb6);
vm.runInContext(`Store.set('staff', [
  { id: 1, name: '张三', dept: 'sales', status: 'part_time', avatar_color: '#f00' },
  { id: 2, name: '李四', dept: 'guide', status: 'part_time', avatar_color: '#0f0' },
]);`, sb6);

const renderFns = ['renderDashboard','renderStaff','renderSchedule','renderDoorSchedule','renderAttendance','renderRatings','renderPerformance','renderSupport','renderCustomerReviews','renderHandbook','renderMyForms','renderDataManagement'];
for (const fn of renderFns) {
  try {
    const html = vm.runInContext(fn + '();', sb6);
    const issues = [];
    if (typeof html !== 'string') issues.push('非字符串');
    else {
      if (/\bundefined\b/.test(html) && !/data-undefined/.test(html)) issues.push('undefined');
      if (/\bNaN\b/.test(html)) issues.push('NaN');
      if (html.includes('[object Object]')) issues.push('[object Object]');
    }
    check(fn + ' 渲染正常', issues.length === 0, issues.join(','));
  } catch (e) {
    check(fn + ' 渲染正常', false, e.message);
  }
}

console.log('\n=========================');
console.log(`总计: ${pass} 通过 / ${fail} 失败`);
console.log('=========================');
process.exit(fail > 0 ? 1 : 0);
