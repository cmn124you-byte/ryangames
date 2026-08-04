var CACHE = "ry-cache-v31";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return c.addAll(["./", "./index.html", "./game.html", "./style.css", "./data.js", "./app.js", "./minigames.html", "./minigames.js", "./manifest.json"]);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);

  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.indexOf("/api/") !== -1) return;

  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r && r.status === 200 && r.type === "basic") {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
