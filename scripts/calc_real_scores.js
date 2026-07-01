#!/usr/bin/env node
/**
 * Replicate the dynamic scoring logic from pages.js
 * to get the REAL June 2026 scores for the PPT.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ========== Load app.js defaults ==========
const appJsPath = path.join(__dirname, '..', 'js', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf-8');

// Extract the defaults object using regex + vm
const defaultsMatch = appJsContent.match(/defaults:\s*\{/);
if (!defaultsMatch) throw new Error('Cannot find defaults in app.js');

const startIdx = defaultsMatch.index + defaultsMatch[0].length - 1;

// Find matching brace
let braceCount = 0;
let endIdx = -1;
let inString = false;
let stringChar = '';
let escape = false;

for (let i = startIdx; i < appJsContent.length; i++) {
  const ch = appJsContent[i];
  if (escape) { escape = false; continue; }
  if (ch === '\\') { escape = true; continue; }
  if (inString) {
    if (ch === stringChar) inString = false;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === '`') { inString = true; stringChar = ch; continue; }
  if (ch === '{') braceCount++;
  if (ch === '}') { braceCount--; if (braceCount === 0) { endIdx = i; break; } }
}

const defaultsCode = '(' + appJsContent.slice(startIdx, endIdx + 1) + ')';

// Evaluate in a sandbox
const sandbox = { new: (cls) => new cls(), Date };
const defaultsObj = vm.runInNewContext(defaultsCode, sandbox);

// ========== Store stub ==========
const Store = {
  _data: JSON.parse(JSON.stringify(defaultsObj)),
  get(key) { return this._data[key] !== undefined ? this._data[key] : []; },
};

// ========== Calc functions (copied from pages.js) ==========

function calcAvailabilityScore(staffName) {
  const availability = Store.get('availability');
  const shiftChanges = Store.get('shiftChanges') || [];
  let availData, monthKey;
  if (availability && availability.months) {
    monthKey = '2026-06';
    availData = (availability.months[monthKey]?.data?.[staffName]) || { total: 0, unavailable: [] };
  } else {
    monthKey = (availability && availability.month) || '2026-06';
    availData = (availability && availability.data?.[staffName]) || { total: 0, unavailable: [] };
  }
  const unavailableDays = new Set((availData.unavailable || []).map(d => parseInt(String(d).split('/')[1])));
  const [yr, mn] = [2026, 6];
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
    const daysIn = [], weekendsIn = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dt = new Date(yr, mn - 1, d);
      if (dt >= wkStart && dt <= wkEnd) {
        daysIn.push(d);
        const ddow = dt.getDay();
        if (ddow === 0 || ddow === 6) weekendsIn.push(d);
      }
    }
    if (daysIn.length > 0) weeks.push({ days: daysIn, weekends: weekendsIn });
    wkStart.setDate(wkStart.getDate() + 7);
  }
  const weekResults = weeks.map(w => {
    const availDays = w.days.filter(d => !unavailableDays.has(d)).length;
    const weekendAvail = w.weekends.some(d => !unavailableDays.has(d));
    return { availDays, weekendAvail, passed: availDays >= 4 && weekendAvail };
  });
  const failedCount = weekResults.filter(w => !w.passed).length;
  const weekScore = Math.max(1, 5 - failedCount);
  const applicantCount = shiftChanges.filter(sc => sc.applicant === staffName).length;
  const targetCount = shiftChanges.filter(sc => sc.target === staffName).length;
  const penalty = Math.max(0, applicantCount - 1) * 0.5;
  const bonus = Math.min(targetCount * 0.5, 1.0);
  const finalScore = Math.max(1, Math.min(5, weekScore - penalty + bonus));
  return { score: parseFloat(finalScore.toFixed(1)), weekScore, failedCount, penalty, bonus };
}

function calcPerformanceScore(staffName) {
  const perfData = Store.get('performanceData') || {};
  const june = perfData.june || {};
  const records = june.records || [];
  const record = records.find(r => r.name === staffName);
  if (!record) return { score: 3, hourly: 0, upt: 0, sales: 0, targetMet: false, hourlyScore: 0, uptScore: 0 };
  const hourly = record.hourlyOutput || 0;
  const qty = record.qty || 0;
  const tickets = record.tickets || 1;
  const upt = tickets > 0 ? qty / tickets : 0;
  const sales = record.sales || 0;
  let hourlyScore;
  if (hourly >= 300) hourlyScore = 5; else if (hourly >= 240) hourlyScore = 4;
  else if (hourly >= 180) hourlyScore = 3; else if (hourly >= 120) hourlyScore = 2; else hourlyScore = 1;
  let uptScore;
  if (upt >= 1.6) uptScore = 5; else if (upt >= 1.4) uptScore = 4;
  else if (upt >= 1.25) uptScore = 3; else if (upt >= 1.1) uptScore = 2; else uptScore = 1;
  const rawAvg = (hourlyScore + uptScore) / 2;
  const targetMet = sales >= 20000;
  const targetBonus = targetMet ? 0.5 : 0;
  const finalScore = Math.max(1, Math.min(5, parseFloat((rawAvg + targetBonus).toFixed(1))));
  return { score: finalScore, hourlyScore, uptScore, hourly, upt: parseFloat(upt.toFixed(2)), sales, qty, tickets, targetMet };
}

function calcCustomerReviewScore(staffName) {
  const reviews = Store.get('customerReviews') || [];
  const count = reviews.filter(r => r.staffName === staffName).length;
  let score;
  if (count === 0) score = 1; else if (count === 1) score = 2;
  else score = Math.min(5, 2 + 0.5 * (count - 1));
  return { score: parseFloat(score.toFixed(1)), count };
}

function getLinggongAttStats(staffName) {
  const lgData = Store.get('linggongAttendance') || { records: [] };
  let records = (lgData.records || []).filter(r => r.name === staffName);
  if (records.length === 0) {
    records = (lgData.records || []).filter(r => r.name && r.name.startsWith(staffName));
  }
  let missedPunch = 0, lateCount = 0, absentCount = 0;
  records.forEach(r => {
    const clockIn = r.signIn || r.clockIn || '';
    const clockOut = r.signOut || r.clockOut || '';
    if (clockIn === '缺卡' || clockOut === '缺卡') missedPunch++;
    if (r.status === '缺勤' || r.status === '取消') absentCount++;
    if (r.status === '打卡异常' || (r.lateMin || 0) > 0) lateCount++;
  });
  return { missedPunch, lateCount, absentCount };
}

function calcAttendanceScore(staffName) {
  const { lateCount, missedPunch, absentCount } = getLinggongAttStats(staffName);
  const punchDeduction = Math.max(0, missedPunch - 1);
  const lateDeduction = lateCount;
  const absentDeduction = absentCount * 2;
  const totalDeduction = punchDeduction + lateDeduction + absentDeduction;
  const score = Math.max(1, 5 - totalDeduction);
  return { score: parseFloat(score.toFixed(1)), lateCount, missedPunch, absentCount };
}

function getBehaviorData() {
  const allStaff = Store.get('staff').filter(s => s.dept === 'Service Team' && s.status === 'active');
  const names = allStaff.map(s => s.name);
  const doorSchedule = Store.get('doorSchedule') || [];
  const doorHours = {};
  doorSchedule.forEach(d => {
    (d.slots || []).forEach(s => {
      const m = (s.time || '').match(/(\d+):(\d+)-(\d+):(\d+)/);
      if (!m) return;
      let h = (parseInt(m[3]) + parseInt(m[4])/60) - (parseInt(m[1]) + parseInt(m[2])/60);
      if (h < 0) h += 24;
      doorHours[s.staff] = (doorHours[s.staff] || 0) + h;
    });
  });
  const storeSupport = Store.get('storeSupport') || [];
  const supportHours = {};
  storeSupport.forEach(r => {
    const m = (r.duration || '').match(/([\d.]+)\s*小时/);
    if (!m) return;
    supportHours[r.staff] = (supportHours[r.staff] || 0) + parseFloat(m[1]);
  });
  const avgDoor = names.reduce((s, n) => s + (doorHours[n] || 0), 0) / names.length;
  const avgSupport = names.reduce((s, n) => s + (supportHours[n] || 0), 0) / names.length;
  const ranking = names.map(name => ({
    name, door: doorHours[name] || 0, support: supportHours[name] || 0,
    total: (doorHours[name] || 0) + (supportHours[name] || 0),
  })).sort((a, b) => b.total - a.total);
  return { doorHours, supportHours, avgDoor, avgSupport, ranking };
}

function calcBehaviorScore(staffName, bd) {
  const door = bd.doorHours[staffName] || 0;
  const support = bd.supportHours[staffName] || 0;
  let score = 4.0;
  if (door < bd.avgDoor) score -= 0.5;
  if (support < bd.avgSupport) score -= 0.5;
  const rankIdx = bd.ranking.findIndex(r => r.name === staffName);
  let rankBonus = 0;
  if (rankIdx === 0) rankBonus = 1.0;
  else if (rankIdx === 1) rankBonus = 0.7;
  else if (rankIdx === 2) rankBonus = 0.4;
  score += rankBonus;
  score = Math.max(1, Math.min(5, parseFloat(score.toFixed(1))));
  return { score, door, support, rank: rankIdx + 1, rankBonus };
}

// ========== Calculate all ==========
const staffList = Store.get('staff').filter(s => s.dept === 'Service Team' && s.status === 'active');
const bd = getBehaviorData();

const results = staffList.map(s => {
  const avail = calcAvailabilityScore(s.name);
  const perf = calcPerformanceScore(s.name);
  const review = calcCustomerReviewScore(s.name);
  const attend = calcAttendanceScore(s.name);
  const behavior = calcBehaviorScore(s.name, bd);
  const scores = { availability: avail.score, performance: perf.score, behavior: behavior.score, attendance: attend.score, customerReview: review.score };
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 5;
  return { name: s.name, scores, avg: parseFloat(avg.toFixed(2)), avail, perf, review, attend, behavior };
});

results.sort((a, b) => b.avg - a.avg);

console.log('\n===== 6月表现评分（动态计算 - 系统真实数据）=====\n');
results.forEach((r, i) => {
  console.log(`#${i+1} ${r.name}: 综合 ${r.avg} 分`);
  console.log(`   工时=${r.scores.availability}  业绩=${r.scores.performance}  行为=${r.scores.behavior}  考勤=${r.scores.attendance}  好评=${r.scores.customerReview}`);
  console.log(`   时产=¥${r.perf.hourly}/h  UPT=${r.perf.upt}  销售=¥${r.perf.sales}  好评数=${r.review.count}`);
  if (r.attend.lateCount > 0) console.log(`   ⚠️ 迟到${r.attend.lateCount}次`);
  if (r.attend.absentCount > 0) console.log(`   ⚠️ 旷工${r.attend.absentCount}次`);
  if (r.attend.missedPunch > 0) console.log(`   ⚠️ 缺卡${r.attend.missedPunch}次`);
  console.log('');
});

const outputPath = path.join(__dirname, 'real_scores.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`JSON saved to: ${outputPath}`);
