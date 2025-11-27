// Empty service worker to prevent 404 errors
// This file is intentionally minimal
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
