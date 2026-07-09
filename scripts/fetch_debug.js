/**
 * Debug 脚本 - 打印 pageByParam 的完整响应
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
  const intercepted = [];

  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 拦截所有 API 请求，打印详情
  await page.route('**/*', async (route, request) => {
    const url = request.url();
    if (url.includes('pageByParam') || url.includes('summaryByTime') || url.includes('attendance') || url.includes('dimensionStatistic')) {
      const originalBody = request.postData();
      console.log('\n=== 拦截请求 ===');
      console.log('URL:', url);
      console.log('Method:', request.method());
      if (originalBody) {
        console.log('Original body:', originalBody.substring(0, 500));
        try {
          const body = JSON.parse(originalBody);
          body.startTime = startTime;
          body.endTime = endTime;
          body.pageSize = 200;
          body.pageNum = 1;

          const response = await route.fetch({
            method: request.method(),
            headers: request.headers(),
            postData: JSON.stringify(body),
          });
          const responseBody = await response.text();
          console.log('\n=== 响应 ===');
          console.log('Status:', response.status());
          console.log('Body (前1000字):', responseBody.substring(0, 1000));

          // 尝试解析看结构
          try {
            const parsed = JSON.parse(responseBody);
            console.log('\n=== 解析 ===');
            console.log('Top keys:', Object.keys(parsed));
            if (parsed.data) {
              console.log('data keys:', Object.keys(parsed.data));
              if (parsed.data.results) console.log('results count:', parsed.data.results.length);
              if (parsed.data.rows) console.log('rows count:', parsed.data.rows.length);
              if (parsed.data.list) console.log('list count:', parsed.data.list.length);
              if (parsed.data.records) console.log('records count:', parsed.data.records.length);
              if (Array.isArray(parsed.data)) console.log('data is array, count:', parsed.data.length);
            }
          } catch (e) {
            console.log('JSON parse failed:', e.message);
          }

          intercepted.push({ url, body: responseBody });
          await route.fulfill({ status: response.status(), headers: response.headers(), body: responseBody });
          return;
        } catch (e) {
          console.log('Error:', e.message);
        }
      }
    }
    await route.continue();
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
  } else {
    console.log('没找到按钮');
  }

  console.log('\n=== 总计 ' + intercepted.length + ' 个响应 ===');
  await browser.close();
})().catch(err => { console.error('❌', err.message); process.exit(1); });
