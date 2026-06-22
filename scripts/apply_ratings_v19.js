const fs = require('fs');

let code = fs.readFileSync('js/app.js', 'utf8');
const newRatings = fs.readFileSync('data/ratings_block_v19.js', 'utf8').trim();

// Find ratings block: from "ratings: [" to "    ]," (the first one after line 438)
const startIdx = code.indexOf('ratings: [');
if (startIdx === -1) { console.error('Could not find ratings: ['); process.exit(1); }

// Find the matching close - search for "    ]," after the ratings start
// The ratings block ends with "    }\n    ],"
const endPattern = /    \}\n    \],/;
const remaining = code.substring(startIdx);
const endMatch = remaining.match(endPattern);
if (!endMatch) { console.error('Could not find ratings end'); process.exit(1); }

const endIdx = startIdx + endMatch.index + endMatch[0].length;

// Replace
const before = code.substring(0, startIdx);
const after = code.substring(endIdx);

// The new ratings block already includes "    ratings: [" and "    ],"
code = before + newRatings + '\n' + after;

fs.writeFileSync('js/app.js', code);
console.log('✅ Ratings block replaced successfully');
console.log('   Old end index:', endIdx, 'New length:', code.length);
