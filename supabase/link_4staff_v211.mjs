// v211: 4名新兼职账号 metadata 关联脚本
// 前置: 店长已在 Supabase Dashboard → Authentication → Add User 手动建号(勾选 Auto Confirm User):
//   liuxiaojing@salomon.temp / heweipeng@salomon.temp / lishuting@salomon.temp / wangjiaming@salomon.temp
//   密码统一 Salomon2026!
// 本脚本: 用初始密码登录 → PUT /auth/v1/user 写 name/staff_id/role → 复验
// 用法: node supabase/link_4staff_v211.mjs
import { readFileSync, writeFileSync } from 'fs';

const ANON = readFileSync('supabase/config.js', 'utf8').match(/ANON_KEY__\s*=\s*'([^']+)'/)[1];
const BASE = 'https://oiisdkprulysjbgeiyzh.supabase.co';
const ACC = [
  { email: 'liuxiaojing@salomon.temp', name: '刘晓静', staff_id: 25 },
  { email: 'heweipeng@salomon.temp',   name: '和卫鹏', staff_id: 26 },
  { email: 'lishuting@salomon.temp',   name: '李淑婷', staff_id: 27 },
  { email: 'wangjiaming@salomon.temp', name: '王佳鸣', staff_id: 28 },
];
const PWD = 'Salomon2026!';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const out = [];

for (const p of ACC) {
  try {
    // 1. 登录拿会话
    const lr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: p.email, password: PWD }),
    });
    if (!lr.ok) {
      const line = `❌ ${p.name}: 登录失败(${lr.status})——账号未在Dashboard创建或密码不对`;
      out.push(line); console.log(line);
      continue;
    }
    const ld = await lr.json();
    // 2. 已有正确 name 则跳过
    if (ld.user.user_metadata && ld.user.user_metadata.name === p.name) {
      const line = `= ${p.name}: metadata 已正确, 跳过`;
      out.push(line); console.log(line);
      continue;
    }
    // 3. 补 metadata
    const ur = await fetch(BASE + '/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ld.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { name: p.name, staff_id: p.staff_id, role: 'parttime' } }),
    });
    const line = `${ur.ok ? '✅' : '❌'} ${p.name}: PUT metadata -> ${ur.status}`;
    out.push(line); console.log(line);
    await sleep(3000);
  } catch (e) {
    const line = `❌ ${p.name}: ${e.message}`;
    out.push(line); console.log(line);
  }
}

// 4. 复验全部
console.log('=== 复验 ===');
out.push('=== 复验 ===');
for (const p of ACC) {
  const vr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: p.email, password: PWD }),
  });
  if (vr.ok) {
    const vd = await vr.json();
    const line = `✓ ${p.name}: 登录200 metadata=${JSON.stringify(vd.user.user_metadata)}`;
    out.push(line); console.log(line);
  } else {
    const line = `✗ ${p.name}: 登录${vr.status}`;
    out.push(line); console.log(line);
  }
  await sleep(2000);
}
writeFileSync('/tmp/link4_result.txt', out.join('\n'));
