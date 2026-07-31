/**
 * ========================================
 * Service Worker - 安福路 Salomon 兼职管理系统
 * ========================================
 * 策略：
 *   - HTML 文档（导航请求）：network-only
 *     → 永远拿最新 index.html，避免引用旧 ?v= 加载旧 JS
 *   - JS/CSS 等静态资源：stale-while-revalidate
 *     → 先返回缓存（快速渲染），后台拉新版下次生效
 *   - version.json：network-only（不缓存）
 *     → 版本探针永远拿到真实最新值
 *   - 其他（图片/字体/图表CDN）：cache-first，7天过期
 *
 * 通信协议：
 *   - 页面 postMessage({type:'CLEAR_CACHE'}) → SW 清空所有缓存并跳过 waiting
 *   - SW 'controllerchange' 事件触发页面 reload（在探针逻辑中处理）
 */

const SW_VERSION = 'sw-v153';
const CACHE_STATIC = 'static-v153';
const CACHE_IMG = 'img-v153';

// 需要绕过 SW 的路径（直接走网络）
const NETWORK_ONLY_PATHS = [
  '/version.json',
  '/index.html',
  '/login.html',
  '/' // 根路径
];

// HTML 文档名单（精确匹配 pathname）
const HTML_PATHS = new Set(['/', '/index.html', '/login.html']);

self.addEventListener('install', (event) => {
  // 跳过等待，激活立即生效（配合探针的 controllerchange reload）
  self.skipWaiting();
  console.log('[SW] installed', SW_VERSION);
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // v150: 清掉所有旧缓存（含可能残留的旧 ?v= 坏脚本），彻底切断旧版循环
    // 注：index.html 探针也会在版本变化时清 Cache Storage，此处为双保险
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
    console.log('[SW] activated & claimed', SW_VERSION);
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 只拦截同源 GET 请求
  if (req.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // version.json：永不缓存
  if (url.pathname === '/version.json' || url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // HTML 导航请求：network-only
  if (req.mode === 'navigate' || HTML_PATHS.has(url.pathname)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          // 成功时把最新 HTML 存入缓存（供离线兜底）
          const copy = resp.clone();
          caches.open(CACHE_STATIC).then(c => c.put(req, copy)).catch(()=>{});
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // JS/CSS：stale-while-revalidate
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req).then(resp => {
        // ?v= 改变时 URL 不同，会自然产生新缓存条目；旧 ?v= 的条目通过 LRU 自动清理
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_STATIC).then(c => c.put(req, copy)).catch(()=>{});
        }
        return resp;
      }).catch(() => cached); // 离线时回退缓存
      return cached || fetchPromise;
    })());
    return;
  }

  // 图片/字体/其他：cache-first，TTL 7 天
  if (req.destination === 'image' || req.destination === 'font' || 
      url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?)$/i)) {
    event.respondWith((async () => {
      const cached = await caches.match(req, { ignoreSearch: false });
      if (cached) {
        // 检查 TTL（通过 date header）
        const dateHeader = cached.headers.get('date');
        if (dateHeader) {
          const age = Date.now() - new Date(dateHeader).getTime();
          if (age < 7 * 24 * 60 * 60 * 1000) return cached;
        } else {
          return cached;
        }
      }
      try {
        const resp = await fetch(req);
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_IMG).then(c => c.put(req, copy)).catch(()=>{});
        }
        return resp;
      } catch (e) {
        return cached || Response.error();
      }
    })());
    return;
  }

  // 默认：正常网络请求
  // 不调用 event.respondWith，让浏览器接管
});

// 接收页面消息
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('[SW] all caches cleared by page request');
      // 通知所有 client 缓存已清
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.postMessage({ type: 'CACHE_CLEARED' }));
    })());
  } else if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
