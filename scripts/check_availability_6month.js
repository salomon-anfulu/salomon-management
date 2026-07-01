// 检查 2026-06 工时支持评分计算
// 完整复现 calcAvailabilityScore 逻辑

const availability = {
  '2026-06': {
    data: {
      '陈昕媛': { total: 27, unavailable: ['6/15', '6/25', '6/26'], note: '', dates: null },
      '田佳乐': { total: 26, unavailable: ['6/1', '6/7', '6/13', '6/15'], note: '', dates: null },
      '迟骋':   { total: 26, unavailable: ['6/3', '6/9', '6/16', '6/30'], note: '', dates: null },
      '王靳毓': { total: 25, unavailable: ['6/3', '6/13', '6/14', '6/15', '6/18'], note: '', dates: null },
      '朱凯赟': { total: 24, unavailable: ['6/4', '6/5', '6/9', '6/15', '6/17', '6/30'], note: '', dates: null },
      '孔祥宇': { total: 29, unavailable: ['6/6'], note: '', dates: null },
      '邓奇缘': { total: 28, unavailable: ['6/5', '6/25'], note: '', dates: null },
      '杨子豪': { total: 26, unavailable: ['6/3', '6/11', '6/13', '6/14'], note: '', dates: null },
      '王雅澜': { total: 26, unavailable: ['6/13', '6/14', '6/15', '6/16'], note: '', dates: null },
      '李若彤': { total: 30, unavailable: [], note: '', dates: null },
      '王龙宇': { total: 10, unavailable: ['6/2','6/3','6/7','6/9','6/12','6/13','6/14','6/16','6/18','6/19','6/20','6/21','6/22','6/23','6/24','6/25','6/26','6/27','6/28','6/29','6/30'], note: '19日到30日出差，请假', dates: null },
      '何秋烨': { total: 23, unavailable: ['6/1', '6/8', '6/9', '6/13', '6/14', '6/15', '6/17'], note: '', dates: null },
      '龚赟昊': { total: 25, unavailable: ['6/1', '6/4', '6/8', '6/15', '6/17'], note: '', dates: null },
    }
  }
};

const shiftChanges = [
  { id: 2, applicant: '杨子豪', applyDate: '2026-06-01', target: '王靳毓' },
  { id: 3, applicant: '杨子豪', applyDate: '2026-06-06', target: '王雅澜' },
  { id: 4, applicant: '王靳毓', applyDate: '2026-06-09', target: '王龙宇' },
  { id: 5, applicant: '孔祥宇', applyDate: '2026-06-20', target: '王靳毓' },
  { id: 6, applicant: '王雅澜', applyDate: '2026-06-17', target: '何秋烨' },
  { id: 7, applicant: '何秋烨', applyDate: '2026-06-18', target: '邓奇缘' },
  { id: 8, applicant: '迟骋',   applyDate: '2026-06-19', target: '李若彤' },
  { id: 9, applicant: '田佳乐', applyDate: '2026-06-20', target: '龚赟昊' },
];

function calcAvailability(staffName, monthKey) {
  const monthData = availability[monthKey].data[staffName] || { total: 0, unavailable: [] };

  // Parse unavailable days
  const unavailableDays = new Set();
  if (monthData.dates && typeof monthData.dates === 'object') {
    Object.entries(monthData.dates).forEach(([dateKey, status]) => {
      if (status && status.available === false) {
        const dayNum = parseInt(String(dateKey).split('/')[1]);
        if (!isNaN(dayNum)) unavailableDays.add(dayNum);
      }
    });
  } else {
    (monthData.unavailable || []).forEach(d => {
      const dayNum = parseInt(String(d).split('/')[1]);
      if (!isNaN(dayNum)) unavailableDays.add(dayNum);
    });
  }

  // Compute weeks (Mon-Sun)
  const [yr, mn] = monthKey.split('-').map(Number);
  const totalDaysInMonth = new Date(yr, mn, 0).getDate();
  const weeks = [];
  let wkStart = new Date(yr, mn - 1, 1);
  const dow1 = wkStart.getDay() || 7;
  wkStart = new Date(yr, mn - 1, 1 - (dow1 - 1));

  while (true) {
    const wkEnd = new Date(wkStart);
    wkEnd.setDate(wkEnd.getDate() + 6);
    const ovStart = new Date(Math.max(wkStart.getTime(), new Date(yr, mn - 1, 1).getTime()));
    const ovEnd = new Date(Math.min(wkEnd.getTime(), new Date(yr, mn - 1, totalDaysInMonth).getTime()));
    if (ovStart > ovEnd) break;
    const daysIn = [];
    const weekendsIn = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dt = new Date(yr, mn - 1, d);
      if (dt >= wkStart && dt <= wkEnd) {
        daysIn.push(d);
        const ddow = dt.getDay();
        if (ddow === 0 || ddow === 6) weekendsIn.push(d);
      }
    }
    if (daysIn.length > 0) {
      weeks.push({
        name: 'W' + (weeks.length + 1),
        label: `${mn}/${daysIn[0]}-${mn}/${daysIn[daysIn.length-1]}`,
        days: daysIn,
        weekends: weekendsIn,
      });
    }
    wkStart.setDate(wkStart.getDate() + 7);
  }

  // Week results — 达标标准与供班总览一致
  const weekResults = weeks.map(w => {
    const availDays = w.days.filter(d => !unavailableDays.has(d)).length;
    const weekendAvail = w.weekends.some(d => !unavailableDays.has(d));
    const meetMinDays = w.days.length >= 5 ? availDays >= 4 : availDays >= w.days.length;
    const meetWeekend = w.weekends.length > 0 ? weekendAvail : true;
    const passed = meetMinDays && meetWeekend;
    return { ...w, availDays, weekendAvail, meetMinDays, meetWeekend, passed };
  });

  const passedCount = weekResults.filter(w => w.passed).length;
  const failedCount = weeks.length - passedCount;

  const BASE_SCORE = 5;
  const weekDeduction = failedCount * 1;
  const weekScore = Math.max(1, BASE_SCORE - weekDeduction);

  // Shift changes
  const monthShiftChanges = shiftChanges.filter(sc => (sc.applyDate || '').startsWith(monthKey));
  const applicantCount = monthShiftChanges.filter(sc => sc.applicant === staffName).length;
  const targetCount = monthShiftChanges.filter(sc => sc.target === staffName).length;

  const penalty = Math.max(0, applicantCount - 1) * 0.5;
  const bonus = Math.min(targetCount * 0.5, 1.0);
  let finalScore = Math.max(1, Math.min(5, weekScore - penalty + bonus));

  return {
    score: parseFloat(finalScore.toFixed(1)),
    weekScore,
    weekDeduction,
    failedCount,
    passedCount,
    totalWeeks: weeks.length,
    penalty,
    bonus,
    applicantCount,
    targetCount,
    weekDetails: weekResults,
    unavailableDays: [...unavailableDays].sort((a,b)=>a-b),
  };
}

console.log('===== 2026-06 工时支持评分详细检查 =====\n');
console.log('月份周拆分：');
const test = calcAvailability('李若彤', '2026-06');
test.weekDetails.forEach(w => {
  console.log(`  ${w.name}: ${w.label} | 月内${w.days.length}天(周末${w.weekends.length}天)`);
});
console.log('');

const names = Object.keys(availability['2026-06'].data);
const results = names.map(n => ({ name: n, ...calcAvailability(n, '2026-06') }));

results.sort((a, b) => b.score - a.score);

results.forEach(r => {
  console.log(`━━━ ${r.name} → ${r.score}分 ━━━`);
  console.log(`  不可供天数: [${r.unavailableDays.join(', ')}] (${r.unavailableDays.length}天)`);
  r.weekDetails.forEach(w => {
    const mark = w.passed ? '✅' : '❌';
    const reason = !w.passed ? (w.availDays < 4 ? `[天数不足:仅${w.availDays}天]` : '') + (!w.weekendAvail ? '[周末无供班]' : '') : '';
    console.log(`  ${w.name} ${w.label}: ${mark} 可供${w.availDays}天 | 周末${w.weekendAvail ? '有' : '无'} ${reason}`);
  });
  console.log(`  → 达标${r.passedCount}/${r.totalWeeks}周，扣${r.weekDeduction}分 → 周分${r.weekScore}`);
  console.log(`  → 换班: 申请${r.applicantCount}次(扣${r.penalty}) | 顶班${r.targetCount}次(加${r.bonus})`);
  console.log(`  → 最终: ${r.weekScore} - ${r.penalty} + ${r.bonus} = ${r.score}`);
  console.log('');
});
