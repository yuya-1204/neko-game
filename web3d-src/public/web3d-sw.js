const CACHE = "neko-web3d-20260730-v1";
const CACHE_PREFIX = "neko-web3d-";
const CORE = [
  "./neko-kumojima/",
  "./fushigi-photo-safari/",
  "./nyanko-karakuri-island/",
  "./shinkai-hikari-rescue/",
  "./iro-seirei-zukan/",
  "./neko-kumojima/manifest.webmanifest",
  "./fushigi-photo-safari/manifest.webmanifest",
  "./nyanko-karakuri-island/manifest.webmanifest",
  "./shinkai-hikari-rescue/manifest.webmanifest",
  "./iro-seirei-zukan/manifest.webmanifest",
  "./web3d-icons/neko-web3d-icon.svg",
  /*__GENERATED_WEB3D_ASSETS__*/
];
const OWNED_PATHS = [
  "neko-kumojima/",
  "fushigi-photo-safari/",
  "nyanko-karakuri-island/",
  "shinkai-hikari-rescue/",
  "iro-seirei-zukan/",
  "web3d-assets/",
  "web3d-icons/",
  "web3d-sw.js"
];
const SCOPE_PATH = new URL("./", self.location.href).pathname;

function isOwnedRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  const relativePath = url.pathname.startsWith(SCOPE_PATH)
    ? url.pathname.slice(SCOPE_PATH.length)
    : "";
  return OWNED_PATHS.some(
    (path) => relativePath === path.replace(/\/$/, "") || relativePath.startsWith(path)
  );
}

async function updateCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !isOwnedRequest(event.request)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      updateCache(event.request).catch(async () => {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        return cached ?? Response.error();
      })
    );
    return;
  }

  const refresh = updateCache(event.request);
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        event.waitUntil(refresh.catch(() => undefined));
        return cached;
      }
      return refresh;
    })
  );
});
