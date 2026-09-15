#!/usr/bin/env node
/**
 * 考赛尔·艾力 Auth 账号创建 + 关联
 * 1. 检查账号是否已存在（店长可能已在 Dashboard 手动建号）
 * 2. 不存在则用 Admin API 创建（email_confirm=true, user_metadata.name=考赛尔·艾力）
 * 3. 检查 public.staff 表现状，按需补行/回填 auth_id
 * 4. 验证登录（password grant）
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = 'https://oiisdkprulysjbgeiyzh.supabase.co';
const KEY_FILE = join(__dirname, 'service_role.key');
const EMAIL = 'kaosaier@salomon.temp';
const PASSWORD = 'Salomon2026!';
const NAME = '考赛尔·艾力';

let KEY;
try {
  KEY = readFileSync(KEY_FILE, 'utf8').trim();
  if (KEY.length < 100) throw new Error('密钥太短');
} catch (e) {
  console.error('[ERROR] 读取 service_role.key 失败:', e.message);
  process.exit(1);
}
console.log('[INFO] 密钥已加载 (' + KEY.slice(0, 12) + '...' + KEY.slice(-6) + ')');

const adminHeaders = {
  'apikey': KEY,
  'Authorization': 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

async function step(n, title) { console.log('\n=== ' + n + '. ' + title + ' ==='); }

(async () => {
  // --- 1. 查账号是否已存在 ---
  await step(1, '检查账号是否存在');
  let existing = null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users?per_page=1000', { headers: adminHeaders });
    if (!r.ok) { console.error('列表失败:', r.status, (await r.text()).slice(0, 200)); process.exit(1); }
    const j = await r.json();
    const all = j.users || [];
    console.log('Auth 用户总数:', all.length);
    existing = all.find(u => (u.email || '') === EMAIL);
    if (existing) {
      console.log('✅ 账号已存在:', JSON.stringify({ id: existing.id, email: existing.email, confirmed: existing.email_confirmed_at ? true : false, metadata: existing.user_metadata }));
    } else {
      console.log('→ 不存在，需要创建');
    }
  } catch (e) { console.error('查询异常:', e.message); process.exit(1); }

  // --- 2. 创建账号（如缺失）---
  let userId = existing ? existing.id : null;
  if (!existing) {
    await step(2, '创建账号');
    const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { name: NAME, staff_id: 24, role: 'parttime' },
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      console.error('创建失败:', r.status, JSON.stringify(d).slice(0, 300));
      process.exit(1);
    }
    userId = d.id;
    console.log('✅ 创建成功:', JSON.stringify({ id: userId, email: d.email, metadata: d.user_metadata }));
  } else {
    await step(2, '账号已存在——核对 user_metadata');
    const meta = existing.user_metadata || {};
    if (meta.name !== NAME) {
      console.log('⚠️ metadata.name =', meta.name, '≠', NAME, '，修正中...');
      const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + existing.id, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ user_metadata: { ...meta, name: NAME, staff_id: 24, role: 'parttime' } }),
      });
      console.log(r.ok ? '✅ metadata 已修正' : '❌ 修正失败: ' + r.status);
    } else {
      console.log('metadata.name 正确:', meta.name);
    }
  }

  // --- 3. public.staff 表现状 ---
  await step(3, '检查 public.staff 表');
  const sr = await fetch(SUPABASE_URL + '/rest/v1/staff?select=id,name,dept,status,auth_id&order=id.asc', { headers: adminHeaders });
  const rows = await sr.json();
  if (!sr.ok) { console.error('查询 staff 失败:', sr.status, JSON.stringify(rows).slice(0, 200)); }
  else {
    console.log('staff 表行数:', rows.length);
    rows.forEach(x => console.log('  id=' + x.id, x.name, '|', x.dept, '|', x.status, '| auth_id=' + (x.auth_id ? x.auth_id.slice(0, 8) + '...' : '无')));
    const dup = rows.find(x => x.name === NAME);
    if (dup) {
      if (!dup.auth_id) {
        console.log('→ 回填 auth_id...');
        const u = await fetch(SUPABASE_URL + '/rest/v1/staff?id=eq.' + dup.id, {
          method: 'PATCH', headers: { ...adminHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ auth_id: userId }),
        });
        console.log(u.ok ? '✅ auth_id 已回填 (staff id=' + dup.id + ')' : '❌ 回填失败: ' + u.status);
      } else if (dup.auth_id !== userId) {
        console.log('⚠️ staff.auth_id 与新账号不一致，修正...');
        const u = await fetch(SUPABASE_URL + '/rest/v1/staff?id=eq.' + dup.id, {
          method: 'PATCH', headers: { ...adminHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ auth_id: userId }),
        });
        console.log(u.ok ? '✅ auth_id 已修正' : '❌ 修正失败: ' + u.status);
      } else {
        console.log('✅ staff.auth_id 已正确关联');
      }
    } else {
      console.log('→ staff 表无此人（与其他兼职一致的兜底模式，靠 user_metadata.name 识别）');
      const i = await fetch(SUPABASE_URL + '/rest/v1/staff', {
        method: 'POST', headers: { ...adminHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ id: 24, name: NAME, dept: '仓库兼职', status: 'active', auth_id: userId, role: 'parttime' }),
      });
      console.log(i.ok ? '✅ 已补插 staff 行 (id=24)' : '⚠️ 补插失败(' + i.status + ')——非必须，兜底模式可用');
    }
  }

  // --- 4. 验证登录 ---
  await step(4, '验证登录（password grant）');
  const configSrc = readFileSync(join(__dirname, 'config.js'), 'utf8');
  const anonMatch = configSrc.match(/ANON_KEY__\s*=\s*'([^']+)'/);
  const anonKey = anonMatch ? anonMatch[1] : null;
  if (!anonKey || anonKey.length < 100) {
    console.log('⚠️ 本地 config.js 的 anon key 异常（长度=' + (anonKey ? anonKey.length : 0) + '），改用 service_role 验证登录');
  }
  const vkey = (anonKey && anonKey.length >= 100) ? anonKey : KEY;
  const lr = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': vkey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const ld = await lr.json();
  if (!lr.ok) {
    console.error('❌ 登录验证失败:', lr.status, JSON.stringify(ld).slice(0, 300));
    process.exit(1);
  }
  console.log('✅ 登录成功:', JSON.stringify({ email: ld.user.email, name: ld.user.user_metadata && ld.user.user_metadata.name, role: ld.user.user_metadata && ld.user.user_metadata.role }));
  console.log('\n[DONE] 考赛尔·艾力账号已就绪: ' + EMAIL + ' / ' + PASSWORD);
})();
