const fs = require('fs');

const appJsPath = 'js/app.js';
const blockPath = 'data/june_block_v18.js';

const code = fs.readFileSync(appJsPath, 'utf8');
const newBlock = fs.readFileSync(blockPath, 'utf8');

// Find june block: from "june: {" to the line before "customerReviews:"
const juneStart = code.indexOf("            june: {");
const customerReviewsStart = code.indexOf("    // 顾客好评记录");

if (juneStart === -1 || customerReviewsStart === -1) {
  console.error('Cannot find block boundaries', juneStart, customerReviewsStart);
  process.exit(1);
}

// The june block ends with "      },\n    },\n\n    " before customerReviews comment
// We need to find the exact end: look for "    },\n\n    // 顾客好评"
const endMarker = "    },\n\n    // 顾客好评记录";
const juneEnd = code.indexOf(endMarker, juneStart);
if (juneEnd === -1) {
  console.error('Cannot find end marker');
  process.exit(1);
}

const before = code.substring(0, juneStart);
const after = code.substring(juneEnd + endMarker.length);

// Build replacement
const replacement = newBlock.trimEnd() + "\n    },\n\n    // 顾客好评记录";

const newCode = before + replacement + after;

fs.writeFileSync(appJsPath, newCode, 'utf8');
console.log('Replaced june block successfully');
console.log('Old size:', code.length, 'New size:', newCode.length);
