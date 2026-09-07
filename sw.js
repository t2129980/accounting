/**
 * 羊羊熊熊記帳 — Service Worker
 *
 * 目的：讓頁面第一次載入後就整份存在手機裡，之後每次開啟都直接從本機取用，
 * 完全不等網路 → 敲兩下就是瞬開。網路只有在按「儲存」送資料時才會用到。
 */

const CACHE = 'jz-v4';   // 改版時把版本號 +1，手機才會盡快換到新版
const ASSETS = ['./', './index.html', './manifest.json'];

// 安裝時先把頁面抓下來存好
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 換版本時清掉舊快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // 送去 Google 表單的 POST 屬於跨網域寫入，一律不攔截、直接放行
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;

  // 先回快取（瞬開），同時在背景偷偷更新，下次開啟就是新版
  e.respondWith(
    caches.match(req).then(hit => {
      const fresh = fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
