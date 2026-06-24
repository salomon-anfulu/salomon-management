// Verify v30 performance scores with monthly sales target bonus
const records = [
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

const SALES_TARGET = 20000;

function calcH(h) { if(h>=300)return 5; if(h>=210)return 4; if(h>=150)return 3; if(h>=100)return 2; return 1; }
function calcU(u) { if(u>=1.5)return 5; if(u>=1.3)return 4; if(u>=1.1)return 3; if(u>=0.9)return 2; return 1; }

console.log('Name       | 时产 | hSc | UPT  | uSc | 月销    | 达标 | 均值 | +bonus | Final');
console.log('-'.repeat(85));

records.forEach(r => {
  const upt = r.qty / r.tickets;
  const hS = calcH(r.hourlyOutput);
  const uS = calcU(upt);
  const avg = (hS + uS) / 2;
  const met = r.sales >= SALES_TARGET;
  const bonus = met ? 0.5 : 0;
  const final = Math.max(1, Math.min(5, parseFloat((avg + bonus).toFixed(1))));
  console.log(
    `${r.name.padEnd(10)} | ¥${String(r.hourlyOutput).padStart(3)} |  ${hS}  | ${upt.toFixed(2).padEnd(4)} |  ${uS}  | ¥${String(r.sales).padStart(5)} | ${met?'✓':'✗'}   |  ${avg.toFixed(1)} | ${bonus>0?'+'+bonus:'   '}  | ${final}`
  );
});

console.log('\n=== 达标2万 (6人): 陈昕媛/杨子豪/李若彤/龚赟昊/王雅澜/孔祥宇 ===');
console.log('=== 未达标 (7人): 何秋烨/邓奇缘/朱凯赟/迟骋/田佳乐/王龙宇/王靳毓 ===');
