// 渲染 7月表现评分报告 → 高清 PNG
// 用法：node scripts/render_july_report.cjs
// 依赖：puppeteer 25.x + 系统 Google Chrome（/Applications/Google Chrome.app）
const puppeteer = require('/Users/a86137/.workbuddy/binaries/node/workspace/node_modules/puppeteer');
const path = require('path');

(async () => {
  const htmlPath = path.resolve(__dirname, '..', 'monthly-report-july-2026.html');
  const pngPath  = path.resolve(__dirname, '..', 'monthly-report-july-2026.png');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--hide-scrollbars']
  });

  const page = await browser.newPage();
  // deviceScaleFactor 2 = 视网膜高清（物理像素 ×2）；fullPage 自动延展高度
  await page.setViewport({ width: 1280, height: 1500, deviceScaleFactor: 2 });
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

  await page.screenshot({
    path: pngPath,
    fullPage: true,
    type: 'png',
    omitBackground: false
  });

  await browser.close();

  const fs = require('fs');
  const size = fs.statSync(pngPath).size;
  console.log(`PNG_OK ${pngPath} (${(size / 1024).toFixed(1)} KB)`);
})().catch(e => {
  console.error('RENDER_FAIL', e.message);
  process.exit(1);
});