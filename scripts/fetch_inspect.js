/**
 * 调试：查看翻页按钮是否存在
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
  let summaryCount = 0;

  // 补全 total
  await page.route('**/pageByParam', async (route, request) => {
    const response = await route.fetch();
    const body = await response.text();
    try {
      const parsed = JSON.parse(body);
      if (parsed.success && parsed.data) {
        if (summaryCount > 0 && (!parsed.data.total || parsed.data.total === 0)) {
          parsed.data.total = summaryCount;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(parsed) });
        return;
      }
    } catch (e) {}
    await route.fulfill({ response });
  });

  page.on('response', async response => {
    if (response.url().includes('summaryByTime') && response.status() === 200) {
      try {
        const d = JSON.parse(await response.text()).data;
        if (d.arrangedNumber > summaryCount) {
          summaryCount = d.arrangedNumber;
          console.log('📈 summary updated: ' + summaryCount);
        }
      } catch (e) {}
    }
  });

  await page.goto('https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  console.log('summaryCount:', summaryCount);

  // 点击过去一个月
  const btn = await page.$('text=过去一个月');
  if (btn) {
    await btn.click();
    await page.waitForTimeout(6000);
  }
  console.log('summaryCount after click:', summaryCount);

  // 截图查看
  await page.screenshot({ path: 'screenshots/page_state.png', fullPage: true });

  // 检查分页器
  const paginationInfo = await page.evaluate(() => {
    const pag = document.querySelector('.ant-pagination');
    if (!pag) return 'No pagination found';

    const items = pag.querySelectorAll('.ant-pagination-item');
    const next = pag.querySelector('.ant-pagination-next');
    const total = pag.querySelector('.ant-pagination-total-text');

    return {
      hasPagination: true,
      pageItems: items.length,
      nextDisabled: next ? next.classList.contains('ant-pagination-disabled') : 'no next btn',
      totalText: total ? total.textContent : 'none',
      innerHTML: pag.innerHTML.substring(0, 500),
    };
  });
  console.log('Pagination:', JSON.stringify(paginationInfo, null, 2));

  // 尝试用页码跳转
  console.log('\n尝试点击页码 2...');
  const page2 = await page.$('.ant-pagination-item-2').catch(() => null);
  if (page2) {
    console.log('找到页码2，点击');
    await page2.click();
    await page.waitForTimeout(3000);
  } else {
    console.log('没有页码2');
  }

  await browser.close();
})().catch(err => { console.error('❌', err.message); process.exit(1); });
