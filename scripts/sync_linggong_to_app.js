/**
 * sync_linggong_to_app.js
 * 将 data/weekly_attendance_clean.json 的灵工打卡记录合并进 js/app.js 的 defaults.linggongAttendance.records
 *
 * 处理要点：
 *  1. 日期格式归一化：json 中是 2026/07/07，app.js 中是 2026-07-07，统一转横线
 *  2. 字段映射：只保留 app.js 使用的 6 个字段（name/date/signIn/signOut/status/totalHours）
 *  3. 去重：以 name|date|signIn|signOut 为 key，避免重复写入
 *  4. 排序：按 date + name 升序，保持与现有数据一致
 *
 * 用法：
 *   node scripts/sync_linggong_to_app.js           # 合并并写入 app.js
 *   node scripts/sync_linggong_to_app.js --dry     # 只打印差异，不写文件
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname.includes('scripts') ? path.join(__dirname, '..') : __dirname;
const jsonPath = path.join(ROOT, 'data', 'weekly_attendance_clean.json');
const appPath = path.join(ROOT, 'js', 'app.js');
const DRY = process.argv.includes('--dry');

if (!fs.existsSync(jsonPath)) {
  console.error('❌ 找不到', jsonPath, '请先运行 fetch_linggong.js 抓取数据');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const newRaw = json.records || [];

// 2026/07/07 -> 2026-07-07
const normDate = d => (d ? String(d).replace(/\//g, '-') : d);

const mapRec = r => ({
  name: r.name,
  date: normDate(r.date),
  signIn: r.signIn || '',
  signOut: r.signOut || '',
  status: r.status || '',
  totalHours: String(r.totalHours ?? ''),
});
const mapped = newRaw.map(mapRec);

const src = fs.readFileSync(appPath, 'utf8');
// 匹配 linggongAttendance 块内的 records 数组
const m = src.match(/linggongAttendance: \{\s*lastSync:[^\n]*\n\s*records: (\[[\s\S]*?\n\s*\])\s*\n\s*\}/);
if (!m) {
  console.error('❌ 未在 app.js 中匹配到 linggongAttendance.records');
  process.exit(1);
}
const existing = eval(m[1]);

const key = r => `${r.name}|${r.date}|${r.signIn}|${r.signOut}`;
const map = new Map();
existing.forEach(r => map.set(key(r), r));

let added = 0;
mapped.forEach(r => {
  const k = key(r);
  if (!map.has(k)) { map.set(k, r); added++; }
});

const merged = Array.from(map.values()).sort(
  (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)
);

const dates = [...new Set(merged.map(r => r.date))].sort();
console.log(`📊 现有 ${existing.length} 条`);
console.log(`📥 json 候选 ${mapped.length} 条（已归一化日期格式）`);
console.log(`➕ 实际新增 ${added} 条`);
console.log(`✅ 合并后 ${merged.length} 条`);
console.log(`📅 日期范围: ${dates[0]} ~ ${dates[dates.length - 1]}`);

if (DRY) {
  console.log('\n[dry] 未写入文件');
  process.exit(0);
}

let arrStr = JSON.stringify(merged, null, 8);
// 闭合 ] 对齐到 8 空格缩进
arrStr = arrStr.replace(/\n\]/, '\n        ]');

const newBlock = m[0]
  .replace(m[1], arrStr)
  .replace(/lastSync:[^\n,]*/, 'lastSync: new Date().toISOString(),');

fs.writeFileSync(appPath, src.replace(m[0], newBlock));
console.log('\n💾 已写入 js/app.js');
