const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1000, deviceScaleFactor: 2 });
  const htmlPath = path.resolve(__dirname, '../reports/weekly_review_0622.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));

  // Get full page height
  const bodyHeight = await page.evaluate(() => {
    const el = document.querySelector('.page');
    return el ? el.scrollHeight : document.body.scrollHeight;
  });

  await page.setViewport({ width: 1080, height: bodyHeight, deviceScaleFactor: 2 });
  await new Promise(r => setTimeout(r, 500));

  const outPath = path.resolve(__dirname, '../reports/weekly_review_0622.png');
  await page.screenshot({
    path: outPath,
    fullPage: false,
    type: 'png',
  });

  console.log('Screenshot saved to:', outPath);
  console.log('Page height:', bodyHeight);
  await browser.close();
})();
