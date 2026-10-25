// Benim Icin Yap - minimal service worker
// Strateji: ag-ilk (network-first). Escrow/bakiye verileri taze kalmali;
// yalnizca ag hatasinda son cevaba dusulur, API'ler asla kesilmez.
const SW_VERSION = "bimy-sw-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SW_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // canli veri: asla kesme
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Statik varliklari sessizce yedekle (ikon/logo/manifest)
        if (res.ok && (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.json")) {
          const clone = res.clone();
          caches.open(SW_VERSION).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
