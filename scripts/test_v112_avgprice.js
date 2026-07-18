/**
 * v112 测试：销售单数门控逻辑
 * - tickets ≤ 5 → 直接1分
 * - tickets > 5 → 走原规则
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '..');
const appCode = fs.readFileSync(path.join(baseDir, 'js/app.js'), 'utf8');
const pagesCode = fs.readFileSync(path.join(baseDir, 'js/pages.js'), 'utf8');

const sandbox = {};
sandbox.window = sandbox;
sandbox.document = {
  getElementById: () => ({ innerHTML: '', addEventListener: () => {}, style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } }),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {}, addEventListener: () => {} }),
  addEventListener: () => {},
  body: { style: {} },
};
sandbox.addEventListener = () => {};
sandbox.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = v; },
  removeItem(k) { delete this._d[k]; },
};
sandbox.console = console;

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);
vm.runInContext(pagesCode, sandbox);

// 在 VM 内部运行所有测试，避免 const 作用域问题
const testCode = `
(function() {
  // === Test data: tickets 边界值 ===
  const testCases = [
    [0, true,  'tickets=0 → 门控1分'],
    [3, true,  'tickets=3(<5) → 门控1分'],
    [5, true,  'tickets=5(边界=5) → 门控1分'],
    [6, false, 'tickets=6(刚过门控) → 走原规则'],
    [20, false,'tickets=20(正常) → 走原规则'],
  ];

  // 构造7月测试业绩数据
  Store._cache = null;
  Store.defaults.performanceData.july = {
    totalSales: 50000,
    records: testCases.map(function(c, i) {
      var tickets = c[0];
      var sales = tickets > 0 ? tickets * 1000 : 0;
      var qty = tickets * 2;
      return {
        name: '测试员' + i,
        sales: sales, qty: qty, tickets: tickets,
        upt: tickets > 0 ? qty / tickets : 0,
        avgPrice: tickets > 0 ? sales / tickets : 0,
        workHours: 50,
        hourlyOutput: 50 > 0 ? Math.round(sales / 50 * 10) / 10 : 0,
        salesShare: 0.1,
      };
    }),
  };
  localStorage._d = {};
  Store.init();
  _scoringMonth = '2026-07';

  var results = [];
  var allPass = true;
  testCases.forEach(function(c, i) {
    var tickets = c[0], expectedLow = c[1], desc = c[2];
    var r = calcPerformanceScore('测试员' + i);
    var actualLow = r.lowTickets === true;
    var scoreOk = expectedLow ? r.score === 1 : (r.score >= 1 && r.score <= 5);
    var pass = expectedLow === actualLow && scoreOk;
    if (!pass) allPass = false;
    results.push({
      pass: pass, desc: desc, tickets: tickets,
      score: r.score, lowTickets: r.lowTickets, bonus: r.bonusDetail,
      expectedLow: expectedLow,
    });
  });

  // === 扫描现有7月真实数据 ===
  var realLow = [];
  var julyData = Store.defaults.performanceData.july;
  // 还原真实数据：从 localStorage 读取原始 defaults（测试数据已覆盖，用别的方式）
  // 这里改为返回 results 给外部处理
  return { results: results, allPass: allPass };
})();
`;

let testResult;
try {
  testResult = vm.runInContext(testCode, sandbox);
} catch (e) {
  console.error('Test code error:', e.message, '\n', e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}

console.log('=== v112 销售单数门控测试 ===\n');
testResult.results.forEach(r => {
  console.log(`[${r.pass ? '✓' : '✗'}] ${r.desc}`);
  console.log(`    tickets=${r.tickets} → 评分=${r.score} (lowTickets=${r.lowTickets}, bonus="${r.bonus}")`);
  if (!r.pass) console.log(`    ❌ 期望: lowTickets=${r.expectedLow}, score=${r.expectedLow ? 1 : '1-5'}`);
});

// === 扫描现有7月真实数据（从源码直接解析）===
console.log('\n=== 7月真实数据 tickets≤5 扫描 ===\n');
const julyBlock = appCode.match(/july:\s*\{[\s\S]*?records:\s*\[([\s\S]*?)\]\s*,\s*totalSales/);
if (julyBlock) {
  const rows = julyBlock[1].split(/}\s*,\s*\{/);
  let lowCount = 0;
  rows.forEach(row => {
    const name = (row.match(/"name":\s*"([^"]+)"/) || [])[1];
    const tickets = parseInt((row.match(/"tickets":\s*(\d+)/) || [])[1] || '0');
    if (name && tickets <= 5) {
      console.log(`  ⚠️  ${name}: tickets=${tickets} → 会被门控判1分`);
      lowCount++;
    }
  });
  console.log(`  共 ${rows.length} 条7月记录，其中 tickets≤5 的有 ${lowCount} 条`);
}

console.log(`\n${testResult.allPass ? '✅ 全部通过' : '❌ 有失败'}`);
process.exit(testResult.allPass ? 0 : 1);
