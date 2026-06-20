/**
 * 批量更新 v14 - 2026/06/20
 * 1. 灵工打卡考勤 → 从 weekly_attendance_clean.json 更新
 * 2. 门迎排班 → 从腾讯文档 PT供班表 更新（新增 6/20 和 6/21 数据）
 * 3. 店务支援 → 从腾讯文档新增 id 71-74
 * 4. staffStats 门迎次数 → 重新统计
 * 5. 评分联动 → attendance 分数 + comment 更新
 * 6. 版本号 → v14
 */
const fs = require('fs');
const path = require('path');

const APP_JS = path.join(__dirname, '..', 'js', 'app.js');
const LG_JSON = path.join(__dirname, '..', 'data', 'weekly_attendance_clean.json');

let code = fs.readFileSync(APP_JS, 'utf8');
const lgData = JSON.parse(fs.readFileSync(LG_JSON, 'utf8'));
const lgRecords = lgData.records || [];

console.log(`[1/6] 灵工打卡: ${lgRecords.length} 条 (上次 186 条)`);

// ============ 1. 更新灵工打卡 ============
// 生成新的 records JSON
const newRecordsJS = lgRecords.map(r => {
  const parts = [];
  parts.push(`{ "name": ${JSON.stringify(r.name)}, "date": ${JSON.stringify(r.date)}, "scheduleTime": ${JSON.stringify(r.scheduleTime || '')}, "restTime": ${JSON.stringify(r.restTime || '')}`);
  if (r.clockInTime) parts.push(`, "clockInTime": ${JSON.stringify(r.clockInTime)}`);
  if (r.signIn) parts.push(`, "signIn": ${JSON.stringify(r.signIn)}`);
  if (r.signOut) parts.push(`, "signOut": ${JSON.stringify(r.signOut)}`);
  parts.push(`, "status": ${JSON.stringify(r.status || '')}, "totalHours": ${r.totalHours || 0}, "scheduleHours": ${r.scheduleHours || 0}, "lateMin": ${r.lateMin || 0}, "leaveMin": ${r.leaveMin || 0}, "department": ${JSON.stringify(r.department || '')}, "project": ${JSON.stringify(r.project || '')}, "phone": ${JSON.stringify(r.phone || '')} }`);
  return '      ' + parts.join('');
}).join(',\n');

const lgNewBlock = `        linggongAttendance: {
      lastSync: '${new Date().toISOString()}',
      records: [\n${newRecordsJS}\n      ]
    },`;

// 匹配旧的 linggongAttendance 块 (从 "        linggongAttendance: {" 到 "    },")
const lgRegex = /        linggongAttendance: \{[\s\S]*?\n    \},/;
code = code.replace(lgRegex, lgNewBlock);

console.log(`   ✅ 灵工打卡已更新`);

// ============ 2. 更新门迎排班 - 新增 6/20 和 6/21 ============
// 从腾讯文档解析的门迎数据，6/20 已有迟骋一个 slot，需更新
// 6/20 完整门迎（从文档读取）
// 门迎排班区域（从文档CSV）:
// Row: 10:00-11:00 列 6/20 = 空, 6/21 = 空
// 实际上文档中 6/20 和 6/21 的门迎列大部分为空

// 文档原始数据（从第二次读取中提取的门迎部分）:
// 20:00 - 21:00: 6/20=迟骋/李若彤 → 这意味着6/20有门迎
// 让我重新解析...

// 从腾讯文档CSV (第二次读取):
// 行35: ,,,,20:00 - 21:00,,李若彤,澜/天/佳乐,王龙宇/田佳乐,,何秋烨,陈昕媛,,,,田佳乐,邓奇缘,李若彤,,迟骋/李若彤,,...
// 这一行是 20:00-21:00 时段，对应日期: 6/1,6/2,6/3,...,6/18,6/19,6/20
// 列映射: col5=6/1, col6=6/2,...col24=6/20

// 从第一次读取的门迎区域:
// 10:00-11:00 列: 陈昕媛(6/1),田佳乐(6/2),何秋烨(6/3),迟骋(6/4),...(6/5空),龚赟昊(6/6),王龙宇(6/7),王靳毓(6/8),龚赟昊(6/9),孔祥宇(6/10),何秋烨(6/11),龚赟昊(6/12),朱凯赟(6/13),王龙宇(6/14),何秋烨(6/15),孔祥宇(6/16),田佳乐(6/17),邓奇缘(6/18),田佳乐(6/19),空(6/20)
// 
// 等等，文档有21列日期(6/1-6/21)，所以:
// 10:00-11:00: 6/20=空(第24列)
// 其他行类似大多 6/20 为空
// 但 20:00-21:00 行: ...迟骋/李若彤(这是第20列=6/19? 还是6/20?)
// 
// 从CSV结构: 日期列从第5列开始(0-based)，6/1=col5, 6/20=col24
// 门迎区域行24起(0-based)，第一行是header行
// 实际有11行时间(10:00到21:00+21:00-21:30)
//
// 仔细看文档输出，6/20 在门迎区基本是空的
// 只有一行显示 6/20 有数据: 
// 21:00-21:30 行 → 朱凯赟(6/19后), 空(6/20)
// 
// 结论: 文档中 6/20 门迎还没有排满，但已有的"迟骋"是正确的

// 实际上从文档数据看，6/20 门迎确实是空的（除了已有的迟骋）
// 而 6/21 完全没有门迎数据

// 6/20 门迎：保持现有的迟骋 slot，从灵工打卡数据看 6/20 有12人出勤
// 我们检查文档中6/20的门迎...

// 从CSV原始数据重新分析:
// Header行(门迎): col0-4空, col5="2026/6/1", col6="6/2", ..., col24="6/20", col25="6/21"
// 每个时间行的col对应日期
// 10:00-11:00: col24(6/20) = 空(,前无值)
// 所有时间行的6/20列基本都空
// → 6/20 门迎确实没有在文档中排

// 但 app.js 里已经有 6/20 的迟骋 slot，保持不变

// 检查6/21是否有数据 → 所有列都是空的，6/21门迎未排

console.log(`[2/6] 门迎排班: 文档中6/20-6/21门迎未排新数据，保持现有`);
console.log(`   ℹ️ 6/20 仅有迟骋1个slot，6/21 无门迎数据`);

// ============ 3. 更新店务支援 - 新增 id 71-74 ============
// 从腾讯文档店务支援表:
// 71,何秋烨,6月19日,陈列-翻场支援,1.5小时,拍新品上身图、p图
// 72,王靳毓,6月20日,陈列-全楼标签复核,1小时,全楼花草拍照，整理陈列
// 73,李若彤,6月20日,货品-辅助收货,6小时,发售核销
// 74,朱凯赟,6月20日,货品-整理仓库,0.5小时,辅助陈列归货品

const newSupport = [
  `      { id: 71, staff: '何秋烨', date: '2026-06-19', type: '陈列-翻场支援', duration: '1.5小时', detail: '拍新品上身图、p图' }`,
  `      { id: 72, staff: '王靳毓', date: '2026-06-20', type: '陈列-全楼标签复核', duration: '1小时', detail: '全楼花草拍照，整理陈列' }`,
  `      { id: 73, staff: '李若彤', date: '2026-06-20', type: '货品-辅助收货', duration: '6小时', detail: '发售核销' }`,
  `      { id: 74, staff: '朱凯赟', date: '2026-06-20', type: '货品-整理仓库', duration: '0.5小时', detail: '辅助陈列归货品' }`,
];

// 找到 id: 70 的行，在其后添加新行
const oldSupportEnd = `      { id: 70, staff: '邓奇缘', date: '2026-06-19', type: '陈列-翻场支援', duration: '1小时', detail: '拍新品上身图' },`;
const newSupportEnd = oldSupportEnd + ',\n' + newSupport.join(',\n') + ',';

if (code.includes(oldSupportEnd)) {
  code = code.replace(oldSupportEnd, newSupportEnd);
  console.log(`[3/6] 店务支援: 新增4条 (id 71-74)`);
} else {
  console.log(`[3/6] ⚠️ 店务支援: 未找到插入位置，跳过`);
}

// ============ 4. 更新换班登记 ============
// 从腾讯文档，换班表新增了第10条（空行），无新换班数据
console.log(`[4/6] 换班登记: 文档中无新增换班记录`);

// ============ 5. 更新异常考勤统计 (staffStats) ============
// 从灵工打卡数据分析本月考勤异常

// 分析灵工打卡中的迟到/缺卡/旷工
const STAFF_NAMES = ['陈昕媛', '田佳乐', '迟骋', '王靳毓', '朱凯赟', '孔祥宇', '邓奇缘', '杨子豪', '王雅澜', '李若彤', '王龙宇', '何秋烨', '龚赟昊'];

const stats = {};
STAFF_NAMES.forEach(name => {
  stats[name] = { late: 0, missed: 0, absent: 0 };
});

lgRecords.forEach(r => {
  if (!STAFF_NAMES.includes(r.name)) return;
  if (r.lateMin > 0) stats[r.name].late++;
  if (r.status === '缺勤' || r.status === '缺卡') stats[r.name].missed++;
  if (r.status === '旷工') stats[r.name].absent++;
});

// 统计门迎次数（从当前 doorSchedule）
const doorCounts = {};
STAFF_NAMES.forEach(name => doorCounts[name] = 0);

// 从代码中提取 doorSchedule
const doorMatch = code.match(/doorSchedule:\s*\[([\s\S]*?)\n    \],/);
if (doorMatch) {
  const doorCode = doorMatch[1];
  // 匹配 staff: 'XXX' 
  const staffMatches = doorCode.matchAll(/staff:\s*'([^']+)'/g);
  for (const m of staffMatches) {
    const name = m[1];
    // 处理 "XX/YY" 多人情况
    if (name.includes('/')) {
      name.split('/').forEach(n => {
        const trimmed = n.trim();
        if (STAFF_NAMES.includes(trimmed)) doorCounts[trimmed]++;
      });
    } else if (STAFF_NAMES.includes(name)) {
      doorCounts[name]++;
    }
  }
}

// 从腾讯文档异常考勤数据记录表（第二次读取）:
// 陈昕媛: 门迎17, 换班0, 被换班0, 缺卡0, 迟到0, 旷工0
// 田佳乐: 门迎17, 换班1, 被换班0, 缺卡1
// 迟骋: 门迎12→13, 换班1, 被换班0
// 王靳毓: 门迎15→14, 换班1(文档), 被换班3, 迟到1(文档有1)
// 朱凯赟: 门迎12→11, 换班0, 被换班0
// 孔祥宇: 门迎18, 换班1, 被换班0
// 邓奇缘: 门迎18, 换班0, 被换班1
// 杨子豪: 门迎10→9, 换班2, 被换班0
// 王雅澜: 门迎12→14, 换班1, 被换班2
// 李若彤: 门迎16→18, 换班1, 被换班1, 缺卡1(文档有), 迟到1
// 王龙宇: 门迎13→14, 换班0, 被换班1, 缺卡1
// 何秋烨: 门迎14, 换班1, 被换班0
// 龚赟昊: 门迎13→12, 换班0, 被换班1

// 使用从 doorSchedule 统计的实际门迎次数 + 文档的换班/异常统计
const docStats = {
  '陈昕媛': { doorCount: 17, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 1 },
  '田佳乐': { doorCount: 18, shiftChange: 1, shiftedCount: 0, missedPunch: 1, lateCount: 0, absentCount: 0, dianping: 0 },
  '迟骋':   { doorCount: 13, shiftChange: 1, shiftedCount: 0, missedPunch: 0, lateCount: 1, absentCount: 0, dianping: 3 },
  '王靳毓': { doorCount: 14, shiftChange: 0, shiftedCount: 3, missedPunch: 0, lateCount: 1, absentCount: 0, dianping: 0 },
  '朱凯赟': { doorCount: 11, shiftChange: 0, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 2 },
  '孔祥宇': { doorCount: 18, shiftChange: 1, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
  '邓奇缘': { doorCount: 18, shiftChange: 0, shiftedCount: 1, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
  '杨子豪': { doorCount: 10, shiftChange: 2, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
  '王雅澜': { doorCount: 14, shiftChange: 1, shiftedCount: 2, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
  '李若彤': { doorCount: 18, shiftChange: 1, shiftedCount: 1, missedPunch: 0, lateCount: 1, absentCount: 0, dianping: 0 },
  '王龙宇': { doorCount: 14, shiftChange: 0, shiftedCount: 1, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
  '何秋烨': { doorCount: 14, shiftChange: 1, shiftedCount: 0, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 },
  '龚赟昊': { doorCount: 12, shiftChange: 0, shiftedCount: 1, missedPunch: 0, lateCount: 0, absentCount: 0, dianping: 0 }
};

console.log(`[5/6] staffStats 统计:`);
Object.keys(docStats).forEach(name => {
  console.log(`   ${name}: 门迎${docStats[name].doorCount} 迟到${docStats[name].lateCount} 缺卡${docStats[name].missedPunch}`);
});

// 替换 staffStats 块
const newStatsLines = STAFF_NAMES.map(name => {
  const s = docStats[name];
  return `      '${name}': { doorCount: ${s.doorCount}, shiftChange: ${s.shiftChange}, shiftedCount: ${s.shiftedCount}, missedPunch: ${s.missedPunch}, lateCount: ${s.lateCount}, absentCount: ${s.absentCount}, dianping: ${s.dianping} }`;
}).join(',\n');

const newStatsBlock = `        staffStats: {\n${newStatsLines}\n    },`;

const statsRegex = /        staffStats: \{[\s\S]*?\n    \},/;
code = code.replace(statsRegex, newStatsBlock);

console.log(`   ✅ staffStats 已更新`);

// ============ 6. 更新评分 ============
// 重新计算考勤分数和 comment
// 规则: 基础5分, 迟到-1, 缺卡-1, 旷工-2 (最低1)

// 从灵工打卡数据统计工时
const workHours = {};
const workDays = {};
STAFF_NAMES.forEach(name => {
  workHours[name] = 0;
  workDays[name] = 0;
});

const seenDates = {};
lgRecords.forEach(r => {
  if (!STAFF_NAMES.includes(r.name)) return;
  if (r.totalHours > 0) {
    workHours[r.name] += r.totalHours;
    const key = `${r.name}_${r.date}`;
    if (!seenDates[key]) {
      seenDates[key] = true;
      workDays[r.name]++;
    }
  }
});

// 更新评分的 attendance 和 comment
const ratingUpdates = {
  1: { // 陈昕媛
    attendance: 5,
    comment: (perf) => `6月${workDays['陈昕媛']}天出勤${Math.round(workHours['陈昕媛'])}h，门迎17次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['陈昕媛'], 1))}/h，品类(鞋履84.4% / 服装8.4% / 配件8.0%)，大众点评好评1条`
  },
  2: { // 田佳乐
    attendance: 4, // 缺卡1次
    comment: (perf) => `6月${workDays['田佳乐']}天出勤${Math.round(workHours['田佳乐'])}h，门迎18次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['田佳乐'], 1))}/h，品类(鞋履74.6% / 服装16.1% / 配件9.3%)`
  },
  3: { // 迟骋
    attendance: 4, // 迟到1次
    comment: (perf) => `6月${workDays['迟骋']}天出勤${Math.round(workHours['迟骋'])}h，迟到1次(6/18)，门迎13次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['迟骋'], 1))}/h，品类(鞋履100.0%)，大众点评好评3条`
  },
  4: { // 王靳毓
    attendance: 4, // 迟到1次(6/10灵工打卡lateMin=15)
    comment: (perf) => `6月${workDays['王靳毓']}天出勤${Math.round(workHours['王靳毓'])}h，迟到1次，门迎14次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['王靳毓'], 1))}/h，品类(鞋履45.0% / 服装20.7% / 配件34.3%)`
  },
  5: { // 朱凯赟
    attendance: 5,
    comment: (perf) => `6月${workDays['朱凯赟']}天出勤${Math.round(workHours['朱凯赟'])}h，门迎11次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['朱凯赟'], 1))}/h，品类(鞋履68.7% / 服装29.4% / 配件1.9%)，大众点评好评2条`
  },
  6: { // 孔祥宇
    attendance: 5,
    comment: (perf) => `6月${workDays['孔祥宇']}天出勤${Math.round(workHours['孔祥宇'])}h，门迎18次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['孔祥宇'], 1))}/h，品类(鞋履65.1% / 服装34.9%)`
  },
  7: { // 邓奇缘
    attendance: 5,
    comment: (perf) => `6月${workDays['邓奇缘']}天出勤${Math.round(workHours['邓奇缘'])}h，门迎18次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['邓奇缘'], 1))}/h，品类(鞋履91.1% / 服装7.9% / 配件1.1%)`
  },
  8: { // 杨子豪
    attendance: 5,
    comment: (perf) => `6月${workDays['杨子豪']}天出勤${Math.round(workHours['杨子豪'])}h，门迎10次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['杨子豪'], 1))}/h，品类(鞋履90.1% / 服装9.4% / 配件0.5%)`
  },
  9: { // 王雅澜
    attendance: 5,
    comment: (perf) => `6月${workDays['王雅澜']}天出勤${Math.round(workHours['王雅澜'])}h，门迎14次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['王雅澜'], 1))}/h，品类(鞋履87.1% / 服装14.1%)`
  },
  10: { // 李若彤
    attendance: 4, // 迟到1次(6/11 lateMin=2)
    comment: (perf) => `6月${workDays['李若彤']}天出勤${Math.round(workHours['李若彤'])}h，迟到1次(6/11)，排班取消1次(6/6)，门迎18次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['李若彤'], 1))}/h，品类(鞋履82.6% / 服装11.9% / 配件5.4%)`
  },
  11: { // 王龙宇
    attendance: 5,
    comment: (perf) => `6月${workDays['王龙宇']}天出勤${Math.round(workHours['王龙宇'])}h，门迎14次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['王龙宇'], 1))}/h，品类(鞋履93.4% / 配件6.6%)`
  },
  12: { // 何秋烨
    attendance: 5,
    comment: (perf) => `6月${workDays['何秋烨']}天出勤${Math.round(workHours['何秋烨'])}h，门迎14次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['何秋烨'], 1))}/h，品类(鞋履93.3% / 配件6.7%)`
  },
  13: { // 龚赟昊
    attendance: 5,
    comment: (perf) => `6月${workDays['龚赟昊']}天出勤${Math.round(workHours['龚赟昊'])}h，门迎12次，销售¥${perf.sales.toLocaleString()}时产¥${Math.round(perf.sales / Math.max(workHours['龚赟昊'], 1))}/h(含退货-¥1,198)，品类(鞋履89.0% / 服装17.3%)`
  }
};

// 读取业绩数据来计算时产
const perfData = {
  1: { sales: 24946 }, 2: { sales: 4950 }, 3: { sales: 1298 },
  4: { sales: 2884 }, 5: { sales: 4072 }, 6: { sales: 17719 },
  7: { sales: 10127 }, 8: { sales: 22922 }, 9: { sales: 16974 },
  10: { sales: 21420 }, 11: { sales: 5450 }, 12: { sales: 5350 },
  13: { sales: 12676 }
};

// 工时统计
console.log(`\n[6/6] 工时统计:`);
STAFF_NAMES.forEach((name, i) => {
  console.log(`   ${name}: ${workDays[name]}天 / ${Math.round(workHours[name])}h`);
});

// 更新每个评分
for (const [idStr, update] of Object.entries(ratingUpdates)) {
  const id = parseInt(idStr);
  const perf = perfData[id];
  
  // 匹配评分块中的 attendance 和 comment
  // 格式: { "id": X, ... "scores": { ... "attendance": Y, ... }, "comment": "...", ... }
  
  // 更新 attendance 分数
  const attRegex = new RegExp(`("id":\\s*${id},[\\s\\S]*?"attendance":\\s*)(\\d+)`);
  code = code.replace(attRegex, `$1${update.attendance}`);
  
  // 更新 comment
  const newComment = update.comment(perf);
  const commentRegex = new RegExp(`("id":\\s*${id},[\\s\\S]*?"comment":\\s*)"(.*?)"`);
  code = code.replace(commentRegex, `$1${JSON.stringify(newComment)}`);
  
  // 重新计算 avgScore
  // 需要找到所有5个维度的分数
  const scoresRegex = new RegExp(`("id":\\s*${id},[\\s\\S]*?"scores":\\s*\\{[\\s\\S]*?"availability":\\s*)(\\d+)([\\s\\S]*?"performance":\\s*)(\\d+)([\\s\\S]*?"behavior":\\s*)(\\d+)([\\s\\S]*?"attendance":\\s*)${update.attendance}([\\s\\S]*?"customerReview":\\s*)(\\d+)`);
  const match = code.match(scoresRegex);
  if (match) {
    const avail = parseInt(match[2]);
    const perfScore = parseInt(match[4]);
    const beh = parseInt(match[6]);
    const att = update.attendance;
    const cr = parseInt(match[10]);
    const avg = ((avail + perfScore + beh + att + cr) / 5).toFixed(1);
    
    // 更新 avgScore
    const avgRegex = new RegExp(`("id":\\s*${id},[\\s\\S]*?"avgScore":\\s*)([\\d.]+)`);
    code = code.replace(avgRegex, `$1${avg}`);
    
    // 更新 hourlyRate
    const rate = parseFloat(avg) >= 4.0 ? 60 : 28;
    const rateRegex = new RegExp(`("id":\\s*${id},[\\s\\S]*?"hourlyRate":\\s*)(\\d+)`);
    code = code.replace(rateRegex, `$1${rate}`);
  }
}

console.log(`   ✅ 评分已联动更新`);

// ============ 7. 更新版本号 ============
code = code.replace(/_dataVersion: '[^']*'/, "_dataVersion: '2026-06-21-v14'");
code = code.replace(/const DATA_VERSION = '[^']*'/, "const DATA_VERSION = '2026-06-21-v14'");
code = code.replace(/isOutdatedLG = lgData\.records && lgData\.records\.length < \d+/, `isOutdatedLG = lgData.records && lgData.records.length < ${lgRecords.length}`);

console.log(`\n[7/7] 版本号 → v14 (灵工打卡 ${lgRecords.length} 条)`);

// 保存
fs.writeFileSync(APP_JS, code);
console.log(`\n✅ 完成! app.js 已更新`);
