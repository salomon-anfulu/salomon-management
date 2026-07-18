#!/usr/bin/env node
/**
 * v115 P0 安全修复验证测试
 */
const fs = require('fs');
const vm = require('vm');

const appCode = fs.readFileSync('js/app.js', 'utf8');
const pagesCode = fs.readFileSync('js/pages.js', 'utf8');

const sandbox = { console, sessionStorage: { getItem: () => null } };
sandbox.window = sandbox;
sandbox.document = {
  getElementById: () => ({ innerHTML: '', addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {} } }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
  addEventListener: () => {},
  body: { style: {} }
};
sandbox.addEventListener = () => {};
sandbox.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; },
  removeItem(k) { delete this._d[k]; }
};

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);
vm.runInContext(pagesCode, sandbox);
vm.runInContext('_scoringMonth = "2026-07";', sandbox);

let pass = 0, fail = 0;
function check(name, condition, detail) {
  if (condition) { console.log('  ✓ ' + name); pass++; }
  else { console.log('  ✗ ' + name + (detail ? ' → ' + detail : '')); fail++; }
}

// ========== 测试1: _esc 函数 ==========
console.log('\n=== 测试1: _esc 转义函数 ===');
const escResult = vm.runInContext(`
  JSON.stringify({
    script: _esc('<' + 'script>alert(1)</' + 'script>'),
    quotes: _esc('a"b\\'c&d'),
    null: _esc(null),
    undef: _esc(undefined),
    num: _esc(123)
  })
`, sandbox);
const esc = JSON.parse(escResult);
check('script 标签转义', esc.script.includes('&lt;') && !esc.script.includes('<script'));
check('引号转义', esc.quotes.includes('&quot;') && esc.quotes.includes('&#39;') && esc.quotes.includes('&amp;'));
check('null → 空串', esc.null === '');
check('undefined → 空串', esc.undef === '');
check('数字 → 字符串', esc.num === '123');

// ========== 测试2: _auth 动态读取 ==========
console.log('\n=== 测试2: _auth 动态代理 ===');
vm.runInContext('globalThis.Auth = { isAdmin: false, staffId: 42, staffName: "测试员", role: "staff" };', sandbox);
const authWith = JSON.parse(vm.runInContext('JSON.stringify({ isAdmin: _auth.isAdmin, staffId: _auth.staffId, staffName: _auth.staffName })', sandbox));
check('有Auth时 isAdmin=false', authWith.isAdmin === false);
check('有Auth时 staffId=42', authWith.staffId === 42);
check('有Auth时 staffName=测试员', authWith.staffName === '测试员');

vm.runInContext('delete globalThis.Auth;', sandbox);
const authWithout = JSON.parse(vm.runInContext('JSON.stringify({ isAdmin: _auth.isAdmin, staffId: _auth.staffId, staffName: _auth.staffName })', sandbox));
check('无Auth时 fallback isAdmin=true', authWithout.isAdmin === true);
check('无Auth时 fallback staffId=null', authWithout.staffId === null);

// ========== 测试3: 全页面渲染 ==========
console.log('\n=== 测试3: 全页面渲染完整性 ===');
vm.runInContext('globalThis.Auth = { isAdmin: true, staffId: null, staffName: null, role: "admin" };', sandbox);
const pages = ['renderDashboard', 'renderPerformance', 'renderRatings', 'renderCustomerReviews', 'renderStaff', 'renderSchedule', 'renderAttendance', 'renderSupport', 'renderDoorSchedule', 'renderHandbook'];
for (const fn of pages) {
  try {
    const html = vm.runInContext(fn + '();', sandbox);
    const issues = [];
    if (html.includes('undefined')) issues.push('undefined');
    if (html.includes('[object Object]')) issues.push('[object Object]');
    if (html.includes('NaN')) issues.push('NaN');
    check(fn + ' (len=' + html.length + ')', issues.length === 0, issues.join(','));
  } catch(e) { check(fn, false, e.message.substring(0, 80)); }
}

// ========== 测试4: XSS 注入防护 ==========
console.log('\n=== 测试4: XSS 注入防护 ===');
// 注入恶意 name 到评分页
vm.runInContext(`
  var d = Store.get('performanceData');
  d.july.records.push({ name: '<img src=x onerror=alert(1)>', sales: 1000, qty: 10, tickets: 10, upt: 1.0, hourlyOutput: 100 });
  Store.set('performanceData', d);
`, sandbox);
const xssHtml = vm.runInContext('renderRatings();', sandbox);
check('评分页 name XSS 拦截', !xssHtml.includes('<img src=x onerror'), '未拦截');
check('评分页 name 已转义为 &lt;img', xssHtml.includes('&lt;img'), xssHtml.substring(xssHtml.indexOf('img'), xssHtml.indexOf('img')+30));

// 注入恶意好评
vm.runInContext(`
  var rv = Store.get('customerReviews') || [];
  rv.push({ id: 999, staffName: 'XSS', snippet: '<img src=x onerror=alert(1)>', keywords: ['" onmouseover=alert(1) x="'], date: '2026-07-18', ratingType: '好评', staff: 'XSS', type: '好评', detail: '<b>bold</b>' });
  Store.set('customerReviews', rv);
`, sandbox);
const rvHtml = vm.runInContext('renderCustomerReviews();', sandbox);
check('好评页 snippet XSS 拦截', !rvHtml.includes('<img src=x onerror'), '未拦截');
check('好评页 keywords XSS 拦截', !rvHtml.includes('onmouseover=alert'), '未拦截');

// ========== 测试5: Store.set 深拷贝 ==========
console.log('\n=== 测试5: Store.set 引用隔离 ===');
vm.runInContext(`
  var testObj = { a: 1, b: [2, 3] };
  Store.set('test_deep_copy', testObj);
  testObj.a = 999;
  testObj.b.push(4);
`, sandbox);
const deepResult = vm.runInContext('JSON.stringify(Store.get("test_deep_copy"))', sandbox);
check('引用已隔离', deepResult === '{"a":1,"b":[2,3]}', deepResult);

// ========== 测试6: 隐私模式降级 ==========
console.log('\n=== 测试6: 隐私模式 localStorage 降级 ===');
const crashSandbox = { console };
crashSandbox.window = crashSandbox;
crashSandbox.document = sandbox.document;
crashSandbox.addEventListener = () => {};
crashSandbox.sessionStorage = { getItem: () => null };
vm.createContext(crashSandbox);
crashSandbox.localStorage = {
  _fail: false,
  getItem: () => '{"test": 1}',
  setItem: function() { if (!this._fail) throw new Error('QuotaExceededError'); },
  removeItem: function() { if (!this._fail) throw new Error('QuotaExceededError'); }
};
try {
  vm.runInContext(appCode, crashSandbox);
  check('隐私模式 init 不崩溃', true);
} catch(e) {
  check('隐私模式 init 不崩溃', false, e.message.substring(0, 100));
}

// ========== 总结 ==========
console.log('\n========================================');
console.log(`结果: ${pass} 通过 / ${fail} 失败 / 共 ${pass + fail} 项`);
console.log(fail === 0 ? '✓ 全部通过' : '✗ 有失败项需要修复');
process.exit(fail === 0 ? 0 : 1);
