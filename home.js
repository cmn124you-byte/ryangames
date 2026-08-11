/* ============================================================
 * Ryan Games — homepage renderer
 * Fills: hero search, homeGrid (الألعاب), homeNews (الأخبار),
 * and a PWA install prompt. Runs after app.js.
 * ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(s) {
    return String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
  }

  function gameUrl(g) {
    var slug = g.slug || slugify(g.title);
    return slug ? "game-" + slug + ".html" : "game.html?id=" + g.id;
  }

  function fallbackColor(g) {
    var colors = ["#e11d48", "#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e"];
    var h = 0, s = String(g.title || "");
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  }

  function cardHTML(g) {
    var initial = esc((g.ar || g.title || "؟").charAt(0));
    return (
      '<a class="game-card" href="' + esc(gameUrl(g)) + '">' +
      '<div class="game-cover">' +
      (g.cover
        ? '<img src="' + esc(g.cover) + '" alt="' + esc(g.ar || g.title) + '" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;cover-fallback&quot; style=&quot;background:' + fallbackColor(g) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:2.4rem;font-weight:800;width:100%;height:100%&quot;>' + initial + '</div>\'" />'
        : '<div class="cover-fallback" style="background:' + fallbackColor(g) + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:2.4rem;font-weight:800;width:100%;height:100%">' + initial + '</div>') +
      "</div>" +
      '<div class="game-body">' +
      '<div class="game-name-ar">' + esc(g.ar || g.title) + "</div>" +
      "<h3>" + esc(g.title) + "</h3>" +
      '<div class="game-tags">' +
      (g.genres || []).slice(0, 3).map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") +
      "</div>" +
      '<div class="game-meta">' +
      '<span class="game-size">' + esc(g.size || "") + "</span>" +
      '<span>⬇ ' + esc(g.downloads || "0") + "</span>" +
      "</div>" +
      "</div>" +
      "</a>"
    );
  }

  function renderHomeGrid(games) {
    var grid = document.getElementById("homeGrid");
    var empty = document.getElementById("homeGridEmpty");
    if (!grid) return;
    if (!games || !games.length) {
      if (empty) empty.hidden = false;
      return;
    }
    grid.innerHTML = "";
    games.forEach(function (g) {
      grid.insertAdjacentHTML("beforeend", cardHTML(g));
    });
  }

  function renderHomeNews(news) {
    var wrap = document.getElementById("homeNews");
    if (!wrap) return;
    if (!news || !news.length) return;
    wrap.innerHTML = news.slice(0, 5).map(function (n) {
      return (
        '<article class="news-item">' +
        (n.image ? '<img src="' + esc(n.image) + '" alt="" loading="lazy" />' : "") +
        '<div class="news-body">' +
        '<h4>' + esc(n.title) + "</h4>" +
        (n.date ? '<time class="news-date">' + esc(n.date) + "</time>" : "") +
        (n.content ? "<p>" + esc(String(n.content).slice(0, 160)) + (String(n.content).length > 160 ? "…" : "") + "</p>" : "") +
        "</div>" +
        "</article>"
      );
    }).join("");
  }

  function setupHomeSearch() {
    var input = document.getElementById("homeSearchInput");
    var btn = document.getElementById("homeSearchBtn");
    function go() {
      var q = (input && input.value || "").trim();
      window.location.href = "games.html?search=" + encodeURIComponent(q);
    }
    if (btn) btn.addEventListener("click", go);
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
  }

  /* PWA install prompt (also lets the user "add to home screen") */
  var deferredPrompt = null;
  function setupInstall() {
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      var btn = document.getElementById("installPromptBtn");
      if (btn) btn.hidden = false;
    });
    var btn = document.getElementById("installPromptBtn");
    if (btn) btn.addEventListener("click", function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; btn.hidden = true; });
      } else {
        window.location.href = "download.html";
      }
    });
  }

  ready(function () {
    setupHomeSearch();
    setupInstall();

    var loaded = false;
    var tryLoad = function (n) {
      if (loaded || n > 10) return;
      if (window.RyAPI) {
        loaded = true;
        RyAPI.siteData().then(function (doc) {
          renderHomeGrid(doc.games || []);
          renderHomeNews(doc.news || []);
        }).catch(function () {
          renderHomeGrid([]);
        });
      } else {
        setTimeout(function () { tryLoad(n + 1); }, 150);
      }
    };
    tryLoad(0);
  });
})();
