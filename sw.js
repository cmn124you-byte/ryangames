var CACHE = "ry-cache-v34";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return c.addAll([
          "./", "./index.html", "./admin.html", "./games.html", "./new.html",
          "./game.html", "./game-the-supper.html", "./lessons.html", "./download.html",
          "./request.html", "./contact.html", "./minigames.html", "./404.html",
          "./team.html", "./problems.html",
          "./style.css", "./ry-config.js", "./ry-api.js", "./data.js", "./app.js",
          "./home.js", "./minigames.js", "./manifest.json",
          "./favicon.ico", "./icons/icon-192.png", "./icons/icon-512.png"
        ]);
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
  if (url.pathname.indexOf("/_worker.js") !== -1) return;
  /* Supabase REST (cross-origin) is never intercepted — network only */
  if (url.hostname.indexOf("supabase.co") !== -1) return;

  /* Navigation requests: network-first, fall back to cached index */
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function (r) {
        if (r && r.status === 200 && r.type === "basic") {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return r;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

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
