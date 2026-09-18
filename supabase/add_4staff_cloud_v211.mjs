// v211: 云端 blob 补 4 名新兼职 staff 条目（老版本设备立即可见）
import { readFileSync } from 'fs';

const cfg = readFileSync('supabase/config.js', 'utf8');
const ANON = cfg.match(/ANON_KEY__\s*=\s*'([^']+)'/)[1];
const BASE = 'https://oiisdkprulysjbgeiyzh.supabase.co';

// 1. 拿陈广权会话（authenticated REST 读写 app_data）
const lr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'chenguangquan@salomon.temp', password: 'Salomon2026!' }),
});
if (!lr.ok) { console.log('登录失败', lr.status); process.exit(1); }
const { access_token } = await lr.json();
console.log('会话 OK');

// 2. 拉 main blob
const gr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', {
  headers: { apikey: ANON, Authorization: 'Bearer ' + access_token },
});
const rows = await gr.json();
const blob = rows[0].data;

// 3. staff 数组补 4 人（幂等：已有则跳过）
const NEW4 = [
  { id: 25, name: '刘晓静', gender: '女', dept: '仓库兼职', joinDate: '2026-09-18', status: 'active', avatar_color: '#60a5fa', availableDays: 0, mbti: '' },
  { id: 26, name: '和卫鹏', gender: '男', dept: '仓库兼职', joinDate: '2026-09-17', status: 'active', avatar_color: '#2dd4bf', availableDays: 0, mbti: '' },
  { id: 27, name: '李淑婷', gender: '女', dept: '仓库兼职', joinDate: '2026-09-17', status: 'active', avatar_color: '#e879f9', availableDays: 0, mbti: '' },
  { id: 28, name: '王佳鸣', gender: '男', dept: '仓库兼职', joinDate: '2026-09-18', status: 'active', avatar_color: '#94a3b8', availableDays: 0, mbti: '' },
];
let added = 0;
for (const p of NEW4) {
  const exists = blob.staff.find(s => s.name === p.name || s.id === p.id);
  if (exists) {
    console.log(`= ${p.name} 已在云端(id=${exists.id})`);
    // 若存在但字段缺失/被污染，直接覆盖为干净条目
    if (JSON.stringify(exists) !== JSON.stringify(p)) {
      Object.assign(exists, p);
      console.log(`  → 已覆盖为干净条目`);
    }
  } else {
    blob.staff.push(p);
    added++;
    console.log(`+ ${p.name} 加入云端 staff`);
  }
}
// 按 id 排序保持稳定
blob.staff.sort((a, b) => (a.id || 0) - (b.id || 0));

// 4. PATCH 回写
const pr = await fetch(BASE + '/rest/v1/app_data?id=eq.main', {
  method: 'PATCH',
  headers: { apikey: ANON, Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  body: JSON.stringify({ data: blob, updated_at: new Date().toISOString() }),
});
console.log('PATCH →', pr.status, added ? `(${added} 条新增)` : '(无新增,仅校验)');
if (!pr.ok) { console.log(await pr.text()); process.exit(1); }

// 5. 复验
const vr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', {
  headers: { apikey: ANON, Authorization: 'Bearer ' + access_token },
});
const vrows = await vr.json();
const vstaff = vrows[0].data.staff;
console.log('复验: 云端 staff 总数 =', vstaff.length);
NEW4.forEach(p => {
  const s = vstaff.find(x => x.id === p.id);
  console.log(s ? `✓ ${s.name} id=${s.id} ${s.dept} ${s.status}` : `❌ ${p.name} 缺失`);
});
