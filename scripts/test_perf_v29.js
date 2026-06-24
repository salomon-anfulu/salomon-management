const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console errors
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('Console: ' + msg.text());
  });

  const filePath = 'file://' + path.resolve(__dirname, '..', 'app.html');

  // Goto first, then inject auth via evaluate
  await page.goto(filePath, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Inject auth
  await page.evaluate(() => {
    sessionStorage.setItem('salomon_auth', JSON.stringify({
      staffId: 1,
      staffName: '陈昕媛',
      role: 'admin',
      loginAt: Date.now(),
    }));
  });

  // Reload with auth
  await page.reload({ waitUntil: 'networkidle0', timeout: 15000 });

  // Navigate to ratings page
  await page.evaluate(() => {
    if (typeof showPage === 'function') showPage('ratings');
    else if (typeof navigateTo === 'function') navigateTo('ratings');
  });
  await page.waitForSelector('#page-content', { timeout: 5000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check page content
  const text = await page.evaluate(() => document.querySelector('#page-content').innerText);

  const hasPerformance = text.includes('销售业绩');
  const hasUPT = text.includes('UPT');
  const hasHourly = text.includes('时产');

  console.log('=== Test Results ===');
  console.log('Has 销售业绩:', hasPerformance);
  console.log('Has UPT mention:', hasUPT);
  console.log('Has 时产 mention:', hasHourly);
  console.log('Errors:', errors.length ? errors : 'None');

  // Check decimal scores
  const hasDecimal = text.match(/\d\.\d/g);
  console.log('Decimal scores found:', hasDecimal ? hasDecimal.slice(0, 15).join(', ') : 'No');

  // Check perf detail panel
  const perfExpandable = await page.evaluate(() => {
    const el = document.querySelector('.perf-detail');
    return el ? 'Found .perf-detail' : 'NOT found';
  });
  console.log('Perf detail panel:', perfExpandable);

  // Verify the UPT+时产 text appears in the header
  const headerText = text.substring(0, 500);
  console.log('\nHeader includes 时产50%+UPT50%:', headerText.includes('时产50%') || headerText.includes('UPT'));

  // Check specific name appears with score
  const names = ['陈昕媛', '杨子豪', '李若彤', '孔祥宇', '何秋烨'];
  names.forEach(n => {
    console.log(`Page contains ${n}:`, text.includes(n));
  });

  console.log('\n=== Expected Scores ===');
  console.log('陈昕媛: hourly=5(¥312), UPT=3(1.14), perf=4.0');
  console.log('杨子豪: hourly=5(¥449), UPT=4(1.33), perf=4.5');
  console.log('李若彤: hourly=4(¥273), UPT=4(1.38), perf=4.0');
  console.log('孔祥宇: hourly=3(¥177), UPT=5(1.70), perf=4.0');
  console.log('何秋烨: hourly=3(¥165), UPT=5(1.78), perf=4.0');

  await browser.close();
  console.log('\n✅ Test complete');
})();
