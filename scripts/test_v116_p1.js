/**
 * v116 P1 修复验证测试
 * 采用 v115 测试的 sandbox 模式（sandbox.window = sandbox，让 const 绑定到全局）
 */
const fs = require('fs');
const vm = require('vm');

const APP_JS = fs.readFileSync('js/app.js', 'utf8');
const PAGES_JS = fs.readFileSync('js/pages.js', 'utf8');
const SYNC_JS = fs.readFileSync('js/sync.js', 'utf8');

const sandbox = {
  console,
  sessionStorage: { getItem: () => null },
};
sandbox.window = sandbox;  // 关键：让 const/let 绑定到 sandbox 自身
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
sandbox.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
sandbox.setTimeout = () => {};
sandbox.requestAnimationFrame = () => {};
sandbox.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
sandbox.atob = (s) => Buffer.from(s, 'base64').toString('binary');
sandbox.Chart = undefined;

vm.createContext(sandbox);
try { vm.runInContext(APP_JS, sandbox); } catch (e) { console.error('[app.js load]', e.message); }

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? ' → ' + detail : '')); }
}

// ========== P1-1: getStaff 类型归一 ==========
console.log('\n=== P1-1: getStaff 类型归一 ===');
// 注入测试 staff
vm.runInContext(`Store.set('staff', [
  { id: 1, name: '张三', dept: 'sales' },
  { id: 2, name: '李四', dept: 'guide' },
]);`, sandbox);

check('getStaff(Number 1) 正常', vm.runInContext('Store.getStaff(1) && Store.getStaff(1).name', sandbox) === '张三');
check('getStaff(String "1") 匹配 Number id', vm.runInContext('Store.getStaff("1") && Store.getStaff("1").name', sandbox) === '张三');
check('getStaff(String "2") 匹配', vm.runInContext('Store.getStaff("2") && Store.getStaff("2").name', sandbox) === '李四');
check('getStaff(999) 返回 null', vm.runInContext('Store.getStaff(999)', sandbox) === null);

// ========== P1-2: staff 合并 id+name 双键 ==========
console.log('\n=== P1-2: staff 合并 id+name 双键 ===');
check('代码含 existingById 双键逻辑', APP_JS.includes('existingById'));
check('代码含 existingByName 兜底逻辑', APP_JS.includes('existingByName'));
check('新增成员(id不在defaults)被保留', vm.runInContext(`(function(){
  Store._cache = null;
  Store.defaults.staff = [{ id: 1, name: '默认员', dept: 'sales' }];
  localStorage.setItem(Store.KEY, JSON.stringify({
    _dataVersion: 'test',
    staff: [{ id: 999, name: '王五', dept: 'guide' }]
  }));
  Store._cache = null;
  const s = Store.get('staff');
  return s.some(x => x.name === '王五' && x.id === 999);
})()`, sandbox) === true);

// ========== P1-3: switchMonth TDZ 安全 ==========
console.log('\n=== P1-3: switchMonth TDZ 安全 ===');
check('switchAttMonth 有 typeof 守卫', APP_JS.includes("if (typeof _attMonth !== 'undefined') _attMonth = m"));
check('switchScheduleMonth 有 typeof 守卫', APP_JS.includes("if (typeof _scheduleMonth !== 'undefined') _scheduleMonth = m"));
check('ActionHandler.switchAttMonth 有 typeof 守卫', APP_JS.includes("if (typeof _attMonth !== 'undefined') _attMonth = p.month"));
check('ActionHandler.switchPerfMonth 有 typeof 守卫', APP_JS.includes("if (typeof perfMonth !== 'undefined') perfMonth = p.month"));

// ========== P1-4: get() defaults 深拷贝 ==========
console.log('\n=== P1-4: get() defaults 深拷贝 ===');
check('代码含 defaults 深拷贝逻辑', APP_JS.includes('JSON.parse(JSON.stringify(_def))'));
// 功能测试：get 不存在的 key 返回 defaults 深拷贝
const notPolluted = vm.runInContext(`(function(){
  Store.defaults._testKey = { nested: { v: 1 }, list: [1,2,3] };
  Store._cache = {};  // 强制走 defaults 回退
  const val = Store.get('_testKey');
  val.nested.v = 999;
  val.list.push(4);
  return Store.defaults._testKey.nested.v === 1 && Store.defaults._testKey.list.length === 3;
})()`, sandbox);
check('修改 get() 返回值不污染 defaults', notPolluted === true);

// ========== P1-5: performanceData/linggongAttendance 深拷贝 ==========
console.log('\n=== P1-5: performanceData/linggongAttendance 深拷贝 ===');
check('performanceData 合并深拷贝', APP_JS.includes('JSON.parse(JSON.stringify(this.defaults.performanceData[mk]))'));
check('linggongAttendance records 深拷贝', APP_JS.includes('JSON.parse(JSON.stringify(this.defaults.linggongAttendance.records'));

// ========== P1-6: Router hashchange ==========
console.log('\n=== P1-6: Router hashchange ===');
check('增加了 hashchange 事件监听', APP_JS.includes("addEventListener('hashchange'"));
check('navigate() 更新 location.hash', APP_JS.includes('location.hash = newHash'));
check('有 hash 解析函数 _parseHash', APP_JS.includes('_parseHash'));
check('首次加载从 hash 恢复页面', APP_JS.includes('Router.current = _initialPage'));

// ========== P1-7: 全局 error handler 放宽 ==========
console.log('\n=== P1-7: 全局 error handler 放宽 ===');
check('error handler 检测 _lastRenderOk', APP_JS.includes('_lastRenderOk') && APP_JS.includes('renderFailed'));
check('Router.render 设置 _lastRenderOk = true', APP_JS.includes('_lastRenderOk = true'));
check('Router.render catch 设置 _lastRenderOk = false', APP_JS.includes('_lastRenderOk = false'));
// 验证声明在 Router 之前
const routerIdx = APP_JS.indexOf('const Router = {');
const declIdx = APP_JS.indexOf('let _lastRenderOk = true');
check('_lastRenderOk 声明在 Router 之前(避免 TDZ)', declIdx > -1 && routerIdx > -1 && declIdx < routerIdx, `decl=${declIdx}, router=${routerIdx}`);

// ========== 全量页面渲染回归测试 ==========
console.log('\n=== 全量页面渲染回归测试 ===');
try { vm.runInContext(SYNC_JS, sandbox); } catch (e) { console.error('[sync.js load]', e.message); }
try { vm.runInContext(PAGES_JS, sandbox); } catch (e) { console.error('[pages.js load]', e.message); }
vm.runInContext('globalThis.Auth = { isAdmin: true, staffId: null, staffName: null, role: "admin" };', sandbox);
vm.runInContext('_scoringMonth = "2026-07";', sandbox);

// 注入最小测试数据
vm.runInContext(`Store.set('staff', [
  { id: 1, name: '张三', dept: 'sales', status: 'part_time', avatar_color: '#f00' },
  { id: 2, name: '李四', dept: 'guide', status: 'part_time', avatar_color: '#0f0' },
]);`, sandbox);

const renderFns = ['renderDashboard','renderStaff','renderSchedule','renderDoorSchedule','renderAttendance','renderRatings','renderPerformance','renderSupport','renderCustomerReviews','renderHandbook','renderMyForms','renderDataManagement'];
for (const fn of renderFns) {
  try {
    const html = vm.runInContext(fn + '();', sandbox);
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

// ========== 总结 ==========
console.log('\n=========================');
console.log(`总计: ${pass} 通过 / ${fail} 失败`);
console.log('=========================');
process.exit(fail > 0 ? 1 : 0);
