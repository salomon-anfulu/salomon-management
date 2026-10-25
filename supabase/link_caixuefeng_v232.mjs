// v232: 蔡雪峰账号 metadata 关联(v211模式)
import { readFileSync } from 'fs';

const ANON = readFileSync('supabase/config.js', 'utf8').match(/ANON_KEY__\s*=\s*'([^']+)'/)[1];
const BASE = 'https://oiisdkprulysjbgeiyzh.supabase.co';
const ACC = [{ email: 'caixuefeng@salomon.temp', name: '蔡雪峰', staff_id: 29 }];
const PWD = 'Salomon2026!';

for (const p of ACC) {
  // 1. 登录
  const lr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: p.email, password: PWD }),
  });
  if (!lr.ok) { console.log(`❌ ${p.name}: 登录失败(${lr.status})——账号未建或密码不是Salomon2026!`); process.exit(1); }
  const ld = await lr.json();
  // 2. 已有正确name跳过
  if (ld.user.user_metadata?.name === p.name) { console.log(`= ${p.name}: metadata已正确`); }
  else {
    // 3. 补metadata
    const ur = await fetch(BASE + '/auth/v1/user', {
      method: 'PUT',
      headers: { apikey: ANON, Authorization: 'Bearer ' + ld.access_token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { name: p.name, staff_id: p.staff_id, role: 'parttime' } }),
    });
    console.log(`${ur.ok ? '✅' : '❌'} ${p.name}: PUT metadata -> ${ur.status}`);
  }
  // 4. 复验
  const vr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: p.email, password: PWD }),
  });
  const vd = await vr.json();
  const md = vd.user?.user_metadata || {};
  console.log(`复验: name=${md.name} staff_id=${md.staff_id} role=${md.role} confirmed=${vd.user?.email_confirmed_at ? 'Y' : 'N'}`);
}
