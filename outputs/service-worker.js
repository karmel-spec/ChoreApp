const CACHE_NAME = "teamwork-chores-beta-2026-06-12";

const APP_SHELL = [
  "/",
  "/index.html",
  "/app",
  "/beta-guide",
  "/beta-testing-guide.html",
  "/family-chore-dashboard-prototype.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/teamwork-chores-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("/offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const refresh = fetch(event.request)
        .then(response => {
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});

self.addEventListener("push", event => {
  const payload = event.data?.json?.() || {};
  const title = payload.title || "Teamwork Chores";
  const options = {
    body: payload.body || "You have a Teamwork Chores update.",
    icon: "/icons/teamwork-chores-icon.svg",
    badge: "/icons/teamwork-chores-icon.svg",
    data: {
      url: payload.url || "/app"
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
      const existing = windows.find(client => client.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
