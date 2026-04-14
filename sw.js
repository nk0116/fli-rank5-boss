// Service Worker for GameLog
// バージョンを変更するとキャッシュが全更新される
const CACHE_VERSION = 'v4';
const CACHE_NAME = 'gamelog-' + CACHE_VERSION;

// キャッシュ対象のファイル一覧
const CACHE_FILES = [
  '/',
  '/index.html',
  '/pages/fl/index.html',
  '/pages/fl/rank5-boss.html',
  '/pages/fl/level-up.html'
];

// インストール時: 全ファイルをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES);
    }).then(() => {
      // 新しいSWを即座にアクティブにする
      return self.skipWaiting();
    })
  );
});

// アクティベート時: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('gamelog-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // 既存のページを即座にコントロール
      return self.clients.claim();
    })
  );
});

// フェッチ時: キャッシュファースト + バックグラウンド更新
self.addEventListener('fetch', (event) => {
  // GETリクエストのみキャッシュ対象
  if (event.request.method !== 'GET') return;

  // 同一オリジンのリクエストのみ
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // バックグラウンドでネットワークから取得してキャッシュを更新
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // ネットワークエラー時は何もしない（キャッシュを返す）
      });

      // キャッシュがあればキャッシュを返す、なければネットワークを待つ
      return cachedResponse || fetchPromise;
    })
  );
});
