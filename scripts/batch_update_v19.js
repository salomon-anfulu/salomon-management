const fs = require('fs');

// Read the latest linggong data
const lgData = JSON.parse(fs.readFileSync('data/weekly_attendance_clean.json', 'utf8'));

// Read app.js
let code = fs.readFileSync('js/app.js', 'utf8');

// ============================================================
// 1. UPDATE LINGGONG ATTENDANCE (200 → 208 records)
// ============================================================

// Extract all June records from the JSON
const juneRecords = lgData.records.filter(r => r.date.startsWith('2026/06'));
console.log(`Linggong June records: ${juneRecords.length}`);

// Build new linggongAttendance records block
const newRecords = juneRecords.map(r => {
  const name = r.name;
  const date = r.date.replace(/\//g, '-');
  return `        { "name": "${name}", "date": "${date}", "signIn": "${r.signIn || ''}", "signOut": "${r.signOut || ''}", "status": "${r.status || '考勤正常'}", "totalHours": "${r.totalHours || 0}" }`;
}).join(',\n');

// Find the linggongAttendance block boundaries
const lgStart = code.indexOf('linggongAttendance: {');
const lgRecordsStart = code.indexOf('records: [', lgStart);
const lgRecordsEnd = code.indexOf('],', lgRecordsStart + 10);

// Extract old records area
const beforeRecords = code.substring(0, lgRecordsStart + 'records: ['.length);
const afterRecords = code.substring(lgRecordsEnd);

// Rebuild: records: [\n ...new...\n      ],
const newLgBlock = `${beforeRecords}\n${newRecords}\n      ${afterRecords}`;
code = newLgBlock;

// Update lastSync
code = code.replace(
  /lastSync: '[^']*'/,
  `lastSync: '${new Date().toISOString()}'`
);

console.log('✓ Linggong attendance updated');

// ============================================================
// 2. ADD STORE SUPPORT RECORD id 75 (龚赟昊 6/20 发售核销5h)
// ============================================================

// Find the storeSupport closing bracket and add id 75 before it
const supportOld = `      { id: 74, staff: '朱凯赟', date: '2026-06-20', type: '货品-整理仓库', duration: '0.5小时', detail: '辅助陈列归货品' },\n    ],`;
const supportNew = `      { id: 74, staff: '朱凯赟', date: '2026-06-20', type: '货品-整理仓库', duration: '0.5小时', detail: '辅助陈列归货品' },\n      { id: 75, staff: '龚赟昊', date: '2026-06-20', type: '货品-辅助收货', duration: '5小时', detail: '发售核销' },\n    ],`;

if (code.includes(supportOld)) {
  code = code.replace(supportOld, supportNew);
  console.log('✓ Store support id 75 added (龚赟昊 发售核销5h)');
} else {
  console.log('⚠ Could not find support id 74 closing to add id 75');
}

// ============================================================
// 3. UPDATE STAFFSTATS DOOR COUNTS (from authoritative PT doc)
// ============================================================

const doorCounts = {
  '陈昕媛': 18,
  '田佳乐': 17,
  '迟骋': 16,
  '王靳毓': 16,
  '朱凯赟': 15,
  '孔祥宇': 18,
  '邓奇缘': 20,
  '杨子豪': 11,
  '王雅澜': 13,
  '李若彤': 17,
  '王龙宇': 13,
  '何秋烨': 17,
  '龚赟昊': 16,
};

for (const [name, count] of Object.entries(doorCounts)) {
  // Match: 'NAME': { doorCount: OLD, ... }
  const regex = new RegExp(`('${name}'): \\{ doorCount: \\d+`);
  const match = code.match(regex);
  if (match) {
    code = code.replace(regex, `$1: { doorCount: ${count}`);
    console.log(`  ${name}: doorCount → ${count}`);
  }
}
console.log('✓ StaffStats door counts updated');

// ============================================================
// 4. UPDATE VERSION
// ============================================================

code = code.replace(
  /_dataVersion: '[^']*'/,
  `_dataVersion: '2026-06-23-v19'`
);
code = code.replace(
  /const isOutdatedLG = lgData\.records && lgData\.records\.length < \d+/,
  `const isOutdatedLG = lgData.records && lgData.records.length < 208`
);
code = code.replace(
  /const DATA_VERSION = '[^']*'/,
  `const DATA_VERSION = '2026-06-23-v19'`
);

console.log('✓ Version updated to v19');

// Write back
fs.writeFileSync('js/app.js', code);
console.log('\n✅ Batch update v19 complete!');
console.log(`   Linggong: ${juneRecords.length} records`);
console.log(`   Support: 75 records (added id 75)`);
console.log(`   Door counts: updated from PT doc`);
