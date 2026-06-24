// Simulate calcPerformanceScore logic to verify expected results
// Run with node directly - no browser needed

const juneRecords = [
  { name: '陈昕媛', sales: 31394, qty: 25, tickets: 22, hourlyOutput: 312 },
  { name: '杨子豪', sales: 34104, qty: 28, tickets: 21, hourlyOutput: 449 },
  { name: '李若彤', sales: 24016, qty: 22, tickets: 16, hourlyOutput: 273 },
  { name: '龚赟昊', sales: 22870, qty: 17, tickets: 16, hourlyOutput: 266 },
  { name: '王雅澜', sales: 19288, qty: 16, tickets: 12, hourlyOutput: 247 },
  { name: '孔祥宇', sales: 16371, qty: 17, tickets: 10, hourlyOutput: 177 },
  { name: '何秋烨', sales: 13568, qty: 16, tickets: 9, hourlyOutput: 165 },
  { name: '邓奇缘', sales: 10127, qty: 9, tickets: 7, hourlyOutput: 114 },
  { name: '朱凯赟', sales: 10958, qty: 11, tickets: 8, hourlyOutput: 146 },
  { name: '迟骋', sales: 9482, qty: 9, tickets: 5, hourlyOutput: 110 },
  { name: '田佳乐', sales: 6348, qty: 6, tickets: 5, hourlyOutput: 83 },
  { name: '王龙宇', sales: 5450, qty: 5, tickets: 4, hourlyOutput: 93 },
  { name: '王靳毓', sales: 14048, qty: 12, tickets: 9, hourlyOutput: 178 },
];

function calcHourlyScore(hourly) {
  if (hourly >= 300) return 5;
  if (hourly >= 210) return 4;
  if (hourly >= 150) return 3;
  if (hourly >= 100) return 2;
  return 1;
}

function calcUptScore(upt) {
  if (upt >= 1.5) return 5;
  if (upt >= 1.3) return 4;
  if (upt >= 1.1) return 3;
  if (upt >= 0.9) return 2;
  return 1;
}

console.log('=== Performance Score Simulation (时产 + UPT 各50%) ===\n');
console.log('Name        | 时产    | hourlyScore | UPT   | uptScore | Final');
console.log('-'.repeat(70));

juneRecords.forEach(r => {
  const upt = r.qty / r.tickets;
  const hScore = calcHourlyScore(r.hourlyOutput);
  const uScore = calcUptScore(upt);
  const final = parseFloat(((hScore + uScore) / 2).toFixed(1));
  console.log(
    `${r.name.padEnd(10)} | ¥${String(r.hourlyOutput).padStart(4)} | ${hScore}          | ${upt.toFixed(2).padEnd(5)} | ${uScore}        | ${final}`
  );
});

console.log('\n=== Comparison: Old (pure hourly) vs New (hourly+UPT) ===\n');
const oldScores = { '陈昕媛': 5, '杨子豪': 5, '李若彤': 4, '龚赟昊': 4, '王雅澜': 4, '孔祥宇': 3, '何秋烨': 3, '邓奇缘': 2, '朱凯赟': 2, '迟骋': 2, '田佳乐': 1, '王龙宇': 1, '王靳毓': 3 };

juneRecords.forEach(r => {
  const upt = r.qty / r.tickets;
  const hScore = calcHourlyScore(r.hourlyOutput);
  const uScore = calcUptScore(upt);
  const newScore = parseFloat(((hScore + uScore) / 2).toFixed(1));
  const old = oldScores[r.name];
  const diff = newScore - old;
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '=';
  console.log(`${r.name.padEnd(10)}: old=${old} → new=${newScore} ${arrow} (${diff > 0 ? '+' : ''}${diff})`);
});
