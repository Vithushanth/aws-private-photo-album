// Private album: service worker.
// It handles no requests on purpose. The site sits behind a browser sign-in,
// and a service worker cannot show that sign-in box, so every request is left
// to the browser. This version also clears caches left by earlier versions.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
