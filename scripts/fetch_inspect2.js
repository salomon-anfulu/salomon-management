/**
 * 调试：查看页面结构找分页/加载方式
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
  let apiCount = 0;

  page.on('response', async response => {
    if (response.url().includes('pageByParam') && response.status() === 200) {
      apiCount++;
      try {
        const parsed = JSON.parse(await response.text());
        if (parsed.data?.results) {
          console.log('API #' + apiCount + ': 第' + parsed.data.pageNum + '页, ' + parsed.data.results.length + '条');
        }
      } catch (e) {}
    }
  });

  await page.goto('https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // 点击过去一个月
  const btn = await page.$('text=过去一个月');
  if (btn) { await btn.click(); await page.waitForTimeout(6000); }

  console.log('\n=== 页面结构探测 ===');
  const info = await page.evaluate(() => {
    const results = [];

    // 找所有可能的分页/加载元素
    const selectors = [
      '.ant-pagination', '.pagination', '[class*="page"]',
      '[class*="load-more"]', '[class*="loadMore"]', '.load-more',
      '[class*="scroll"]', '.ant-table-pagination',
      'button', '[role="button"]',
    ];

    selectors.forEach(sel => {
      const els = document.querySelectorAll(sel);
      els.forEach((el, i) => {
        if (i < 3) { // 每种只看前3个
          const text = el.textContent?.trim().substring(0, 50);
          if (text && text.length < 30) {
            results.push(sel + ': "' + text + '" (' + el.className?.substring(0, 50) + ')');
          }
        }
      });
    });

    // 找表格行数
    const rows = document.querySelectorAll('.ant-table-row, tr[class*="row"]');
    results.push('表格行数: ' + rows.length);

    // 查看主内容区滚动元素
    const scrollContainers = document.querySelectorAll('[class*="scroll"], .ant-table-body, .ant-table-content');
    results.push('滚动容器: ' + scrollContainers.length);

    // 找"下一页"/"更多"文本
    const allText = document.body.innerText;
    if (allText.includes('下一页')) results.push('页面含"下一页"文字');
    if (allText.includes('加载更多')) results.push('页面含"加载更多"文字');
    if (allText.includes('查看更多')) results.push('页面含"查看更多"文字');

    return results;
  });
  info.forEach(s => console.log('  ' + s));

  // 尝试滚动
  console.log('\n=== 尝试滚动表格触发加载 ===');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const tableBody = document.querySelector('.ant-table-body');
      if (tableBody) tableBody.scrollTop = tableBody.scrollHeight;
      const main = document.querySelector('.ant-layout-content, main, .content');
      if (main) main.scrollTop = main.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    console.log('  滚动 ' + (i+1) + ' 次, API调用数: ' + apiCount);
  }

  await browser.close();
})().catch(err => { console.error('❌', err.message); process.exit(1); });
