const fs = require('fs');

const appJsPath = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/js/app.js';
const juneBlockPath = '/Users/a86137/Desktop/兼职/安福路兼职管理系统/data/june_block_v15.js';

let code = fs.readFileSync(appJsPath, 'utf8');
const newBlock = fs.readFileSync(juneBlockPath, 'utf8');

// The old june block starts at "            june: {" and ends at "      }," before "    }," (performanceData close)
// Find the start
const startMarker = '            june: {';
const startIdx = code.indexOf(startMarker);
if (startIdx === -1) {
  console.error('ERROR: Cannot find june block start');
  process.exit(1);
}

// Find the end: the closing "      }," after the records array
// After the june block, the next line should be "    }," (performanceData close)
const afterStart = code.indexOf('\n    },', startIdx);
if (afterStart === -1) {
  console.error('ERROR: Cannot find june block end');
  process.exit(1);
}

// The block ends right before "\n    },"
const oldBlock = code.substring(startIdx, afterStart);
console.log('Old block length:', oldBlock.length, 'chars');
console.log('Old block starts with:', oldBlock.substring(0, 50));
console.log('Old block ends with:', oldBlock.substring(oldBlock.length - 50));

// Replace
const newCode = code.substring(0, startIdx) + newBlock.trimEnd() + code.substring(afterStart);
fs.writeFileSync(appJsPath, newCode);
console.log('✅ June block replaced successfully');
console.log('New file size:', newCode.length, 'chars');
