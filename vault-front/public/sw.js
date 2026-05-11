/* eslint-disable no-restricted-globals */

// Service Worker for VaultedMind
const CACHE_NAME = "vault-mind-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add essential assets here if needed
      return cache.addAll(["/offline"]);
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
  // Pass-through for now, or add caching strategy
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/offline") || Response.error();
      })
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
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow(event.notification.data);
    })
  );
});
