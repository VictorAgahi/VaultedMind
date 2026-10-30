// Service Worker for VaultedMind
const CACHE_NAME = "vault-mind-cache-v2";
// Pages de l'app gardées pour s'ouvrir hors ligne (réseau d'abord, cache en secours).
const APP_SHELL_ROUTES = ["/dashboard", "/analytics", "/ai", "/profile", "/fields"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add essential assets here if needed
      return cache.addAll(["/offline", "/icon.png"]);
    }).catch(() => {
      console.log("Install: Cache skip (offline page likely missing)");
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && APP_SHELL_ROUTES.includes(url.pathname)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/offline")) || Response.error())
    );
    return;
  }

  // Fichiers statiques versionnés de Next : cache d'abord, ils ne changent jamais à URL égale.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
  }
});

// Push Notification Support
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Nouveau message", body: "Vous avez une notification." };

  const options = {
    body: data.body,
    icon: "/icon.png",
    badge: "/icon.png",
    data: data.url || "/",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Un rappel vers le tableau de bord ouvre directement la saisie du jour.
      const target = event.notification.data === "/dashboard" ? "/dashboard?new=1" : event.notification.data || "/";
      if (clientList.length > 0) {
        const client = clientList[0];
        return (client.navigate ? client.navigate(target) : Promise.resolve(client)).then((c) => (c || client).focus());
      }
      return clients.openWindow(target);
    })
  );
});
