const fs = require('fs');

let code = fs.readFileSync('js/app.js', 'utf8');

// The current broken structure:
// line 634: ratings end "],"
// line 636-840: linggongAttendance (correct)
// line 841: "} ], source: '大众点评（陆慧，Lv4）' }," <- this is BROKEN (orphaned customerReviews id 1 remnant)
// Then customerReviews id 2-8 follow
// Then _dataVersion

// We need to:
// 1. Insert performanceData block (april + may + june with NEW data) after ratings
// 2. Fix the broken linggongAttendance closing + customerReviews opening

// First, read the new june block
const newJuneBlock = fs.readFileSync('data/june_block_v20.js', 'utf8').trim();

// Build the full performanceData block
const perfBlock = `    performanceData: {
      april: {
        month: '2026-04',
        totalSales: 407876,
        avgHourlyOutput: 285.98,
        records: [
          { name: '龚赟昊', sales: 55736, salesShare: 0.1366, workHours: 114.5, hourlyOutput: 486.78 },
          { name: '陈昕媛', sales: 53428, salesShare: 0.1310, workHours: 84, hourlyOutput: 636.05 },
          { name: '何秋烨', sales: 43268, salesShare: 0.1061, workHours: 80, hourlyOutput: 540.85 },
          { name: '李若彤', sales: 41488, salesShare: 0.1017, workHours: 122, hourlyOutput: 340.07 },
          { name: '田佳乐', sales: 34148, salesShare: 0.0837, workHours: 110.5, hourlyOutput: 309.03 },
          { name: '徐思懿', sales: 32868, salesShare: 0.0806, workHours: 96, hourlyOutput: 342.38 },
          { name: '邓奇缘', sales: 32208, salesShare: 0.0790, workHours: 138, hourlyOutput: 233.39 },
          { name: '朱凯赟', sales: 24958, salesShare: 0.0612, workHours: 105, hourlyOutput: 237.70 },
          { name: '孔祥宇', sales: 23652, salesShare: 0.0580, workHours: 130, hourlyOutput: 181.94 },
          { name: '迟骋', sales: 21132, salesShare: 0.0518, workHours: 109.5, hourlyOutput: 192.99 },
          { name: '王龙宇', sales: 17074, salesShare: 0.0419, workHours: 80, hourlyOutput: 213.43 },
          { name: '杨子豪', sales: 13338, salesShare: 0.0327, workHours: 83.5, hourlyOutput: 159.74 },
          { name: '王雅澜', sales: 7588, salesShare: 0.0186, workHours: 99.5, hourlyOutput: 76.26 },
          { name: '王靳毓', sales: 6990, salesShare: 0.0171, workHours: 131.5, hourlyOutput: 53.16 },
        ]
      },
      may: {
        month: '2026-05',
        totalSales: 440577,
        avgUPT: 1.27,
        avgHourlyOutput: 281.34,
        records: [
          { name: '李若彤', sales: 61848, salesShare: 0.1404, workHours: 143, hourlyOutput: 432.50 },
          { name: '陈昕媛', sales: 60276, salesShare: 0.1368, workHours: 138.5, hourlyOutput: 435.21 },
          { name: '何秋烨', sales: 58358, salesShare: 0.1325, workHours: 120.5, hourlyOutput: 484.30 },
          { name: '杨子豪', sales: 39398, salesShare: 0.0894, workHours: 120, hourlyOutput: 328.32 },
          { name: '邓奇缘', sales: 38528, salesShare: 0.0874, workHours: 141.5, hourlyOutput: 272.28 },
          { name: '龚赟昊', sales: 36192, salesShare: 0.0821, workHours: 120, hourlyOutput: 301.60 },
          { name: '朱凯赟', sales: 32860, salesShare: 0.0746, workHours: 89, hourlyOutput: 369.21 },
          { name: '田佳乐', sales: 29979, salesShare: 0.0680, workHours: 107, hourlyOutput: 280.18 },
          { name: '王龙宇', sales: 25258, salesShare: 0.0573, workHours: 110.5, hourlyOutput: 228.58 },
          { name: '迟骋', sales: 19868, salesShare: 0.0451, workHours: 112.5, hourlyOutput: 176.60 },
          { name: '王雅澜', sales: 16648, salesShare: 0.0378, workHours: 120, hourlyOutput: 138.73 },
          { name: '孔祥宇', sales: 13476, salesShare: 0.0306, workHours: 112, hourlyOutput: 120.32 },
          { name: '王靳毓', sales: 7888, salesShare: 0.0179, workHours: 88, hourlyOutput: 89.64 },
        ]
      },
${newJuneBlock}
    },

    // 顾客好评记录（大众点评5星好评）
    customerReviews: [
      { id: 1, staffName: '陈昕媛', month: '2026-06', rating: 5, reviewDate: '2026-06-16', snippet: '逛街看到小白楼进来逛逛，Kelly的导览非常详细，带我了解到了很多新的活动和品牌历史，对Salomon有了新的了解。', keywords: ['导览详细', '品牌历史', '新活动', '超预期'], source: '大众点评（陆慧，Lv4）' },
      { id: 2, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '店门口很适合拍照，店员都好帅。那天碰到一个小哥态度很好很和善，问他说是叫CC，下次还找他服务。', keywords: ['态度好', '和善', '适合拍照', '下次还找'], source: '大众点评（煤球斯基，Lv1）' },
      { id: 3, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '本次购物体验很棒，导购小哥cc十分热情主动，详细介绍产品特点，耐心解答疑问，专业又贴心，感谢优质服务。', keywords: ['热情主动', '详细介绍', '耐心解答', '专业贴心'], source: '大众点评（yuki，Lv1）' },
      { id: 4, staffName: '朱凯赟', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '导购小哥cc十分热情主动，详细介绍产品特点，耐心解答疑问，小朱帮忙挑选也很用心，专业又贴心，感谢优质服务。', keywords: ['热情主动', '详细介绍', '耐心解答', '专业贴心'], source: '大众点评（yuki，Lv1）' },
      { id: 5, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '特别感谢店员朱凯赟和迟骋，两人全程热情耐心，细致讲解鞋款功能，主动拿多款尺码试穿，专业给出选购建议，没有半点推销感。', keywords: ['热情耐心', '细致讲解', '主动拿尺码', '专业建议', '无推销感'], source: '大众点评（我是可乐我会冒泡，Lv3）' },
      { id: 6, staffName: '朱凯赟', month: '2026-06', rating: 5, reviewDate: '2026-06-17', snippet: '特别感谢店员朱凯赟和迟骋，两人全程热情耐心，细致讲解鞋款功能，主动拿多款尺码试穿，专业给出选购建议，服务贴心周到。', keywords: ['热情耐心', '细致讲解', '主动拿尺码', '专业建议', '贴心周到'], source: '大众点评（我是可乐我会冒泡，Lv3）' },
      { id: 7, staffName: '李若彤', month: '2026-06', rating: 5, reviewDate: '2026-06-20', snippet: '买了两双安福路店限定whisper，来上海旅游的目的就是这两双，店员好亲切，进来了两次，第一次试穿店员并不会因为我来试试而置之不理，非常惊讶。特别点名小和，非常非常非常用心！', keywords: ['服务态度好', '热情亲切', '耐心接待', '小和用心', '购买转化'], source: '大众点评（匿名用户，Lv2）' },
      { id: 8, staffName: '迟骋', month: '2026-06', rating: 5, reviewDate: '2026-06-21', snippet: '来Salomon安福路店逛街，CC接待的我，人特别热情，讲鞋子都讲得很细，耐心跟我说各个款式的区别，选鞋给的建议也很实在，逛着很舒服，体验挺好的～', keywords: ['热情', '讲解细致', '耐心介绍', '建议实在', '体验好'], source: '大众点评（勇善可爱的小柔，Lv1）' },
    ],`;

// Now find the broken section and replace it.
// The broken section starts after the linggong records end.
// Current structure: ...linggong records end with "未开始考勤"... then "}\n      ], source: '大众点评（陆慧，Lv4）' }," (broken)
// We need to find from the linggong last record to the _dataVersion line

// Strategy: Find the last linggong record line (陈昕媛 6/23 未开始考勤) and the _dataVersion line
// Replace everything between them with: proper closing + performanceData + customerReviews + _dataVersion

// Find the marker: last linggong record
const lgEndMarker = '{ "name": "陈昕媛", "date": "2026-06-23", "signIn": "", "signOut": "", "status": "未开始考勤", "totalHours": "0" }';
const lgEndIdx = code.indexOf(lgEndMarker);
if (lgEndIdx === -1) { console.error('Could not find linggong end marker'); process.exit(1); }

// Find _dataVersion after that
const dvIdx = code.indexOf("_dataVersion:", lgEndIdx);
if (dvIdx === -1) { console.error('Could not find _dataVersion'); process.exit(1); }

// Find the line start of _dataVersion
const dvLineStart = code.lastIndexOf('\n', dvIdx) + 1;

// Everything before linggong end marker (including the marker itself)
const before = code.substring(0, lgEndIdx + lgEndMarker.length);

// Everything from _dataVersion onward
const after = code.substring(dvLineStart);

// Build the replacement: proper linggong close + performanceData + customerReviews
const middle = `
      ],
      source: 'linggongguanjia.com API',
    },

    ${perfBlock}

    `;

code = before + middle + after;

// Update version
code = code.replace(
  /_dataVersion: '[^']*'/,
  `_dataVersion: '2026-06-23-v20'`
);
code = code.replace(
  /const isOutdatedJunePerfV2 = junePerf\.totalSales && junePerf\.totalSales < \d+/,
  `const isOutdatedJunePerfV2 = junePerf.totalSales && junePerf.totalSales < 211454`
);
code = code.replace(
  /const DATA_VERSION = '[^']*'/,
  `const DATA_VERSION = '2026-06-23-v20'`
);

fs.writeFileSync('js/app.js', code);
console.log('✅ Structure restored + june v20 applied');
console.log('   File size:', code.length, 'chars');
console.log('   Lines:', code.split('\n').length);
