const fs = require('fs');

const appJsPath = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/js/app.js';
const ratingsBlockPath = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/ratings_block_v15.js';

let code = fs.readFileSync(appJsPath, 'utf8');
const newRatings = fs.readFileSync(ratingsBlockPath, 'utf8');

// Find old ratings block
const startMarker = 'ratings: [';
const startIdx = code.indexOf(startMarker);
if (startIdx === -1) {
  console.error('ERROR: Cannot find ratings block start');
  process.exit(1);
}

// Find end: the closing "    ]," after the ratings array
// The ratings array entries end with "    ]," at the proper indentation
const endPattern = '\n    ],';
let searchFrom = startIdx;
let braceDepth = 0;
let foundEnd = -1;

// Simple approach: find the first "    ]," that's at the ratings array level
// The ratings are inside "defaults", so after the last "    }," there's "    ],"
let pos = startIdx;
let inString = false;
let braceCount = 0;

while (pos < code.length) {
  const ch = code[pos];
  if (ch === '"' && code[pos-1] !== '\\') inString = !inString;
  if (!inString) {
    if (ch === '{') braceCount++;
    if (ch === '}') braceCount--;
  }
  pos++;
  
  // When braceCount returns to 0 after seeing some entries, look for "],"
  if (braceCount === 0 && pos > startIdx + 20) {
    // Check if we're at "    ],"
    const remaining = code.substring(pos);
    const m = remaining.match(/^\n    \],/);
    if (m) {
      foundEnd = pos + m[0].length;
      break;
    }
  }
}

if (foundEnd === -1) {
  console.error('ERROR: Cannot find ratings block end');
  process.exit(1);
}

const oldBlock = code.substring(startIdx, foundEnd);
console.log('Old ratings block length:', oldBlock.length, 'chars');
console.log('Old block starts:', oldBlock.substring(0, 30));

const newCode = code.substring(0, startIdx) + newRatings.trimEnd() + code.substring(foundEnd);
fs.writeFileSync(appJsPath, newCode);
console.log('✅ Ratings block replaced successfully');
console.log('New file size:', newCode.length, 'chars');
