#!/usr/bin/env node
/**
 * 云端 main blob 净化（等效 v208 push 端逻辑，REST 直写）
 * 1. staff: 王龙宇/祖白代 → status=left, 移除 leftDate（全月隐藏模式）
 * 2. availability['2026-09']: 删除王龙宇/祖白代供班键
 * 3. staff: 补考赛尔·艾力条目（id=24, 仓库兼职, active）
 * 4. 复验写回结果
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const cfg = readFileSync(join(root, 'supabase/config.js'), 'utf8');
const anon = cfg.match(/ANON_KEY__\s*=\s*'([^']+)'/)[1];
const BASE = 'https://oiisdkprulysjbgeiyzh.supabase.co';

(async () => {
  // 1. 陈广权会话（authenticated 写通道，与 sync.js 推送同权限级别）
  const lr = await fetch(BASE + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'chenguangquan@salomon.temp', password: 'Salomon2026!' }),
  });
  if (!lr.ok) { console.error('会话失败:', lr.status); process.exit(1); }
  const { access_token, user } = await lr.json();
  console.log('会话OK:', user.email);
  const H = { apikey: anon, Authorization: 'Bearer ' + access_token, 'Content-Type': 'application/json' };

  // 2. 拉完整 main blob
  const gr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data,updated_at', { headers: H });
  const rows = await gr.json();
  if (!gr.ok || !rows.length) { console.error('拉取失败:', gr.status, JSON.stringify(rows).slice(0, 200)); process.exit(1); }
  const blob = rows[0].data;
  console.log('拉取OK, updated_at =', rows[0].updated_at);

  const changes = [];

  // 3a. staff 离职修复
  (blob.staff || []).forEach(s => {
    if (s.name === '王龙宇' || s.name === '祖白代') {
      if (s.status !== 'left' || s.leftDate) {
        changes.push(`staff ${s.name}: ${s.status}${s.leftDate ? '@' + s.leftDate : ''} → left(无leftDate)`);
        s.status = 'left';
        delete s.leftDate;
      }
    }
  });

  // 3b. 9月供班净化
  const sep = blob.availability && blob.availability['2026-09'] && blob.availability['2026-09'].data;
  if (sep) {
    ['王龙宇', '祖白代'].forEach(n => {
      if (sep[n]) { changes.push(`availability 2026-09 删除 ${n}`); delete sep[n]; }
    });
  }

  // 3c. 补考赛尔 staff 条目（从 defaults 同步格式）
  if (!(blob.staff || []).find(s => s.name === '考赛尔·艾力')) {
    blob.staff = blob.staff || [];
    blob.staff.push({ id: 24, name: '考赛尔·艾力', gender: '男', dept: '仓库兼职', joinDate: '2026-09-14', status: 'active', avatar_color: '#f59e0b', availableDays: 0, mbti: '' });
    blob.staff.sort((a, b) => (a.id || 0) - (b.id || 0));
    changes.push('staff 新增 考赛尔·艾力 (id=24)');
  }

  if (!changes.length) { console.log('无需修改，云端已是目标状态'); return; }
  changes.forEach(c => console.log('  -', c));

  // 4. 写回（整体 PATCH data 字段）
  const pr = await fetch(BASE + '/rest/v1/app_data?id=eq.main', {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ data: blob, updated_by: 'admin-cleanup-v208' }),
  });
  console.log('PATCH →', pr.status, pr.ok ? '✅ 写回成功' : (await pr.text()).slice(0, 200));
  if (!pr.ok) process.exit(1);

  // 5. 复验
  const vr = await fetch(BASE + '/rest/v1/app_data?id=eq.main&select=data', { headers: H });
  const vrows = await vr.json();
  const vb = vrows[0].data;
  const wly = (vb.staff || []).find(s => s.name === '王龙宇');
  const zbd = (vb.staff || []).find(s => s.name === '祖白代');
  const kse = (vb.staff || []).find(s => s.name === '考赛尔·艾力');
  const vsep = vb.availability && vb.availability['2026-09'] && vb.availability['2026-09'].data || {};
  console.log('\n--- 复验 ---');
  console.log('王龙宇:', JSON.stringify({ status: wly.status, leftDate: wly.leftDate || '无' }));
  console.log('祖白代:', JSON.stringify({ status: zbd.status, leftDate: zbd.leftDate || '无' }));
  console.log('考赛尔:', kse ? JSON.stringify({ id: kse.id, status: kse.status, dept: kse.dept }) : '缺失!');
  console.log('9月键含离职者:', Object.keys(vsep).filter(n => n === '王龙宇' || n === '祖白代').length === 0 ? '✅ 无' : '❌ 仍有');
  console.log('9月供班人数:', Object.keys(vsep).length);
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
