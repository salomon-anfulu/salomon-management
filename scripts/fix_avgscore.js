/**
 * 修复 avgScore 计算
 * 因为原脚本的正则没有正确匹配多行格式
 */
const fs = require('fs');
const path = require('path');

const APP_JS = path.join(__dirname, '..', 'js', 'app.js');
let code = fs.readFileSync(APP_JS, 'utf8');

// 从 ratings 数组开始到结束
const ratingsStart = code.indexOf('ratings: [');
const ratingsEnd = code.indexOf('    ],', ratingsStart);
const ratingsBlock = code.substring(ratingsStart, ratingsEnd);

// 匹配每个评分块
const blockRegex = /"id":\s*(\d+),[\s\S]*?"scores":\s*\{[\s\S]*?"availability":\s*(\d+),[\s\S]*?"performance":\s*(\d+),[\s\S]*?"behavior":\s*(\d+),[\s\S]*?"attendance":\s*(\d+),[\s\S]*?"customerReview":\s*(\d+)\s*\},[\s\S]*?"avgScore":\s*([\d.]+|NaN),[\s\S]*?"hourlyRate":\s*(\d+)/g;

let match;
let updates = [];
while ((match = blockRegex.exec(ratingsBlock)) !== null) {
  const id = parseInt(match[1]);
  const avail = parseInt(match[2]);
  const perf = parseInt(match[3]);
  const beh = parseInt(match[4]);
  const att = parseInt(match[5]);
  const cr = parseInt(match[6]);
  const avg = ((avail + perf + beh + att + cr) / 5).toFixed(1);
  const rate = parseFloat(avg) >= 4.0 ? 60 : 28;
  
  updates.push({ id, avail, perf, beh, att, cr, avg, rate, oldAvg: match[7], oldRate: match[8] });
}

console.log('评分计算结果:');
updates.forEach(u => {
  console.log(`  #${u.id}: avail=${u.avail} perf=${u.perf} beh=${u.beh} att=${u.att} cr=${u.cr} → avg=${u.avg} rate=¥${u.rate}/h (原: ${u.oldAvg}, ${u.oldRate})`);
});

// 修复 avgScore 和 hourlyRate
updates.forEach(u => {
  // 替换 avgScore
  const avgRegex = new RegExp(`("id":\\s*${u.id},[\\s\\S]*?"avgScore":\\s*)([\\d.]+|NaN)`);
  code = code.replace(avgRegex, `$1${u.avg}`);
  
  // 替换 hourlyRate  
  const rateRegex = new RegExp(`("id":\\s*${u.id},[\\s\\S]*?"hourlyRate":\\s*)(\\d+)`);
  code = code.replace(rateRegex, `$1${u.rate}`);
});

fs.writeFileSync(APP_JS, code);
console.log('\n✅ avgScore 和 hourlyRate 已修复');
