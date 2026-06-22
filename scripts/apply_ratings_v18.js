const fs = require('fs');

const appJsPath = 'js/app.js';
const blockPath = 'data/ratings_v18.js';

const code = fs.readFileSync(appJsPath, 'utf8');
const newBlock = fs.readFileSync(blockPath, 'utf8');

// Find ratings block: from "    ratings: [" to "    ],"
const ratingsStart = code.indexOf("    ratings: [");
const ratingsEndMarker = "    ],\n\n        // 灵工打卡考勤数据";
const ratingsEnd = code.indexOf(ratingsEndMarker, ratingsStart);

if (ratingsStart === -1 || ratingsEnd === -1) {
  console.error('Cannot find ratings block boundaries', ratingsStart, ratingsEnd);
  process.exit(1);
}

const before = code.substring(0, ratingsStart);
const after = code.substring(ratingsEnd + ratingsEndMarker.length);

const replacement = newBlock.trimEnd() + "\n\n        // 灵工打卡考勤数据";

const newCode = before + replacement + after;

fs.writeFileSync(appJsPath, newCode, 'utf8');
console.log('Replaced ratings block successfully');
console.log('Old size:', code.length, 'New size:', newCode.length);
