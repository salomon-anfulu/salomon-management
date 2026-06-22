const fs = require('fs');

const appJsPath = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/js/app.js';
const lgDataPath = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/weekly_attendance_clean.json';

let code = fs.readFileSync(appJsPath, 'utf8');
const lgData = JSON.parse(fs.readFileSync(lgDataPath, 'utf8'));

// ============================================================
// 1. UPDATE LINGGONG ATTENDANCE
// ============================================================
console.log('=== 1. Updating Linggong Attendance ===');

// Get only June records
const juneRecords = lgData.records.filter(r => r.date.startsWith('2026/06'));
console.log(`  June records: ${juneRecords.length} (was 186)`);

// Build new records array in app.js format
const newRecords = juneRecords.map(r => {
  const fields = {
    name: r.name,
    date: r.date,
    scheduleTime: r.scheduleTime || '-',
    restTime: r.restTime || '-',
    clockInTime: r.clockInTime || '-',
    signIn: r.signIn || '-',
    signOut: r.signOut || '-',
    status: r.status || '-',
    totalHours: r.totalHours || 0,
    scheduleHours: r.scheduleHours || 0,
    lateMin: r.lateMin || 0,
    leaveMin: r.leaveMin || 0,
    department: r.department || '',
    project: r.project || '',
    phone: r.phone || ''
  };
  return '      { "name": "' + fields.name + '", "date": "' + fields.date + '", "scheduleTime": "' + fields.scheduleTime + '", "restTime": "' + fields.restTime + '", "clockInTime": "' + fields.clockInTime + '", "signIn": "' + fields.signIn + '", "signOut": "' + fields.signOut + '", "status": "' + fields.status + '", "totalHours": ' + fields.totalHours + ', "scheduleHours": ' + fields.scheduleHours + ', "lateMin": ' + fields.lateMin + ', "leaveMin": ' + fields.leaveMin + ', "department": "' + fields.department + '", "project": "' + fields.project + '", "phone": "' + fields.phone + '" }';
}).join(',\n');

// Replace the records array
const recordsStart = code.indexOf('records: [', code.indexOf('linggongAttendance'));
const recordsEnd = code.indexOf('\n      ]', recordsStart) + '\n      ]'.length;
const oldRecordsBlock = code.substring(recordsStart, recordsEnd);
code = code.substring(0, recordsStart) + 'records: [\n' + newRecords + '\n      ]' + code.substring(recordsEnd);
console.log('  ✅ Linggong records updated');

// Update lastSync
code = code.replace(
  /lastSync: '[^']*'/,
  "lastSync: '" + lgData.fetchedAt + "'"
);
console.log('  ✅ lastSync updated to', lgData.fetchedAt);

// ============================================================
// 2. UPDATE VERSION & THRESHOLDS
// ============================================================
console.log('\n=== 2. Updating version markers ===');
code = code.replace(/_dataVersion: '[^']*'/, "_dataVersion: '2026-06-22-v17'");
code = code.replace(/DATA_VERSION = '[^']*'/, "DATA_VERSION = '2026-06-22-v17'");
code = code.replace(
  /isOutdatedLG = lgData\.records && lgData\.records\.length < \d+/,
  'isOutdatedLG = lgData.records && lgData.records.length < ' + juneRecords.length
);
console.log('  ✅ Version → v17, LG threshold →', juneRecords.length);

// ============================================================
// 3. UPDATE DOOR SCHEDULE (6/21-6/22)
// ============================================================
console.log('\n=== 3. Checking door schedule ===');

// From Tencent Docs CSV data, the 6/21 and 6/22 door schedule columns
// Column header "2026/6/21" and "2026/6/22" in the door schedule section
// Looking at the data: 6/21 has NO door entries (all empty)
// 6/22 has NO door entries (all empty)
// The last door schedule entries are for 6/20
console.log('  6/21 and 6/22 have no door schedule in Tencent Docs → skipping');

// ============================================================
// 4. CALCULATE ATTENDANCE SCORES FROM LINGGONG DATA
// ============================================================
console.log('\n=== 4. Calculating attendance from linggong data ===');

// Count lateness per Service Team member in June
const serviceTeamNames = ['陈昕媛','田佳乐','迟骋','王靳毓','朱凯赟','孔祥宇','邓奇缘','杨子豪','王雅澜','李若彤','王龙宇','何秋烨','龚赟昊'];

const attendanceStats = {};
serviceTeamNames.forEach(name => {
  attendanceStats[name] = { late: 0, absent: 0, missing: 0, cancel: 0, days: 0, hours: 0 };
});

juneRecords.forEach(r => {
  if (!serviceTeamNames.includes(r.name)) return;
  const s = attendanceStats[r.name];
  s.days++;
  s.hours += (r.totalHours || 0);
  if (r.lateMin && r.lateMin > 0) s.late++;
  if (r.status === '取消') s.cancel++;
  if (r.status && r.status.includes('缺卡')) s.missing++;
  if (r.status && r.status.includes('旷工')) s.absent++;
});

console.log('  Attendance stats:');
Object.entries(attendanceStats).forEach(([name, s]) => {
  const score = Math.max(1, 5 - s.late - s.missing - s.absent * 2);
  console.log(`    ${name}: ${s.days}天/${s.hours}h, 迟到${s.late}次, 缺卡${s.missing}次, 旷工${s.absent}次 → att=${score}`);
  attendanceStats[name].score = score;
});

// ============================================================
// 5. CALCULATE DOOR COUNTS FROM CURRENT DATA
// ============================================================
console.log('\n=== 5. Door counts (from Tencent Docs) ===');

// From the Tencent Docs data, the 异常考勤数据记录表 has doorCount per person:
// 陈昕媛:17, 田佳乐:17, 迟骋:14, 王靳毓:16, 朱凯赟:13, 孔祥宇:18, 邓奇缘:18,
// 杨子豪:11, 王雅澜:13, 李若彤:17, 王龙宇:13, 何秋烨:17, 龚赟昊:15
// Note: These include 6/20 data but NOT 6/21 (no door scheduled)
const doorCounts = {
  '陈昕媛': 17, '田佳乐': 17, '迟骋': 14, '王靳毓': 16, '朱凯赟': 13,
  '孔祥宇': 18, '邓奇缘': 18, '杨子豪': 11, '王雅澜': 13, '李若彤': 17,
  '王龙宇': 13, '何秋烨': 17, '龚赟昊': 15
};
console.log('  Door counts unchanged (no new 6/21-22 door schedules)');

// ============================================================
// 6. UPDATE RATINGS
// ============================================================
console.log('\n=== 6. Updating ratings ===');

// Current performance scores from v15 (unchanged - based on sales data)
const perfScores = {
  '陈昕媛': 5, '田佳乐': 1, '迟骋': 1, '王靳毓': 1, '朱凯赟': 1,
  '孔祥宇': 4, '邓奇缘': 2, '杨子豪': 5, '王雅澜': 4, '李若彤': 4,
  '王龙宇': 1, '何秋烨': 4, '龚赟昊': 4
};

// Behavior scores based on door count: ≥10=5, ≥7=4, ≥4=4, ≥2=3
function behaviorScore(dc) {
  if (dc >= 10) return 5;
  if (dc >= 7) return 4;
  if (dc >= 4) return 4;
  if (dc >= 2) return 3;
  return 2;
}

// Customer review scores: 5 if has review, else 4
const crScores = {
  '陈昕媛': 5, '迟骋': 5, '朱凯赟': 5, '李若彤': 5,
  // others: 4
};

// Availability scores (dynamic, static fallback) - unchanged
const availScores = {};
serviceTeamNames.forEach(n => availScores[n] = 5);

// staffId mapping
const staffIdMap = {
  1: '陈昕媛', 2: '田佳乐', 3: '迟骋', 4: '王靳毓', 5: '朱凯赟',
  6: '孔祥宇', 7: '邓奇缘', 8: '杨子豪', 9: '王雅澜', 10: '李若彤',
  11: '王龙宇', 12: '何秋烨', 13: '龚赟昊'
};

// Perf data for comments
const perfData = {
  '陈昕媛': { sales: 30316, hourlyOutput: 337, qty: 24 },
  '田佳乐': { sales: 6348, hourlyOutput: 90, qty: 6 },
  '迟骋': { sales: 5490, hourlyOutput: 89, qty: 5 },
  '王靳毓': { sales: 4180, hourlyOutput: 72, qty: 5 },
  '朱凯赟': { sales: 4072, hourlyOutput: 70, qty: 4 },
  '孔祥宇': { sales: 16371, hourlyOutput: 210, qty: 17 },
  '邓奇缘': { sales: 10127, hourlyOutput: 122, qty: 9 },
  '杨子豪': { sales: 24320, hourlyOutput: 395, qty: 20 },
  '王雅澜': { sales: 16974, hourlyOutput: 276, qty: 13 },
  '李若彤': { sales: 24016, hourlyOutput: 291, qty: 22 },
  '王龙宇': { sales: 5450, hourlyOutput: 93, qty: 5 },
  '何秋烨': { sales: 10576, hourlyOutput: 212, qty: 12 },
  '龚赟昊': { sales: 12676, hourlyOutput: 235, qty: 12 }
};

// Build new ratings block
let ratingsLines = ['ratings: ['];
for (let sid = 1; sid <= 13; sid++) {
  const name = staffIdMap[sid];
  const attStats = attendanceStats[name];
  const avail = availScores[name];
  const perf = perfScores[name];
  const beh = behaviorScore(doorCounts[name]);
  const att = attStats.score;
  const cr = crScores[name] || 4;
  const avg = Math.round((avail + perf + beh + att + cr) / 5 * 10) / 10;
  const hr = avg >= 4.0 ? 60 : 28;
  const p = perfData[name];
  
  // Build comment
  const parts = [`6月${attStats.days}天出勤${Math.round(attStats.hours)}h`];
  if (attStats.late > 0) parts.push(`迟到${attStats.late}次`);
  if (doorCounts[name] > 0) {
    parts.push(`门迎${doorCounts[name]}次`);
  } else {
    parts.push('未排门迎');
  }
  parts.push(`销售¥${p.sales.toLocaleString()}时产¥${p.hourlyOutput}/h`);
  
  // Category string (simplified)
  const catMap = {
    '陈昕媛': '鞋履82.9% / 服装10.5% / 配件6.5%',
    '田佳乐': '鞋履80.2% / 服装12.6% / 配件7.2%',
    '迟骋': '鞋履90.9% / 服装9.1%',
    '王靳毓': '服装45.3% / 鞋履31.1% / 配件23.6%',
    '朱凯赟': '鞋履68.7% / 其他29.4% / 配件1.9%',
    '孔祥宇': '鞋履62.2% / 服装32.9% / 其他4.9%',
    '邓奇缘': '鞋履91.1% / 服装7.9% / 配件1.1%',
    '杨子豪': '鞋履91.8% / 服装7.8% / 配件0.4%',
    '王雅澜': '鞋履87.1% / 其他10.0% / 服装2.9%',
    '李若彤': '鞋履87.3% / 服装4.1% / 配件4.0% / 其他4.6%',
    '王龙宇': '鞋履93.4% / 配件6.6%',
    '何秋烨': '鞋履68.9% / 服装17.0% / 配件14.1%',
    '龚赟昊': '鞋履79.6% / 服装20.4%'
  };
  parts.push(`品类(${catMap[name]})`);
  
  // Customer review count
  const reviewCounts = { '陈昕媛': 1, '迟骋': 4, '朱凯赟': 2, '李若彤': 1 };
  if (reviewCounts[name]) {
    parts.push(`大众点评好评${reviewCounts[name]}条`);
  }
  
  const comment = parts.join('，');
  
  ratingsLines.push('    {');
  ratingsLines.push(`      "id": ${sid},`);
  ratingsLines.push(`      "staffId": ${sid},`);
  ratingsLines.push(`      "month": "2026-06",`);
  ratingsLines.push(`      "scores": {`);
  ratingsLines.push(`        "availability": ${avail},`);
  ratingsLines.push(`        "performance": ${perf},`);
  ratingsLines.push(`        "behavior": ${beh},`);
  ratingsLines.push(`        "attendance": ${att},`);
  ratingsLines.push(`        "customerReview": ${cr}`);
  ratingsLines.push(`      },`);
  ratingsLines.push(`      "comment": "${comment}",`);
  ratingsLines.push(`      "avgScore": ${avg},`);
  ratingsLines.push(`      "hourlyRate": ${hr}`);
  ratingsLines.push(`    },`);
}
// Remove trailing comma
ratingsLines[ratingsLines.length - 1] = ratingsLines[ratingsLines.length - 1].replace(/,$/, '');
ratingsLines.push('    ],');

const newRatings = ratingsLines.join('\n');

// Replace ratings in code
const rStart = code.indexOf('ratings: [');
const rEnd = code.indexOf('\n    ],', rStart) + '\n    ],'.length;
code = code.substring(0, rStart) + newRatings + code.substring(rEnd);
console.log('  ✅ Ratings updated');

// Save
fs.writeFileSync(appJsPath, code);
console.log('\n✅ All updates applied to app.js');

// Print summary
console.log('\n=== SUMMARY ===');
console.log('Linggong:', juneRecords.length, 'records (was 186)');
console.log('New dates: 6/21 (11 people, 85h)');
for (let sid = 1; sid <= 13; sid++) {
  const name = staffIdMap[sid];
  const s = attendanceStats[name];
  const avg = Math.round((availScores[name] + perfScores[name] + behaviorScore(doorCounts[name]) + s.score + (crScores[name]||4)) / 5 * 10) / 10;
  console.log(`  ${name}: att=${s.score} (${s.days}天/${Math.round(s.hours)}h, 迟到${s.late}) avg=${avg}`);
}
