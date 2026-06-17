/**
 * 灵工打卡后台数据探索脚本
 * 使用 Playwright + 用户 Chrome Profile（复用登录状态）
 * 
 * 用法：
 *   1. 先确保 Chrome 已关闭（或启用远程调试）
 *   2. NODE_PATH=... node explore_linggong.js
 */

const { chromium } = require('playwright');
const path = require('path');

const CHROME_PROFILE = path.join(process.env.HOME, 'Library', 'Application Support', 'Google', 'Chrome');
const TARGET_URL = 'https://qtbcloud.linggongguanjia.com/app/employment/projectDataCenter/attendanceData';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

const fs = require('fs');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
  console.log('🚀 启动 Playwright 连接 Chrome Profile...');
  
  const browser = await chromium.launchPersistentContext(
    path.join(CHROME_PROFILE, 'Default'),
    {
      headless: false,
      channel: 'chrome',
      viewport: { width: 1440, height: 900 },
      locale: 'zh-CN',
    }
  );

  const page = await browser.newPage();
  
  console.log('📡 访问灵工打卡考勤页面...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  
  // 等待页面加载
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log('📍 当前URL:', currentUrl);
  console.log('📄 页面标题:', await page.title());
  
  // 截图
  const screenshotPath = path.join(SCREENSHOT_DIR, 'linggong_attendance.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('📸 截图已保存:', screenshotPath);
  
  // 提取页面文本内容（前3000字符）
  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '');
  console.log('\n📝 页面文本内容（前2000字符）:\n');
  console.log(bodyText.substring(0, 2000));
  
  // 提取表格数据
  const tables = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('table').forEach((table, i) => {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
      const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
      );
      results.push({ index: i, headers, rows: rows.slice(0, 10) }); // 前10行
    });
    return results;
  });
  
  if (tables.length > 0) {
    console.log('\n📊 发现表格数据:');
    tables.forEach(t => {
      console.log(`\n--- 表格 ${t.index + 1} ---`);
      console.log('列头:', t.headers.join(' | '));
      t.rows.forEach((row, ri) => {
        console.log(`行${ri + 1}:`, row.join(' | '));
      });
    });
  } else {
    console.log('\n⚠️ 未找到表格数据（可能需要登录或页面未完全加载）');
  }
  
  // 提取所有按钮/链接（寻找导出功能）
  const buttons = await page.evaluate(() => {
    const els = [];
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      const text = el.innerText.trim();
      if (text && text.length < 30) {
        els.push({ tag: el.tagName, text, class: el.className.substring(0, 80) });
      }
    });
    return els;
  });
  
  console.log('\n🔘 页面按钮/链接:');
  buttons.forEach(b => {
    if (b.text.includes('导出') || b.text.includes('下载') || b.text.includes('Excel') || b.text.includes('export') || b.text.includes('排班') || b.text.includes('考勤') || b.text.includes('打卡')) {
      console.log(`  ⭐ [${b.tag}] ${b.text} (class: ${b.class})`);
    }
  });
  
  // 检查左侧菜单
  const menuItems = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('.ant-menu-item, .menu-item, [class*="menu"] a, [class*="sidebar"] a, nav a').forEach(el => {
      const text = el.innerText.trim();
      if (text && text.length < 30) items.push(text);
    });
    return [...new Set(items)];
  });
  
  if (menuItems.length > 0) {
    console.log('\n📋 菜单项:');
    menuItems.forEach(m => console.log('  -', m));
  }
  
  console.log('\n✅ 探索完成！');
  await browser.close();
})().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
