/**
 * Debug 2 - 打印完整的请求头（不拦截，只观察）
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth_state.json');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const authState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  await context.addCookies(authState.cookies);

  const page = await context.newPage();

  // 监听所有请求，打印认证相关的 header
  page.on('request', request => {
    const url = request.url();
    if (url.includes('pageByParam') || url.includes('summaryByTime') || url.includes('dimensionStatistic')) {
      const headers = request.headers();
      console.log('\n=== 请求（未拦截）===');
      console.log('URL:', url);
      console.log('Method:', request.method());
      console.log('认证相关 headers:');
      ['authorization', 'token', 'x-token', 'x-auth-token', 'cookie', 'qtb-cloud-token', 'qtb-cloud-appid'].forEach(h => {
        if (headers[h]) console.log('  ' + h + ':', headers[h].substring(0, 200));
      });
      console.log('所有 header keys:', Object.keys(headers).join(', '));
      console.log('Body:', (request.postData() || '').substring(0, 300));
    }
  });

  // 监听响应
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('pageByParam') || url.includes('summaryByTime')) {
      console.log('\n=== 响应 ===');
      console.log('Status:', response.status());
      try {
        const body = await response.text();
        console.log('Body (前500字):', body.substring(0, 500));
      } catch(e) {
        console.log('Body 读取失败');
      }
    }
  });

  const ATTENDANCE_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
  console.log('访问:', ATTENDANCE_URL);
  await page.goto(ATTENDANCE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('URL:', page.url());

  await page.waitForTimeout(8000);

  console.log('\n=== 点击"过去一个月" ===');
  const monthBtn = await page.$('text=过去一个月');
  if (monthBtn) {
    await monthBtn.click();
    await page.waitForTimeout(5000);
  }

  await browser.close();
  console.log('\n✅ Done');
})().catch(err => { console.error('❌', err.message); process.exit(1); });
