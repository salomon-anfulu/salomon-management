const fs = require('fs');

let code = fs.readFileSync('js/app.js', 'utf8');
const newRatings = fs.readFileSync('data/ratings_block_v20.js', 'utf8').trim();

// Find ratings block
const startIdx = code.indexOf('    ratings: [');
if (startIdx === -1) { console.error('Could not find ratings block'); process.exit(1); }

// Find end: "    }\n    ]," pattern after ratings
const remaining = code.substring(startIdx);
const endMatch = remaining.match(/    \}\n    \],/);
if (!endMatch) { console.error('Could not find ratings end'); process.exit(1); }

const endIdx = startIdx + endMatch.index + endMatch[0].length;
const before = code.substring(0, startIdx);
const after = code.substring(endIdx);

code = before + newRatings + '\n' + after;

fs.writeFileSync('js/app.js', code);
console.log('✅ Ratings v20 applied');
