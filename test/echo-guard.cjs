/**
 * v150 防循环验证：用 Node vm 真实加载 sync.js，mock 浏览器依赖，
 * 验证 Realtime 回声防护（自己的写入回声被忽略，别人的变更正常触发 pull）。
 * 这是 v146 死循环的根源测试。
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const syncCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'sync.js'), 'utf8');

let renderCount = 0;
let appDataGetCount = 0;
let appDataSaveCount = 0;
let lastRealtimeCallback = null;

const storeData = {};
const Store = {
  get: (k) => storeData[k],
  set: (k, v) => { storeData[k] = v; },
};
const Router = { render: () => { renderCount++; } };

const SbClient = {
  isOnline: () => true,
  appData: {
    get: async () => { appDataGetCount++; return { data: null, error: null }; },
    save: async () => { appDataSaveCount++; return { error: null }; },
  },
  subscribe: (table, cb) => { lastRealtimeCallback = cb; return { unsub: true }; },
};

const docListeners = {};
const document = {
  addEventListener: (ev, fn) => { docListeners[ev] = fn; },
  getElementById: () => ({ className: '', textContent: '', style: {}, setAttribute() {} }),
  hidden: false,
};

const sandbox = {
  window: {}, document, Store, Router, SbClient,
  showToast: () => {}, console,
  setTimeout, clearTimeout,
  setInterval: () => 0,
  clearInterval: () => {},
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  unescape, encodeURIComponent, Date, Math, Promise,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(syncCode, sandbox);
vm.runInContext('globalThis.Sync = Sync;', sandbox); // const 不挂全局，显式暴露
const Sync = sandbox.Sync;

docListeners['DOMContentLoaded'] && docListeners['DOMContentLoaded']();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  await sleep(1700); // 等 DOMContentLoaded 内 setTimeout(1500) 的初始化执行完
  const getAfterInit = appDataGetCount;
  const saveAfterInit = appDataSaveCount;
  console.log('[init]        get=%d save=%d render=%d', getAfterInit, saveAfterInit, renderCount);
  if (getAfterInit !== 1) throw new Error('init 应触发 1 次 Supabase pull');
  if (saveAfterInit !== 0) throw new Error('init 不应 push');

  // 场景A：用户自己 push
  Sync.push('tester');
  await sleep(50);
  const saveAfterPush = appDataSaveCount;
  console.log('[self push]  save=%d (应 +1)', saveAfterPush);
  if (saveAfterPush !== 1) throw new Error('push 应触发 1 次 Supabase save');

  // 场景B：模拟自己的 Realtime 回声（刚写入 < 3s，应被忽略）
  const getBeforeEcho = appDataGetCount;
  if (lastRealtimeCallback) lastRealtimeCallback({ eventType: 'UPDATE' });
  await sleep(1000);
  const getAfterEcho = appDataGetCount;
  console.log('[self echo]  get=%d (应 == %d，回声被忽略)', getAfterEcho, getBeforeEcho);
  if (getAfterEcho !== getBeforeEcho) throw new Error('FAIL: 自己的回声触发了 pull（循环风险）');

  // 场景C：模拟别人的变更（把写入时间戳拨到 10s 前，应正常触发 pull）
  Sync._lastSupabaseWriteTs = Date.now() - 10000;
  const getBeforeOther = appDataGetCount;
  if (lastRealtimeCallback) lastRealtimeCallback({ eventType: 'UPDATE' });
  await sleep(1000);
  const getAfterOther = appDataGetCount;
  console.log('[other chg]  get=%d (应 == %d+1，别人的变更触发 pull)', getAfterOther, getBeforeOther);
  if (getAfterOther !== getBeforeOther + 1) throw new Error('FAIL: 别人的变更未触发 pull');

  console.log('\n✅ 防循环测试全部通过：自己的回声被忽略，别人的变更正常触发 pull，无无限刷新风险');
})().catch(e => { console.error('\n❌ 测试失败:', e.message); process.exit(1); });
