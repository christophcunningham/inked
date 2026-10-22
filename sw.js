// Inked service worker
//
// Keeps what the app needs on the device so it opens instantly and works offline:
//   • App shell (index.html, icons, manifest): served from the device straight away,
//     then checked for a newer version in the background. If one is found the page
//     is told, so it can offer a reload.
//   • Fonts: kept after first use.
//   • Images: the most recent MAX_IMAGES are kept so the Images tab works offline.
//   • Almanac data (weather, sun, tides): network first, last saved copy when offline.
//
// Feed requests to the Worker are not touched — the app keeps its own article cache.

const SHELL_CACHE = "inked-shell";
const RUNTIME_CACHE = "inked-runtime";
const IMAGE_CACHE = "inked-images";
const KNOWN_CACHES = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
const MAX_IMAGES = 200;
const NETWORK_TIMEOUT_MS = 4000;

const SCOPE = new URL(self.registration.scope);
const SHELL_URL = SCOPE.href;
const SHELL_ASSETS = ["manifest.json", "icon.png", "favicon.ico"].map(
    (p) => new URL(p, SCOPE).href,
);

// Live alerts (NWS warnings, FAA delays) are deliberately left out: an old copy
// of those could mislead. The places search and geocoders only matter online.
const ALMANAC_HOSTS = new Set([
    "api.open-meteo.com",
    "air-quality-api.open-meteo.com",
    "archive-api.open-meteo.com",
    "api.tidesandcurrents.noaa.gov",
]);

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(SHELL_CACHE);
            await Promise.all(
                [SHELL_URL, ...SHELL_ASSETS].map(async (url) => {
                    try {
                        const res = await fetch(url, { cache: "no-cache" });
                        if (res.ok && !res.redirected) await cache.put(url, res);
                    } catch (e) {}
                }),
            );
            await self.skipWaiting();
        })(),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            for (const key of await caches.keys()) {
                if (!KNOWN_CACHES.includes(key)) await caches.delete(key);
            }
            await self.clients.claim();
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);

    if (url.origin === SCOPE.origin) {
        const isShell =
            url.pathname === SCOPE.pathname ||
            url.pathname === SCOPE.pathname + "index.html";
        if (req.mode === "navigate" && isShell) {
            event.respondWith(serveShell(event));
        } else if (SHELL_ASSETS.includes(url.origin + url.pathname)) {
            event.respondWith(staleWhileRevalidate(event, SHELL_CACHE));
        }
        return;
    }

    if (url.hostname === "fonts.gstatic.com") {
        event.respondWith(cacheFirst(event, RUNTIME_CACHE));
    } else if (url.hostname === "fonts.googleapis.com") {
        event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE));
    } else if (url.hostname === "api.tidesandcurrents.noaa.gov" && url.pathname.includes("/mdapi/")) {
        // The tide station list is large and rarely changes
        event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE));
    } else if (ALMANAC_HOSTS.has(url.hostname)) {
        event.respondWith(networkFirst(event));
    } else if (req.destination === "image" && url.protocol === "https:") {
        event.respondWith(cachedImage(event));
    }
});

// ── App shell ──────────────────────────────────────────────────────────────────

async function serveShell(event) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(SHELL_URL);
    const refresh = refreshShell(cache, cached ? cached.clone() : null);
    if (cached) {
        event.waitUntil(refresh.catch(() => {}));
        return cached;
    }
    return refresh;
}

async function refreshShell(cache, cached) {
    const res = await fetch(SHELL_URL, { cache: "no-cache" });
    if (!res.ok || res.redirected) return res;
    if (cached) {
        const [oldText, newText] = await Promise.all([
            cached.text(),
            res.clone().text(),
        ]);
        if (oldText === newText) return res;
        await cache.put(SHELL_URL, res.clone());
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        clients.forEach((c) => c.postMessage({ type: "inked-updated" }));
    } else {
        await cache.put(SHELL_URL, res.clone());
    }
    return res;
}

// ── Strategies ─────────────────────────────────────────────────────────────────

function cacheable(res) {
    // Cross-origin images and the fonts stylesheet come back "opaque" (status 0)
    return res && (res.ok || res.type === "opaque");
}

async function cacheFirst(event, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(event.request, { ignoreVary: true });
    if (hit) return hit;
    const res = await fetch(event.request);
    if (cacheable(res)) event.waitUntil(cache.put(event.request, res.clone()).catch(() => {}));
    return res;
}

async function staleWhileRevalidate(event, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(event.request, { ignoreVary: true });
    const update = fetch(event.request).then(async (res) => {
        if (cacheable(res)) await cache.put(event.request, res.clone()).catch(() => {});
        return res;
    });
    if (hit) {
        event.waitUntil(update.catch(() => {}));
        return hit;
    }
    return update;
}

// Use the network, but fall back to the saved copy when offline, when the
// request fails, or when it takes longer than NETWORK_TIMEOUT_MS.
async function networkFirst(event) {
    const req = event.request;
    const cache = await caches.open(RUNTIME_CACHE);
    const network = fetch(req).then((res) => {
        if (res.ok) event.waitUntil(cache.put(req, res.clone()).catch(() => {}));
        return res;
    });
    network.catch(() => {});
    event.waitUntil(network.catch(() => {}));
    const timeout = new Promise((r) => setTimeout(r, NETWORK_TIMEOUT_MS, "timeout"));
    try {
        const first = await Promise.race([network, timeout]);
        if (first !== "timeout" && first.ok) return first;
        const hit = await cache.match(req, { ignoreVary: true });
        if (hit) return hit;
        return first !== "timeout" ? first : await network;
    } catch (e) {
        const hit = await cache.match(req, { ignoreVary: true });
        if (hit) return hit;
        throw e;
    }
}

// ── Images ─────────────────────────────────────────────────────────────────────

let imagePuts = 0;

async function cachedImage(event) {
    const req = event.request;
    const cache = await caches.open(IMAGE_CACHE);
    const hit = await cache.match(req, { ignoreVary: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (cacheable(res)) {
        event.waitUntil(
            cache
                .put(req, res.clone())
                .then(() => {
                    if (imagePuts++ % 20 === 0) return trimImages(cache);
                })
                .catch(() => {}),
        );
    }
    return res;
}

// Cache keys come back oldest first, so drop from the front.
async function trimImages(cache) {
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - MAX_IMAGES; i++) await cache.delete(keys[i]);
}
