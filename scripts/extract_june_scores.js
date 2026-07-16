// Extract June scores excluding 玛依拉 and 唐蓉 (joined Service Team in July)
const fs = require('fs');
const vm = require('vm');

const appJs = fs.readFileSync('/Users/a86137/Desktop/兼职/安福路兼职管理系统/js/app.js', 'utf8');
const pagesJs = fs.readFileSync('/Users/a86137/Desktop/兼职/安福路兼职管理系统/js/pages.js', 'utf8');

// Minimal browser-like environment
const noop = () => {};
const sandbox = {
  console: console,
  window: {
    addEventListener: noop,
    removeEventListener: noop,
  },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add: () => {} }, appendChild: () => {}, setAttribute: () => {}, addEventListener: () => {} }),
    body: { appendChild: () => {} },
    addEventListener: noop,
    removeEventListener: noop,
  },
  localStorage: {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
    clear() { this._store = {}; },
  },
  Chart: function() { return { destroy: () => {}, update: () => {} }; },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: () => {},
  clearInterval: () => {},
  location: { hash: '', reload: () => {} },
  navigator: { userAgent: 'node' },
  fetch: () => Promise.resolve({ json: () => Promise.resolve({}), ok: true }),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  escape: escape,
  unescape: unescape,
  decodeURIComponent: decodeURIComponent,
  encodeURIComponent: encodeURIComponent,
  Date: Date,
  Math: Math,
  JSON: JSON,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Boolean: Boolean,
  RegExp: RegExp,
  Map: Map,
  Set: Set,
  Error: Error,
};

sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.addEventListener = noop;
sandbox.removeEventListener = noop;
sandbox.window = sandbox;

vm.createContext(sandbox);

// Run app.js and pages.js
try {
  vm.runInContext(appJs, sandbox);
  console.log('[OK] app.js loaded');
} catch (e) {
  console.error('[ERR] app.js:', e.message);
}

try {
  vm.runInContext(pagesJs, sandbox);
  console.log('[OK] pages.js loaded');
} catch (e) {
  console.error('[ERR] pages.js:', e.message);
}

// Set scoring month to June
vm.runInContext('_scoringMonth = "2026-06";', sandbox);
console.log('[OK] _scoringMonth set to 2026-06');

// Get staff list
const staffList = vm.runInContext('JSON.parse(JSON.stringify(Store.get("staff").filter(s => s.status === "active" && s.dept === "Service Team")))', sandbox);
console.log('[INFO] Active Service Team staff:', staffList.map(s => s.name).join(', '));

// Exclude 玛依拉 and 唐蓉
const EXCLUDE = ['玛依拉', '唐蓉'];
const filteredStaff = staffList.filter(s => !EXCLUDE.includes(s.name));
console.log('[INFO] After exclusion:', filteredStaff.map(s => s.name).join(', '));

// Calculate scores for each person
const results = [];
for (const staff of filteredStaff) {
  const name = staff.name;
  try {
    const scores = vm.runInContext(`(function() {
      _scoringMonth = "2026-06";
      var raw = {
        availability: calcAvailabilityScore(${JSON.stringify(name)}),
        performance: calcPerformanceScore(${JSON.stringify(name)}),
        behavior: calcBehaviorScore(${JSON.stringify(name)}),
        attendance: calcAttendanceScore(${JSON.stringify(name)}),
        customerReview: calcCustomerReviewScore(${JSON.stringify(name)})
      };
      var s = {
        availability: raw.availability ? raw.availability.score : 0,
        performance: raw.performance ? raw.performance.score : 0,
        behavior: raw.behavior ? raw.behavior.score : 0,
        attendance: raw.attendance ? raw.attendance.score : 0,
        customerReview: raw.customerReview ? raw.customerReview.score : 0
      };
      s.raw = raw;
      s.avg = (s.availability + s.performance + s.behavior + s.attendance + s.customerReview) / 5;
      s.rating = getRatingTitle(s, s.avg, ${JSON.stringify(name)});
      s.achievements = getAchievements(s, '');
      s.level = getRatingLevel(s.avg);
      return JSON.parse(JSON.stringify(s));
    })()`, sandbox);
    results.push({ name, ...scores });
    console.log(`[SCORE] ${name}: 工时=${scores.availability} 业绩=${scores.performance} 行为=${scores.behavior} 考勤=${scores.attendance} 好评=${scores.customerReview} 均分=${scores.avg.toFixed(2)} [${scores.rating.title}]`);
  } catch (e) {
    console.error(`[ERR] ${name}:`, e.message);
    results.push({ name, error: e.message });
  }
}

// Sort by avg score descending
results.sort((a, b) => (b.avg || 0) - (a.avg || 0));

// Save to file
fs.writeFileSync('/Users/a86137/Desktop/兼职/安福路兼职管理系统/scripts/june_scores_data.json', JSON.stringify(results, null, 2));
console.log('\n[DONE] Saved to june_scores_data.json');
console.log('[INFO] Total people:', results.length);
