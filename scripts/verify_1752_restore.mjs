// scripts/verify_1752_restore.mjs
// 把 js/pages.js 真实的 5 维评分函数 + 依赖，套在 17:23 导出上跑，
// 验证 17:23 导出整体算出来是否就是 17:52 截图的 4.2 / 4.2 / 4.1。
//
// 用法：node scripts/verify_1752_restore.mjs

import fs from 'fs';
import path from 'path';

const EXPORT_PATH = '/Users/a86137/Downloads/salomon-backup-20260803-1723.json';
const TARGET = {
  '王雅澜': 4.2,
  '龚赟昊': 4.2,
  '孔祥宇': 4.1,
};

const exportDoc = JSON.parse(fs.readFileSync(EXPORT_PATH, 'utf8'));
const DATA = exportDoc.data;
const SCORING_MONTH = '2026-07';

// ===== Store shim =====（只暴露 calc 函数实际用到的接口）
const Store = {
  get(key) { return DATA[key]; },
  getList(key) { return DATA[key] || []; },
  getStaff(id) {
    const arr = DATA.staff || [];
    return arr.find(s => String(s.id) === String(id)) || null;
  },
  getStaffName(id) {
    const s = this.getStaff(id);
    return s ? s.name : '';
  },
};

// ===== isManagementStaff（直接从 app.js 拷贝） =====
function isManagementStaff(s) {
  if (!s) return false;
  const name = (s.name || '').toLowerCase();
  if (name.includes('管理员') || name === 'admin') return true;
  const email = (s.email || '').toLowerCase();
  if (email.includes('admin')) return true;
  if (s.dept === '管理' || s.dept === 'Admin') return true;
  if (s.role === 'admin' || s.role === 'manager') return true;
  return false;
}

// ===== helpers（直接从 pages.js 拷贝） =====
function _ymKey(y, m) { return `${y}-${String(m).padStart(2,'0')}`; }

function _monthKeyToPerfKey(ym) {
  if (!ym || typeof ym !== 'string') return null;
  const parts = ym.split('-');
  if (parts.length !== 2) return null;
  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const m = parseInt(parts[1]);
  if (m >= 1 && m <= 12) return monthNames[m - 1];
  return null;
}

function _monthNum(ym, fallback) {
  if (!ym || typeof ym !== 'string') return fallback || (new Date().getMonth() + 1);
  const parts = ym.split('-');
  if (parts.length < 2) return fallback || (new Date().getMonth() + 1);
  const n = parseInt(parts[1]);
  return isNaN(n) ? (fallback || (new Date().getMonth() + 1)) : n;
}

function _yearNum(ym, fallback) {
  if (!ym || typeof ym !== 'string') return fallback || new Date().getFullYear();
  const parts = ym.split('-');
  if (parts.length < 1) return fallback || new Date().getFullYear();
  const n = parseInt(parts[0]);
  return isNaN(n) ? (fallback || new Date().getFullYear()) : n;
}

function _parseYM(ym, fallbackY, fallbackM) {
  const y = _yearNum(ym, fallbackY);
  const m = _monthNum(ym, fallbackM);
  return [y, m];
}

function _daysInMonth(year, month) {
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    return isLeap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function _calcNetHours(record) {
  if (!record) return 0;
  const si = record.signIn || '';
  const so = record.signOut || '';
  if (!si || !so) return 0;
  const m1 = /(\d+):(\d+)/.exec(si);
  const m2 = /(\d+):(\d+)/.exec(so);
  if (!m1 || !m2) return 0;
  const t1 = parseInt(m1[1], 10) * 60 + parseInt(m1[2], 10);
  let t2 = parseInt(m2[1], 10) * 60 + parseInt(m2[2], 10);
  if (t2 < t1) t2 += 24 * 60;
  const raw = (t2 - t1) / 60;
  return raw > 6 ? raw - 1 : raw;
}

function _calcPersonMonthHours(records, personName, yearMonth, opts) {
  if (!records || !records.length) return { days: 0, hours: 0 };
  opts = opts || {};
  const _norm = (n) => {
    if (!n) return n;
    if (n.indexOf('玛依拉') >= 0) return '玛依拉';
    if (n.indexOf('祖白代') >= 0) return '祖白代';
    return String(n).replace(/[*\s]+$/, '');
  };
  const _matchName = (recName) => {
    const rn = _norm(recName);
    if (rn === personName) return true;
    if (rn && personName && (rn.indexOf(personName) >= 0 || personName.indexOf(rn) >= 0)) return true;
    return false;
  };
  const monthRecs = records.filter(r => {
    if (!_matchName(r.name)) return false;
    const d = r.date || '';
    if (!d.startsWith(yearMonth)) return false;
    if (opts.excludeToday && d === opts.excludeToday) return false;
    return true;
  });
  const byKey = new Map();
  monthRecs.forEach(r => {
    const key = r.date;
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, r);
    else if (r.status === '打卡正常' && prev.status !== '打卡正常') byKey.set(key, r);
  });
  let totalHours = 0;
  byKey.forEach(r => { totalHours += _calcNetHours(r); });
  return { days: byKey.size, hours: Math.round(totalHours * 10) / 10 };
}

function _buildMonthWeeks(monthKey) {
  const [year, mon] = _parseYM(monthKey, 2026, new Date().getMonth()+1);
  const totalDays = new Date(year, mon, 0).getDate();
  const weeks = [];
  let wkStart = new Date(year, mon - 1, 1);
  const dow = wkStart.getDay() || 7;
  wkStart = new Date(year, mon - 1, 1 - (dow - 1));
  while (true) {
    const wkEnd = new Date(wkStart);
    wkEnd.setDate(wkEnd.getDate() + 6);
    const ovStart = new Date(Math.max(wkStart.getTime(), new Date(year, mon - 1, 1).getTime()));
    const ovEnd = new Date(Math.min(wkEnd.getTime(), new Date(year, mon - 1, totalDays).getTime()));
    if (ovStart > ovEnd) break;
    const days = [];
    const weekends = [];
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(year, mon - 1, d);
      if (dt >= wkStart && dt <= wkEnd) {
        days.push(d);
        const ddow = dt.getDay();
        if (ddow === 0 || ddow === 6) weekends.push(d);
      }
    }
    if (days.length > 0) weeks.push({ days, weekends, startDay: days[0], endDay: days[days.length - 1], daysCount: days.length });
    wkStart.setDate(wkStart.getDate() + 7);
  }
  return weeks;
}

// ===== MonthConfig（拷贝 pages.js 59-124） =====
const MonthConfig = {
  rules: {
    '2026-04': { skipWeeks: 0 },
    '2026-05': { skipWeeks: 0 },
    '2026-06': { skipWeeks: 0 },
    '2026-07': { skipWeeks: 2 },
    '2026-08': { skipWeeks: 0 },
  },
  getSkipWeeks(monthKey) {
    const rule = this.rules[monthKey];
    return (rule && typeof rule.skipWeeks === 'number') ? rule.skipWeeks : 0;
  },
  hasSkipWeeks(monthKey) { return this.getSkipWeeks(monthKey) > 0; },
  getActiveScoringMonth() {
    // 验证用：硬编码 2026-07（避免 new Date 受运行时刻影响）
    return '2026-07';
  },
  getAvailablePerfMonths() { return []; },
};

// ===== SCORE_THRESHOLDS（拷贝 pages.js 318-356） =====
const SCORE_THRESHOLDS = {
  lowTicketsGate: 5,
  hourly: [
    { min: 300, score: 5 }, { min: 240, score: 4 }, { min: 180, score: 3 }, { min: 120, score: 2 }, { min: 0, score: 1 },
  ],
  upt: [
    { min: 1.6, score: 5 }, { min: 1.4, score: 4 }, { min: 1.25, score: 3 }, { min: 1.1, score: 2 }, { min: 0, score: 1 },
  ],
  sales: { target: 20000, tier2: 30000, step: 2000 },
  availability: { baseScore: 5, deductionPerWeek: 1, minDaysLongWeek: 4 },
  behavior: { baseScore: 4, bonus: 1, penalty: 1 },
};

// ===== 5 维计算函数（拷贝 pages.js） =====
function calcAvailabilityScore(staffName) {
  const availability = Store.get('availability');
  const shiftChanges = Store.get('shiftChanges') || [];
  const T_avail = SCORE_THRESHOLDS.availability;
  const scoreMonth = SCORING_MONTH;

  let availData;
  let monthKey;
  if (availability && availability.months) {
    monthKey = scoreMonth;
    availData = (availability.months[monthKey] && availability.months[monthKey].data && availability.months[monthKey].data[staffName]) || { total: 0, unavailable: [] };
  } else {
    monthKey = (availability && availability.month) || '2026-06';
    availData = (availability && availability.data && availability.data[staffName]) || { total: 0, unavailable: [] };
  }

  const availableDaysSet = new Set();
  const availMonNum = _monthNum(monthKey);
  if (availData.dates && typeof availData.dates === 'object') {
    Object.entries(availData.dates).forEach(([dateKey, status]) => {
      if (status && status._deleted) return;
      if (status && status.available === true) {
        const dayNum = parseInt(String(dateKey).split('/')[1]);
        if (!isNaN(dayNum)) availableDaysSet.add(dayNum);
      }
    });
  } else {
    const _yr2 = _yearNum(monthKey);
    const _mn2 = _monthNum(monthKey);
    const _totalDaysInMonth = _daysInMonth(_yr2, _mn2);
    const _unavailableSet = new Set();
    (availData.unavailable || []).forEach(d => {
      const dayNum = parseInt(String(d).split('/')[1]);
      if (!isNaN(dayNum)) _unavailableSet.add(dayNum);
    });
    for (let d = 1; d <= _totalDaysInMonth; d++) {
      if (!_unavailableSet.has(d)) availableDaysSet.add(d);
    }
  }

  const [yr, mn] = _parseYM(monthKey);
  const _allWeeks = _buildMonthWeeks(monthKey);
  const _skipWk = MonthConfig.getSkipWeeks(monthKey);
  const _filteredWeeks = _allWeeks.slice(_skipWk);
  const weeks = _filteredWeeks.map((w, i) => ({
    name: 'W' + (i + 1),
    label: `${mn}/${w.days[0]}-${mn}/${w.days[w.days.length - 1]}`,
    days: w.days,
    weekends: w.weekends,
  }));

  const weekResults = weeks.map(w => {
    const availDays = w.days.filter(d => availableDaysSet.has(d)).length;
    const weekendAvail = w.weekends.some(d => availableDaysSet.has(d));
    const meetMinDays = w.days.length >= 5 ? availDays >= T_avail.minDaysLongWeek : availDays >= w.days.length;
    const meetWeekend = w.weekends.length > 0 ? weekendAvail : true;
    const passed = meetMinDays && meetWeekend;
    return { ...w, availDays, weekendAvail, meetMinDays, meetWeekend, passed };
  });

  const passedCount = weekResults.filter(w => w.passed).length;
  const failedCount = weeks.length - passedCount;
  const BASE_SCORE = T_avail.baseScore;
  const weekDeduction = failedCount * T_avail.deductionPerWeek;
  const weekScore = Math.max(1, BASE_SCORE - weekDeduction);

  const monthShiftChanges = shiftChanges.filter(sc => (sc.applyDate || '').startsWith(scoreMonth));
  const applicantCount = monthShiftChanges.filter(sc => sc.applicant === staffName).length;
  const targetCount = monthShiftChanges.filter(sc => sc.target === staffName).length;

  const penalty = Math.max(0, applicantCount - 1) * 0.5;
  const bonus = Math.min(targetCount * 0.5, 1.0);

  let finalScore = Math.max(1, Math.min(5, weekScore - penalty + bonus));

  return {
    score: parseFloat(finalScore.toFixed(1)),
    weekScore, penalty, bonus, finalScore,
    passedCount, failedCount,
  };
}

function calcPerformanceScore(staffName) {
  const perfData = Store.get('performanceData') || {};
  const scoreMonth = SCORING_MONTH;
  const perfKey = _monthKeyToPerfKey(scoreMonth) || 'july';
  const monthData = perfData[perfKey] || {};
  const records = monthData.records || [];
  const record = records.find(r => r.name === staffName);
  const T = SCORE_THRESHOLDS;
  const SALES_TARGET = T.sales.target;

  if (!record) return { score: 1, fallback: true };

  const hourly = record.hourlyOutput || 0;
  const qty = record.qty || 0;
  const rawTickets = record.tickets;
  const ticketsMissing = rawTickets === undefined || rawTickets === null;
  const tickets = ticketsMissing ? 0 : rawTickets;
  const upt = tickets > 0 ? qty / tickets : 0;
  const sales = record.sales || 0;

  if (!ticketsMissing && tickets <= T.lowTicketsGate) {
    return { score: 1, hourly, upt, sales, qty, tickets, workHours: record.workHours || 0, lowTickets: true };
  }

  let workHours = record.workHours || 0;
  if (workHours === 0 && sales > 0) {
    const lgData = Store.get('linggongAttendance') || {};
    const allLgRecords = lgData.records || [];
    const r = _calcPersonMonthHours(allLgRecords, staffName, scoreMonth, { excludeToday: '' });
    workHours = r.hours;
  }
  const effectiveHourly = (hourly === 0 && workHours > 0) ? Math.round((sales / workHours) * 10) / 10 : hourly;

  const hourlyScore = (T.hourly.find(t => effectiveHourly >= t.min) || { score: 1 }).score;
  const uptScore = (T.upt.find(t => upt >= t.min) || { score: 1 }).score;
  const rawAvg = (hourlyScore + uptScore) / 2;

  const targetMet = sales >= T.sales.target;
  const TIER2 = T.sales.tier2;
  const STEP = T.sales.step;
  let targetBonus = 0;
  if (targetMet) {
    targetBonus += 0.5;
    if (sales >= TIER2) {
      targetBonus += 0.5;
      const extra = Math.floor((sales - TIER2) / STEP);
      if (extra > 0) targetBonus += parseFloat((extra * 0.1).toFixed(1));
    }
  }
  targetBonus = parseFloat(targetBonus.toFixed(1));

  let finalScore = Math.max(1, Math.min(5, parseFloat((rawAvg + targetBonus).toFixed(1))));

  return { score: finalScore, hourlyScore, uptScore, hourly: effectiveHourly, upt: parseFloat(upt.toFixed(2)), sales, qty, tickets, workHours, targetMet, targetBonus };
}

function calcCustomerReviewScore(staffName) {
  const reviews = Store.get('customerReviews') || [];
  const scoreMonth = SCORING_MONTH;
  const myReviews = reviews.filter(r => r.staffName === staffName && r.month === scoreMonth);
  const count = myReviews.length;

  let score;
  if (count === 0) score = 1;
  else if (count === 1) score = 2;
  else score = Math.min(5, 2 + 0.5 * (count - 1));

  return { score: parseFloat(score.toFixed(1)), count };
}

function getLinggongAttStats(staffName) {
  const lgData = Store.get('linggongAttendance') || { records: [] };
  const scoreMonth = SCORING_MONTH;
  const records = (lgData.records || []).filter(r => r.name === staffName && (r.date || '').startsWith(scoreMonth));

  let missedPunch = 0, lateCount = 0, absentCount = 0;
  records.forEach(r => {
    const clockIn = r.signIn || r.clockIn || '';
    const clockOut = r.signOut || r.clockOut || '';
    const isMissedPunch = clockIn === '缺卡' || clockOut === '缺卡';
    const isAbsent = r.status === '缺勤' || r.status === '取消';
    const isLate = r.status === '打卡异常' || (r.lateMin || 0) > 0;
    if (isMissedPunch) missedPunch++;
    if (isAbsent) absentCount++;
    if (isLate) lateCount++;
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

let _behaviorCache = null;
let _behaviorCacheMonth = null;
function getBehaviorData() {
  const scoreMonth = SCORING_MONTH;
  if (_behaviorCache && _behaviorCacheMonth === scoreMonth) return _behaviorCache;
  _behaviorCacheMonth = scoreMonth;
  const allStaff = Store.getList('staff').filter(s => s.dept === 'Service Team' && s.status === 'active');
  const names = allStaff.map(s => s.name);

  const doorSchedule = (Store.get('doorSchedule') || []).filter(d => (d.date || '').startsWith(scoreMonth));
  const doorHours = {};
  doorSchedule.forEach(d => {
    (d.slots || []).forEach(s => {
      const m = (s.time || '').match(/(\d+):(\d+)-(\d+):(\d+)/);
      if (!m) return;
      let h = (parseInt(m[3]) + parseInt(m[4])/60) - (parseInt(m[1]) + parseInt(m[2])/60);
      if (h < 0) h += 24;
      if (!doorHours[s.staff]) doorHours[s.staff] = 0;
      doorHours[s.staff] += h;
    });
  });

  const storeSupport = (Store.get('storeSupport') || []).filter(r => (r.date || '').startsWith(scoreMonth));
  const supportHours = {};
  storeSupport.forEach(r => {
    const m = (r.duration || '').match(/([\d.]+)\s*小时/);
    if (!m) return;
    if (!supportHours[r.staff]) supportHours[r.staff] = 0;
    supportHours[r.staff] += parseFloat(m[1]);
  });

  const totalDoor = names.reduce((s, n) => s + (doorHours[n] || 0), 0);
  const totalSupport = names.reduce((s, n) => s + (supportHours[n] || 0), 0);
  const avgDoor = names.length > 0 ? totalDoor / names.length : 0;
  const avgSupport = names.length > 0 ? totalSupport / names.length : 0;

  const ranking = names.map(name => ({
    name,
    door: doorHours[name] || 0,
    support: supportHours[name] || 0,
    total: (doorHours[name] || 0) + (supportHours[name] || 0),
  })).sort((a, b) => b.total - a.total);

  _behaviorCache = { doorHours, supportHours, avgDoor, avgSupport, ranking };
  return _behaviorCache;
}

function calcBehaviorScore(staffName) {
  const data = getBehaviorData();
  const door = data.doorHours[staffName] || 0;
  const support = data.supportHours[staffName] || 0;
  const avgDoor = data.avgDoor;
  const avgSupport = data.avgSupport;
  const T_beh = SCORE_THRESHOLDS.behavior;

  let score = 4.0;
  let belowDoor = false, belowSupport = false;
  const hasAnyData = data.avgDoor > 0 || data.avgSupport > 0;
  if (!hasAnyData) score = 3.0;
  if (door < avgDoor) { score -= 0.5; belowDoor = true; }
  if (support < avgSupport) { score -= 0.5; belowSupport = true; }

  let rankIdx = data.ranking.findIndex(r => r.name === staffName);
  let rankBonus = 0;
  if (hasAnyData) {
    if (rankIdx === 0) rankBonus = 1.0;
    else if (rankIdx === 1) rankBonus = 0.7;
    else if (rankIdx === 2) rankBonus = 0.4;
  }
  score += rankBonus;

  score = Math.max(1, Math.min(5, parseFloat(score.toFixed(1))));

  return { score, door, support, avgDoor, avgSupport, rank: rankIdx + 1, rankBonus };
}

// ===== 跑 5 维 =====
console.log('='.repeat(72));
console.log(`验证 17:23 导出 → 17:52 截图 (Top 3: 4.2 / 4.2 / 4.1)`);
console.log(`评分月: ${SCORING_MONTH}  ·  真实阈值 · 真实算法`);
console.log('='.repeat(72));
console.log();

for (const name of ['王雅澜', '龚赟昊', '孔祥宇']) {
  const avail = calcAvailabilityScore(name);
  const perf = calcPerformanceScore(name);
  const review = calcCustomerReviewScore(name);
  const attend = calcAttendanceScore(name);
  const behavior = calcBehaviorScore(name);

  const avg = parseFloat(((avail.score + perf.score + review.score + attend.score + behavior.score) / 5).toFixed(1));
  const target = TARGET[name];
  const delta = parseFloat((avg - target).toFixed(1));

  console.log(`【${name}】  目标综合 ${target}   实算综合 ${avg}   Δ ${delta > 0 ? '+' : ''}${delta}`);
  console.log(`  工时支持  ${avail.score.toFixed(1)}   (target 5.0)   ${avail.score === 5 ? '✓' : '✗'}`);
  console.log(`  销售业绩  ${perf.score.toFixed(1)}   (target ${perf.score === perf.score ? (name==='王雅澜'?3.5:name==='龚赟昊'?5.0:2.5) : '?'})   ${perf.score === (name==='王雅澜'?3.5:name==='龚赟昊'?5.0:2.5) ? '✓' : '✗'}`);
  console.log(`  行为规范  ${behavior.score.toFixed(1)}   (target ${name==='王雅澜'?4.7:name==='龚赟昊'?4.0:5.0})   ${behavior.score === (name==='王雅澜'?4.7:name==='龚赟昊'?4.0:5.0) ? '✓' : '✗'}  rank#${behavior.rank}`);
  console.log(`  考勤纪律  ${attend.score.toFixed(1)}   (target 5.0)   ${attend.score === 5 ? '✓' : '✗'}  late=${attend.lateCount} miss=${attend.missedPunch} absent=${attend.absentCount}`);
  console.log(`  顾客好评  ${review.score.toFixed(1)}   (target ${name==='王雅澜'?3.0:name==='龚赟昊'?2.0:3.0})   ${review.score === (name==='王雅澜'?3.0:name==='龚赟昊'?2.0:3.0) ? '✓' : '✗'}  count=${review.count}`);
  console.log();
}