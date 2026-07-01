// Debug script: simulate browser localStorage and check rating page behavior
const fs = require('fs');
const vm = require('vm');

// Read the actual app.js and pages.js
const appJs = fs.readFileSync('js/app.js', 'utf8');
const pagesJs = fs.readFileSync('js/pages.js', 'utf8');

// Create a fake browser environment
const localStorage = {};
const fakeStore = {
  getItem(key) { return localStorage[key] || null; },
  setItem(key, val) { localStorage[key] = val; },
};

// Execute app.js to get defaults
const sandbox = {
  localStorage: fakeStore,
  console,
  window: { addEventListener: () => {}, innerHTML: '', getElementById: () => null, querySelector: () => null },
  document: { getElementById: () => ({ classList: { add: ()=>{}, remove: ()=>{} }, innerHTML: '', textContent: '', scrollHeight: 0 }), querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ classList: {add:()=>{}}, setAttribute:()=>{}, appendChild:()=>{}, addEventListener:()=>{} }) },
  Chart: function() {},
};

try {
  vm.createContext(sandbox);
  vm.runInContext(appJs, sandbox);
  
  console.log('=== Store defined?', typeof sandbox.Store);
  console.log('=== _scoringMonth:', sandbox._scoringMonth);
  
  // Check defaults directly from the source
  const defaults = sandbox.Store ? sandbox.Store.defaults : null;
  if (!defaults) {
    console.log('Store.defaults is undefined. Checking what sandbox has...');
    console.log('Sandbox keys:', Object.keys(sandbox).filter(k => !k.startsWith('_')).slice(0, 20));
    return;
  }
  
  // Check ratings months
  const ratings = defaults.ratings || [];
  const months = [...new Set(ratings.map(r => r.month))];
  console.log('=== Available months in ratings:', months);
  console.log('=== Rating count:', ratings.length);
  
  // Count per month
  months.forEach(m => {
    const count = ratings.filter(r => r.month === m).length;
    console.log(`  ${m}: ${count} entries`);
  });
  
  // Check performanceData keys
  const perfKeys = Object.keys(defaults.performanceData || {});
  console.log('=== performanceData keys:', perfKeys);
  perfKeys.forEach(k => {
    const records = defaults.performanceData[k].records || [];
    console.log(`  ${k}: ${records.length} records`);
  });
  
  // Simulate Store.init
  console.log('\n=== Simulating Store.init ===');
  sandbox.Store.init();
  
  // After init, check stored data
  const stored = JSON.parse(fakeStore.getItem('salomon_parttime_mgmt'));
  console.log('Stored _dataVersion:', stored._dataVersion);
  const storedMonths = [...new Set((stored.ratings || []).map(r => r.month))];
  console.log('Stored rating months:', storedMonths);
  
} catch(e) {
  console.error('Error:', e.message);
  console.error(e.stack);
}
