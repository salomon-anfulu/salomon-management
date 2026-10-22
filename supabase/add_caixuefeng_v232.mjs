// v232: 云端 blob 补蔡雪峰 staff 条目
import { readFileSync } from 'fs';

const cfg = readFileSync('supabase/config.js', 'utf8');
const ANON = cfg.match(/ANON_KEY__\s*=\s*'([^']+)'/)[1];
const BASE = 'https://oiisdkprulysjbgeiyzh.supabase.co';

const lr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'chenguangquan@salomon.temp', password: 'Salomon2026!' }),
});
if (!lr.ok) { console.log('登录失败', lr.status); process.exit(1); }
const { access_token } = await lr.json();
console.log('会话 OK');

const gr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', {
  headers: { apikey: ANON, Authorization: 'Bearer ' + access_token },
});
const blob = (await gr.json())[0].data;

const NEW = { id: 29, name: '蔡雪峰', gender: '男', dept: '仓库兼职', joinDate: '2026-10-22', status: 'active', avatar_color: '#8b5cf6', availableDays: 0, mbti: '' };
const exists = blob.staff.find(s => s.name === NEW.name || s.id === NEW.id);
if (exists) {
  console.log('= 已在云端:', JSON.stringify(exists).slice(0, 100));
  if (JSON.stringify(exists) !== JSON.stringify(NEW)) { Object.assign(exists, NEW); console.log('  → 覆盖为干净条目'); }
} else {
  blob.staff.push(NEW);
  console.log('+ 蔡雪峰 加入云端 staff');
}
blob.staff.sort((a, b) => (a.id || 0) - (b.id || 0));

const pr = await fetch(BASE + '/rest/v1/app_data?id=eq.main', {
  method: 'PATCH',
  headers: { apikey: ANON, Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify({ data: blob, updated_at: new Date().toISOString() }),
});
console.log('PATCH →', pr.status);
if (!pr.ok) { console.log(await pr.text()); process.exit(1); }

const vr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', {
  headers: { apikey: ANON, Authorization: 'Bearer ' + access_token },
});
const vstaff = (await vr.json())[0].data.staff;
console.log('复验: 云端 staff 总数 =', vstaff.length);
const s = vstaff.find(x => x.id === 29);
console.log(s ? `✓ ${s.name} id=${s.id} ${s.dept} ${s.status}` : '❌ 缺失');
