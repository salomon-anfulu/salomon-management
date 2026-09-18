// v209 验证+修复：1) VM 沙箱验证管理层污染防御 2) REST 修云端考赛尔条目
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ========== Part 1: VM 沙箱验证 ==========
console.log('===== Part 1: VM 沙箱验证 =====');
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, Map, Set, Promise,
  requestAnimationFrame: fn => fn(),
  window: { addEventListener: () => {}, dispatchEvent: () => {} },
  document: { addEventListener: () => {}, getElementById: () => null, createElement: () => ({ style: {} }), body: { appendChild: () => {} } },
  location: { hash: '' },
  URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
  Blob: class {}, FileReader: class {},
  showToast: () => {}, CustomEvent: class {},
  SbClient: { isOnline: () => false },
};
const ctx = vm.createContext(sandbox);
vm.runInContext(readFileSync(join(root, 'js/app.js'), 'utf8'), ctx, { filename: 'app.js' });
vm.runInContext(readFileSync(join(root, 'js/sync.js'), 'utf8'), ctx, { filename: 'sync.js' });
console.log('app.js + sync.js loaded');

// 注入测试数据：本地 staff 含污染的考赛尔（模拟现状）
vm.runInContext(`
  (function() {
    const staff = Store.defaults.staff.map(s => ({ ...s }));
    // 模拟本地已污染：考赛尔带 admin 特征
    const k = staff.find(s => s.name === '考赛尔·艾力');
    if (k) { k.role = 'manager'; k.email = 'admin@salomon.temp'; }
    Store.set('staff', staff);
    // 云端 blob：同样污染 + 正常员工
    window.__cloud = {
      staff: [
        { id: 24, name: '考赛尔·艾力', dept: '仓库兼职', status: 'active', role: 'manager', email: 'admin@salomon.temp' },
        { id: 16, name: '陈广权', dept: '仓库兼职', status: 'active', email: 'chenguangquan@salomon.temp' },
        { id: 9, name: '王雅澜', dept: 'Service Team', status: 'active' }, // 测离职锁不受影响
      ],
    };
  })()
`, ctx);

// pull 测试
const pullRes = vm.runInContext(`
  (function() {
    Sync._mergeIntoLocal(window.__cloud);
    const staff = Store.getList('staff');
    const k = staff.find(s => s.name === '考赛尔·艾力');
    const c = staff.find(s => s.name === '陈广权');
    const w = staff.find(s => s.name === '王雅澜');
    return {
      kao_role: k.role || '无', kao_email: k.email || '无',
      chen_email: c.email || '无',
      wang_status: w.status,
    };
  })()
`, ctx);
console.log('pull 结果:', JSON.stringify(pullRes));
const assert1 = pullRes.kao_role === '无' && pullRes.kao_email === '无';
const assert2 = pullRes.chen_email === 'chenguangquan@salomon.temp'; // 正常 email 不误伤
const assert3 = pullRes.wang_status === 'left'; // 离职锁仍生效
console.log('断言 pull: 剥离污染', assert1 ? '✅' : '❌', '| 正常email保留', assert2 ? '✅' : '❌', '| 离职锁不受影响', assert3 ? '✅' : '❌');

// push 测试
const pushRes = vm.runInContext(`
  (function() {
    const shared = {
      staff: [
        { id: 24, name: '考赛尔·艾力', dept: '仓库兼职', status: 'active', role: 'manager', email: 'admin@salomon.temp' },
        { id: 16, name: '陈广权', dept: '仓库兼职', status: 'active', email: 'chenguangquan@salomon.temp' },
      ],
    };
    Sync._mergeLocalIntoShared(shared);
    const k = shared.staff.find(s => s.name === '考赛尔·艾力');
    const c = shared.staff.find(s => s.name === '陈广权');
    return { kao_role: k.role || '无', kao_email: k.email || '无', chen_email: c.email || '无' };
  })()
`, ctx);
console.log('push 结果:', JSON.stringify(pushRes));
const assert4 = pushRes.kao_role === '无' && pushRes.kao_email === '无';
const assert5 = pushRes.chen_email === 'chenguangquan@salomon.temp';
console.log('断言 push: 云端净化', assert4 ? '✅' : '❌', '| 正常email保留', assert5 ? '✅' : '❌');

// 下拉渲染验证（admin 视角，需 pages.js 的 isManagementStaff 已在 app.js）
const dropRes = vm.runInContext(`
  (function() {
    const staff = Store.getList('staff').filter(s => s.status === 'active' && !isManagementStaff(s) && s.dept === '仓库兼职');
    return { cangkuNames: staff.map(s => s.name).join(','), hasKao: staff.some(s => s.name === '考赛尔·艾力') };
  })()
`, ctx);
console.log('下拉(仓库兼职):', dropRes.cangkuNames, '| 含考赛尔:', dropRes.hasKao ? '✅' : '❌');

const allPass = assert1 && assert2 && assert3 && assert4 && assert5 && dropRes.hasKao;
console.log('沙箱总断言:', allPass ? '✅ 全过' : '❌ 有失败');
if (!allPass) process.exit(1);

// ========== Part 2: REST 修云端 ==========
console.log('\n===== Part 2: REST 修云端 =====');
const cfg = readFileSync(join(root, 'supabase/config.js'), 'utf8');
const anon = cfg.match(/ANON_KEY__\s*=\s*'([^']+)'/)[1];
const BASE = 'https://oiisdkprulysjbgeiyzh.supabase.co';

const lr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'chenguangquan@salomon.temp', password: 'Salomon2026!' })
});
if (!lr.ok) { console.log('登录失败:', lr.status); process.exit(1); }
const { access_token } = await lr.json();
const H = { apikey: anon, Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' };

const gr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', { headers: H });
const blob = (await gr.json())[0].data;
const k = (blob.staff || []).find(s => s.name === '考赛尔·艾力');
if (k && (k.role || (k.email || '').includes('admin'))) {
  console.log('云端污染确认: role=' + (k.role || '-') + ' email=' + (k.email || '-'));
  delete k.role; delete k.email;
  // 顺手补 kaosaier 的正确 email（与其他兼职一致的映射，供改密匹配用）
  k.email = 'kaosaier@salomon.temp';
  const pr = await fetch(BASE + '/rest/v1/app_data?id=eq.main', {
    method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ data: blob, updated_by: 'v209-mgmt-pollution-fix' }),
  });
  console.log('PATCH →', pr.status, pr.ok ? '✅ 修复成功' : (await pr.text()).slice(0, 150));
} else {
  console.log('云端无污染（可能已被修）');
}

// 复验
const vr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', { headers: H });
const vb = (await vr.json())[0].data;
const vk = (vb.staff || []).find(s => s.name === '考赛尔·艾力');
console.log('复验考赛尔: role=' + (vk.role || '无') + ' email=' + (vk.email || '无') + ' status=' + vk.status + ' dept=' + vk.dept);
console.log('isManagementStaff 将判定:', vm.runInContext(`isManagementStaff(${JSON.stringify(vk)})`, ctx) ? '❌ 仍是管理层' : '✅ 普通兼职');
