/**
 * sync_linggong_to_app.js
 * 将 data/weekly_attendance_clean.json 的灵工打卡记录合并进 js/app.js 的 defaults.linggongAttendance.records
 *
 * 处理要点：
 *  1. 日期格式归一化：2026/07/07 -> 2026-07-07
 *  2. 字段映射：只保留 app.js 使用的 6 个字段（name/date/signIn/signOut/status/totalHours）
 *  3. 合并策略：以 name|date 为 key（不是 name|date|signIn|signOut），
 *     json 数据中已经是每人每天一条（CI脚本已做合并），直接覆盖 app.js 旧数据
 *  4. 排序：按 date + name 升序
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
  console.error('\u274c \u627e\u4e0d\u5230', jsonPath, '\u8bf7\u5148\u8fd0\u884c fetch_linggong.js \u6293\u53d6\u6570\u636e');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const newRaw = json.records || [];

// 2026/07/07 -> 2026-07-07
const normDate = d => (d ? String(d).replace(/\//g, '-') : d);

// 灵工 API 返回全名，系统统一用短名
const NAME_MAP = {
  '玛依拉·努尔夏提': '玛依拉',
  '祖白代·阿不利孜': '祖白代',
};
const normName = n => NAME_MAP[n] || n;

const mapRec = r => ({
  name: normName(r.name),
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
  console.error('\u274c \u672a\u5728 app.js \u4e2d\u5339\u914d\u5230 linggongAttendance.records');
  process.exit(1);
}
const existing = eval(m[1]);

// === 合并策略：以 name|date 为 key ===
// json 数据已经过 CI 脚本的每人每天一条合并处理
// 新数据覆盖旧数据（json 是权威来源）
const key = r => `${r.name}|${r.date}`;
const existingMap = new Map();
existing.forEach(r => existingMap.set(key(r), r));

let added = 0;
let updated = 0;
// v128 修复: 当源数据同名同天有多条（如"玛依拉"+"玛依拉·努尔夏提"被 NAME_MAP 归一后冲突），
// 应优先用"打卡正常 + signOut 非空"的完整记录，不能用"打卡进行中 signOut空"的残缺记录覆盖
const _recordScore = r => {
  // 评分：4 = 打卡正常+signOut非空（最完整）
  //       3 = 打卡正常+signOut空
  //       2 = 打卡异常+signOut非空
  //       1 = 打卡进行中（残缺）
  let s = 0;
  if (r.status === '打卡正常') s += 3;
  if (r.signOut) s += 1;
  return s;
};
mapped.forEach(r => {
  const k = key(r);
  if (existingMap.has(k)) {
    const old = existingMap.get(k);
    // v128: 高分覆盖低分；同分时新数据覆盖（保留最新）
    if (_recordScore(r) >= _recordScore(old)) {
      existingMap.set(k, r);
    }
    updated++;
  } else {
    existingMap.set(k, r);
    added++;
  }
});

// 同时检查 existing 中是否有同一天多条的残留（历史遗留），做二次合并
const dayGroups = new Map();
for (const r of existingMap.values()) {
  const k = key(r);
  if (!dayGroups.has(k)) dayGroups.set(k, []);
  dayGroups.get(k).push(r);
}
const merged = [];
for (const [k, recs] of dayGroups) {
  if (recs.length === 1) {
    merged.push(recs[0]);
  } else {
    // v128: 同一天多条 -> 优先用最高分（最完整）的那条；如有多条同分，合并取最早signIn/最晚signOut
    const bestScore = Math.max(...recs.map(_recordScore));
    const best = recs.filter(r => _recordScore(r) === bestScore);
    const signIns = best.map(r => r.signIn).filter(s => s && s !== '');
    const signOuts = best.map(r => r.signOut).filter(s => s && s !== '');
    const base = { ...best[0] };
    base.signIn = signIns.length > 0 ? signIns.sort()[0] : '';
    base.signOut = signOuts.length > 0 ? signOuts.sort().reverse()[0] : '';
    // 工时由 _calcNetHours 现算（v128 不再依赖 totalHours 字段）
    const _calcH = (si, so) => {
      if (!si || !so) return 0;
      const m1 = /(\d+):(\d+)/.exec(si);
      const m2 = /(\d+):(\d+)/.exec(so);
      if (!m1 || !m2) return 0;
      const t1 = parseInt(m1[1],10)*60 + parseInt(m1[2],10);
      let t2 = parseInt(m2[1],10)*60 + parseInt(m2[2],10);
      if (t2 < t1) t2 += 24*60;
      const raw = (t2 - t1)/60;
      return raw > 6 ? raw - 1 : raw;
    };
    base.totalHours = String(Math.round(_calcH(base.signIn, base.signOut) * 10) / 10);
    base.status = best[0].status || '打卡正常';
    merged.push(base);
  }
}

merged.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

const dates = [...new Set(merged.map(r => r.date))].sort();
console.log(`\u{1f4ca} \u73b0\u6709 ${existing.length} \u6761`);
console.log(`\u{1f4e5} json \u5019\u9009 ${mapped.length} \u6761`);
console.log(`\u2795 \u65b0\u589e ${added} \u6761`);
console.log(`\u{1f501} \u66f4\u65b0 ${updated} \u6761\uff08\u5408\u5e76\u540e\u7684\u8bb0\u5f55\u8986\u76d6\u65e7\u6570\u636e\uff09`);
console.log(`\u2705 \u5408\u5e76\u540e ${merged.length} \u6761`);
console.log(`\u{1f4c5} \u65e5\u671f\u8303\u56f4: ${dates[0]} ~ ${dates[dates.length - 1]}`);

if (DRY) {
  console.log('\n[dry] \u672a\u5199\u5165\u6587\u4ef6');
  process.exit(0);
}

let arrStr = JSON.stringify(merged, null, 8);
arrStr = arrStr.replace(/\n\]/, '\n        ]');

const newBlock = m[0]
  .replace(m[1], arrStr)
  .replace(/lastSync:[^\n]*/, 'lastSync: new Date().toISOString(),');

fs.writeFileSync(appPath, src.replace(m[0], newBlock));
console.log('\n\u{1f4be} \u5df2\u5199\u5165 js/app.js');
