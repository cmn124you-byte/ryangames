(function () {
  "use strict";

  var K_GAMES = "ry_games";
  var K_LESSONS = "ry_lessons";
  var K_UPDATES = "ry_updates";
  var K_SETTINGS = "ry_settings";
  var K_REQUESTS = "ry_requests";
  var K_COMMENTS = "ry_comments";
  var S_ADMIN = "ry_admin_ok";
  var S_OWNER = "ry_owner_ok";
  var OWNER_EMAIL = "cmn124you@gmail.com";

  var data = {
    games: [],
    lessons: [],
    updates: [],
    settings: null,
    requests: [],
  };

  /* ---------- Storage helpers ---------- */
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function load(key, def) {
    try {
      var raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {}
    return def;
  }

  function mergeDefaults(stored, defaults) {
    var d = null;
    for (var di = 0; di < defaults.length; di++) if (defaults[di].id === stored.id) { d = defaults[di]; break; }
    return d;
  }

  function loadAll() {
    data.games = normArray(load(K_GAMES, null), DEFAULT_GAMES, function (g) {
      var def = mergeDefaults(g, DEFAULT_GAMES);
      g = Object.assign({}, def, g);
      if (def) {
        if (g.min === "" && def.min) g.min = def.min;
        if (g.rec === "" && def.rec) g.rec = def.rec;
      }
      if (!Array.isArray(g.platforms)) g.platforms = [];
      if (!Array.isArray(g.genres)) g.genres = [];
      return g;
    });
    data.lessons = normArray(load(K_LESSONS, null), DEFAULT_LESSONS, function (l) {
      var def = mergeDefaults(l, DEFAULT_LESSONS);
      return Object.assign({}, def, l);
    });
    if (load("ry_data_v", 0) < 2) {
      var known = {};
      data.lessons.forEach(function (l) { known[l.id] = true; });
      DEFAULT_LESSONS.forEach(function (d) { if (!known[d.id]) data.lessons.push(Object.assign({}, d)); });
      store("ry_data_v", 2);
    }
    data.updates = normArray(load(K_UPDATES, null), DEFAULT_UPDATES, function (u) {
      var def = mergeDefaults(u, DEFAULT_UPDATES);
      return Object.assign({}, def, u);
    });
    if (load("ry_games_v", 0) < 1) {
      var haveG = {};
      data.games.forEach(function (g) { haveG[g.id] = true; });
      DEFAULT_GAMES.forEach(function (d) { if (!haveG[d.id]) data.games.push(Object.assign({}, d)); });
      var haveU = {};
      data.updates.forEach(function (u) { haveU[u.id] = true; });
      DEFAULT_UPDATES.forEach(function (d) { if (!haveU[d.id]) data.updates.push(Object.assign({}, d)); });
      store("ry_games_v", 1);
      store(K_GAMES, data.games);
      store(K_UPDATES, data.updates);
    }
    var s = load(K_SETTINGS, {});
    data.settings = Object.assign({}, DEFAULT_SETTINGS, (s && typeof s === "object" && !Array.isArray(s)) ? s : {});
    if (!data.settings.site || typeof data.settings.site !== "object") data.settings.site = {};
    data.settings.site = Object.assign({}, DEFAULT_SETTINGS.site, data.settings.site);
    if (!Array.isArray(data.settings.slides)) data.settings.slides = DEFAULT_SETTINGS.slides.map(function (x) { return Object.assign({}, x); });
    if (!data.settings.socials || typeof data.settings.socials !== "object") data.settings.socials = Object.assign({}, DEFAULT_SETTINGS.socials);
    if (!data.settings.ads || typeof data.settings.ads !== "object") data.settings.ads = Object.assign({}, DEFAULT_SETTINGS.ads);
    data.requests = load(K_REQUESTS, []);
    if (!Array.isArray(data.requests)) data.requests = [];
  }

  function normArray(stored, defaults, fix) {
    if (!Array.isArray(stored) || !stored.length) return defaults.map(function (x) { return Object.assign({}, x); });
    var out = stored.slice();
    if (fix) out = out.map(fix);
    return out;
  }

  function saveAll() {
    var ok = store(K_GAMES, data.games);
    ok = store(K_LESSONS, data.lessons) && ok;
    ok = store(K_UPDATES, data.updates) && ok;
    ok = store(K_SETTINGS, data.settings) && ok;
    if (!ok) alert("تعذّر الحفظ! مساحة التخزين في المتصفح ممتلئة.\nالحل: قلّل حجم الصور أو احذف بعض العناصر ثم جرّب مجددًا.");
    return ok;
  }

  /* ---------- Helpers ---------- */
  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function esc(s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hashPass(pw) {
    var h = 5381;
    pw = String(pw || "");
    for (var i = 0; i < pw.length; i++) {
      h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
    }
    return "h" + (h >>> 0).toString(36) + ":" + pw.length;
  }

  function hasPass() { return !!data.settings.adminPass; }

  function isLoggedIn() {
    try { return sessionStorage.getItem(S_ADMIN) === "1"; }
    catch (e) { return false; }
  }

  function setLoggedIn(v) {
    try { sessionStorage.setItem(S_ADMIN, v ? "1" : "0"); } catch (e) {}
  }

  function isOwner() {
    try { if (sessionStorage.getItem(S_OWNER) === "1") return true; } catch (e) {}
    var em = OWNER_EMAIL;
    if (!em) return false;
    var acct = null;
    try { acct = JSON.parse(localStorage.getItem("ry_acct") || "null"); } catch (e) {}
    return !!acct && !!acct.email && String(acct.email).trim().toLowerCase() === em;
  }

  function setOwner(v) {
    try { sessionStorage.setItem(S_OWNER, v ? "1" : "0"); } catch (e) {}
  }

  function applyOwnerLock() {
    var tab = document.querySelector('#adminTabs .tab[data-tab="settings"]');
    var btn = document.getElementById("adminOwnerLockBtn");
    if (tab) tab.hidden = !isOwner();
    if (btn) {
      btn.hidden = isOwner();
      if (!isOwner()) btn.textContent = "🔓 فتح إعدادات المالك";
    }
    var sf = document.getElementById("settingsForm");
    if (sf) {
      var fields = sf.querySelectorAll("input, select, textarea, button");
      for (var i = 0; i < fields.length; i++) fields[i].disabled = !isOwner();
    }
  }

  var GOOGLE_CLIENT_ID = "362549856848-fe53mnl84pv90e5n8f5tid2sce9darqa.apps.googleusercontent.com";

  function parseJwt(t) {
    try {
      var p = t.split(".")[1];
      p = p.replace(/-/g, "+").replace(/_/g, "/");
      while (p.length % 4) p += "=";
      return JSON.parse(decodeURIComponent(escape(atob(p))));
    } catch (e) { return null; }
  }

  function googleReady() {
    return typeof window.google !== "undefined" && window.google && window.google.accounts && window.google.accounts.id;
  }

  function handleGoogleCredential(res) {
    if (!res || !res.credential) return null;
    var d = parseJwt(res.credential);
    if (!d) return null;
    return { email: String(d.email || "").trim().toLowerCase(), verified: !!d.email_verified };
  }

  function renderGoogleButton(box, msg, backdrop) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      ux_mode: "popup",
      auto_select: false,
      callback: function (res) {
        var info = handleGoogleCredential(res);
        if (!info) { msg.textContent = "تعذّر قراءة بيانات الحساب."; msg.className = "mg-msg lose"; return; }
        if (info.email === OWNER_EMAIL && info.verified) {
          setOwner(true);
          applyOwnerLock();
          document.body.removeChild(backdrop);
          document.body.style.overflow = "";
          var tab = document.querySelector('#adminTabs .tab[data-tab="settings"]');
          if (tab) tab.click();
        } else {
          msg.textContent = "الوصول مرفوض — البريد المسجل به " + info.email + " ليس بريد صاحب الموقع.";
          msg.className = "mg-msg lose";
        }
      }
    });
    google.accounts.id.renderButton(box, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      locale: "ar",
    });
    google.accounts.id.prompt();
  }

  function openGoogleOwnerModal() {
    var backdrop = el("div", "modal-backdrop", "");
    var modal = el("div", "modal modal-sm", "");
    backdrop.appendChild(modal);
    var head = el("div", "modal-head", "");
    head.appendChild(el("h3", "", "🔐 دخول المالك"));
    modal.appendChild(head);
    modal.appendChild(el("p", "hint", "يجب أن تكون مسجلاً في قوقل بهذا البريد فقط:"));
    modal.appendChild(el("p", "hint", '<strong style="direction:ltr;unicode-bidi:embed">' + OWNER_EMAIL + "</strong>"));
    var box = el("div", "google-btn-box", "");
    box.style.cssText = "display:flex;justify-content:center;margin:1rem 0;";
    modal.appendChild(box);
    var msg = el("p", "mg-msg", "");
    modal.appendChild(msg);
    var note = el("p", "hint", "جارٍ تجهيز زر الدخول...");
    modal.appendChild(note);
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) { document.body.removeChild(backdrop); document.body.style.overflow = ""; }
    });

    if (!GOOGLE_CLIENT_ID) {
      note.textContent = "⚠ لم يُضبط تسجيل دخول قوقل بعد في هذا الموقع.";
      msg.textContent = "أضف Google Client ID في كود الموقع حتى يظهر الزر.";
      msg.className = "mg-msg lose";
      return;
    }

    var show = function () {
      if (googleReady()) renderGoogleButton(box, msg, backdrop);
      else { note.textContent = "تعذّر تحميل تسجيل الدخول من قوقل. تحقق من الاتصال بالإنترنت."; }
    };

    if (googleReady()) show();
    else {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (googleReady() || tries > 40) { clearInterval(t); show(); }
      }, 250);
    }
  }

  function unlockOwner() {
    openGoogleOwnerModal();
  }

  var PALETTE = [
    "linear-gradient(135deg,#e11d48,#7c0f2b)",
    "linear-gradient(135deg,#7c3aed,#312e81)",
    "linear-gradient(135deg,#0ea5e9,#0c4a6e)",
    "linear-gradient(135deg,#f59e0b,#92400e)",
    "linear-gradient(135deg,#10b981,#064e3b)",
    "linear-gradient(135deg,#f43f5e,#4c1d95)",
  ];

  function fallbackGradient(g) {
    return PALETTE[(g && g.id ? g.id : 0) % PALETTE.length];
  }

  var PLATFORM_META = {
    windows: { icon: "🖥️", ar: "ويندوز" },
    android: { icon: "🤖", ar: "أندرويد" },
    iphone: { icon: "🍎", ar: "آيفون" },
    mobile: { icon: "📱", ar: "موبايل" },
    linux: { icon: "🐧", ar: "لينكس" },
    mac: { icon: "🍏", ar: "ماك" },
    playstation: { icon: "🎮", ar: "بلايستيشن" },
    xbox: { icon: "🎮", ar: "إكس بوكس" },
    nintendo: { icon: "🎮", ar: "نينتندو" },
    pc: { icon: "🖥️", ar: "PC" },
  };

  function canonPf(p) {
    var s = String(p || "").trim().toLowerCase();
    if (s === "pc" || s === "windows" || s === "win" || s === "ويندوز") return "windows";
    if (s === "android" || s === "اندرويد") return "android";
    if (s === "iphone" || s === "ios" || s === "ايفون" || s === "آيفون") return "iphone";
    if (s === "mobile" || s === "موبايل" || s === "هاتف" || s === "جوال") return "mobile";
    if (s === "linux" || s === "لينكس") return "linux";
    if (s === "mac" || s === "macos" || s === "ماك") return "mac";
    if (s === "playstation" || s === "ps" || s === "ps4" || s === "ps5" || s === "بلايستيشن") return "playstation";
    if (s === "xbox" || s === "اكس بوكس" || s === "إكس بوكس") return "xbox";
    if (s === "nintendo" || s === "نينتندو" || s === "سويتش") return "nintendo";
    return s;
  }

  function platLabel(p) {
    var c = canonPf(p);
    return PLATFORM_META[c] ? PLATFORM_META[c].icon + " " + PLATFORM_META[c].ar : String(p);
  }

  function platBadgesHTML(g) {
    var arr = g && Array.isArray(g.platforms) ? g.platforms : [];
    if (!arr.length) return "";
    return '<div class="game-pf">' + arr.map(function (p) {
      return '<span class="pf-badge">' + esc(platLabel(p)) + "</span>";
    }).join("") + "</div>";
  }

  function gameById(id) {
    return data.games.filter(function (g) { return g.id === id; })[0];
  }

  function gamePageHref(id) {
    return "game.html?id=" + encodeURIComponent(id);
  }

  function gotoGame(id) {
    window.location.href = gamePageHref(id);
  }

  function queryParams() {
    var out = {};
    location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) {
      out[k] = decodeURIComponent(v);
    });
    return out;
  }

  function slugify(s) {
    return String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
  }

  function setMeta(name, content) {
    var m = document.querySelector('meta[name="' + name + '"]');
    if (m) m.setAttribute("content", content);
  }

  function setOg(prop, content) {
    var m = document.querySelector('meta[property="' + prop + '"]');
    if (m) m.setAttribute("content", content);
  }

  function imgHTML(g, cls) {
    if (g && g.cover) {
      return '<img src="' + esc(g.cover) + '" alt="' + esc(g.title) + '" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;' + cls + ' cover-fallback&quot; style=&quot;background:' + fallbackGradient(g) + '&quot;>' + esc((g.ar || g.title).charAt(0)) + '</div>\'" />';
    }
    return '<div class="' + cls + ' cover-fallback" style="background:' + fallbackGradient(g) + '">' + esc((g && g.ar || g && g.title || "؟").charAt(0)) + "</div>";
  }

  function isNew(g) {
    return (Date.now() - new Date(g.date).getTime()) < 30 * 24 * 3600 * 1000;
  }

  /* ---------- Per-game decorative colors ---------- */
  var NAME_PALETTE = [
    ["#f43f5e", "#fb7185"], ["#8b5cf6", "#a78bfa"], ["#0ea5e9", "#38bdf8"],
    ["#10b981", "#34d399"], ["#f59e0b", "#fbbf24"], ["#ec4899", "#f472b6"],
    ["#06b6d4", "#22d3ee"], ["#ef4444", "#f87171"], ["#3b82f6", "#60a5fa"],
    ["#a855f7", "#c084fc"],
  ];

  function gameColors(g) {
    var h = 0;
    String((g && g.id) || 0).split("").forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) | 0; });
    var p = NAME_PALETTE[Math.abs(h) % NAME_PALETTE.length];
    return { a: p[0], b: p[1] };
  }

  function nameFancy(g, text) {
    var c = gameColors(g);
    return '<span class="name-fancy" style="--gc-a:' + c.a + ";--gc-b:" + c.b + '">' + esc(text || "") + "</span>";
  }

  function descColor(g) {
    return gameColors(g).a;
  }

  function coverOverlayHTML(g) {
    return '<div class="cover-overlay">' +
      '<p class="ov-desc">' + esc(g.desc || "") + "</p>" +
      '<div class="ov-actions">' +
      (g.buy ? '<a class="ov-btn ov-buy" href="' + esc(g.buy) + '" target="_blank" rel="noopener">🛒 شراء اللعبة</a>' : "") +
      (g.link ? '<button class="ov-btn ov-dl" type="button">⬇ تحميل</button>' : "") +
      "</div></div>";
  }

  function flipBackHTML(g) {
    return '<div class="flip-back">' +
      '<span class="fp-team">🎮 فريق ريان</span>' +
      '<p class="fp-desc" style="color:' + descColor(g) + '">' + esc(g.desc || "") + "</p>" +
      '<div class="fp-badges">' +
      '<span class="fp-badge">🌐 نسبة الترجمة: ' + esc(g.tradRate || "100%") + "</span>" +
      '<span class="fp-badge">⏱ التركيب: ' + esc(g.installTime || "5 دقائق") + "</span>" +
      '<span class="fp-badge">💻 ' + esc(g.compat || "Windows") + "</span>" +
      (g.isApp ? '<span class="fp-badge fp-app">📱 تطبيق</span>' : "") +
      (g.arLocal ? '<span class="fp-badge fp-ar">🌍 معرّبة</span>' : "") +
      (g.free ? '<span class="fp-badge fp-free">🎁 مجانية</span>' : "") +
      "</div>" +
      '<div class="fp-actions">' +
      '<button class="fp-btn fp-dl" type="button">⬇ تحميل التعريب</button>' +
      (g.buy ? '<a class="fp-btn fp-buy" href="' + esc(g.buy) + '" target="_blank" rel="noopener">🛒 شراء اللعبة</a>' : "") +
      "</div>" +
      "</div>";
  }

  function extrasHTML(g) {
    var parts = [];
    if (g && g.isApp) parts.push('<span class="meta-chip chip-app">📱 تطبيق</span>');
    if (g && g.arLocal) parts.push('<span class="meta-chip chip-ar">🌍 لعبة معرّبة</span>');
    if (g && g.free) parts.push('<span class="meta-chip chip-free">🎁 لعبة مجانية</span>');
    return parts.length ? '<div class="gp-extras">' + parts.join("") + "</div>" : "";
  }

  function wireOverlay(card, id) {
    var ov = card.querySelector(".cover-overlay");
    if (ov) ov.addEventListener("click", function (e) { e.stopPropagation(); });
    var ovDl = card.querySelector(".ov-dl");
    if (ovDl) ovDl.addEventListener("click", function (e) {
      e.stopPropagation();
      openDownloadModal(id);
    });
  }

  function wireFlip(card, id) {
    var back = card.querySelector(".flip-back");
    if (back) back.addEventListener("click", function (e) { e.stopPropagation(); });
    var dlBtn = card.querySelector(".fp-dl");
    if (dlBtn) dlBtn.addEventListener("click", function () { openDownloadModal(id); });
  }

  /* ---------- Hero slider ---------- */
  function spawnHeroFx() {
    var hero = document.querySelector(".hero");
    if (!hero || hero.dataset.fx === "0") return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hero.dataset.fx = "0";
      return;
    }
    hero.querySelectorAll(".gb-particle").forEach(function (p) { p.remove(); });
    var icons = ["🎮", "🕹️", "👾", "🎧", "💀", "⚔️", "🔥", "📱", "✨", "🔫"];
    for (var i = 0; i < 14; i++) {
      var p = document.createElement("span");
      p.className = "gb-particle";
      p.textContent = icons[Math.floor(Math.random() * icons.length)];
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = (7 + Math.random() * 8).toFixed(2) + "s";
      p.style.animationDelay = (Math.random() * 10).toFixed(2) + "s";
      p.style.fontSize = (0.9 + Math.random() * 0.9).toFixed(2) + "rem";
      hero.appendChild(p);
    }
  }

  function renderHero() {
    var track = document.getElementById("heroTrack");
    var dotsWrap = document.getElementById("heroDots");
    if (!track || !dotsWrap) return;
    track.innerHTML = "";
    dotsWrap.innerHTML = "";

    var slides = (data.settings.slides || []).filter(function (s) { return gameById(s.gameId); });

    if (slides.length === 0 && data.games[0]) {
      slides = [{ id: 0, gameId: data.games[0].id, badge: "تعريب جديد", tagline: "اكتشف أحدث تعريب." }];
    }

    slides.forEach(function (slide) {
      var g = gameById(slide.gameId);
      var s = el("div", "hero-slide");
      s.style.background = "radial-gradient(ellipse at 20% 15%, rgba(225,29,72,0.22), transparent 55%), radial-gradient(ellipse at 80% 85%, rgba(251,113,133,0.18), transparent 55%), " + fallbackGradient(g) + "55";
      s.innerHTML =
        '<div class="container hero-slide-inner">' +
        '<div class="hero-slide-copy">' +
        (slide.badge ? '<span class="hero-slide-badge">' + esc(slide.badge) + "</span>" : "") +
        "<h2>" + esc(g.title) + "</h2>" +
        '<span class="hero-ar">' + esc(g.ar) + "</span>" +
        "<p>" + esc(slide.tagline) + "</p>" +
        '<div class="hero-slide-actions">' +
        '<a class="btn-hero" href="' + gamePageHref(g.id) + '">صفحة التعريب</a>' +
        '<a class="btn-hero ghost" href="games.html">تصفح جميع الألعاب</a>' +
        "</div></div>" +
        '<div class="hero-art">' +
        (g.cover
          ? '<img src="' + esc(g.cover) + '" alt="" loading="lazy" />'
          : '<div class="hero-art-fallback" style="background:' + fallbackGradient(g) + '">' + esc(g.emoji || g.ar.charAt(0)) + "</div>") +
        "</div></div>";
      track.appendChild(s);

      var dot = el("button", "", "");
      dot.setAttribute("aria-label", "شريحة");
      dot.addEventListener("click", function () {
        go(Array.prototype.indexOf.call(track.children, s));
      });
      dotsWrap.appendChild(dot);
    });

    var dots = dotsWrap.children;
    var index = 0;
    var timer = null;

    function go(i) {
      if (!track.children.length) return;
      index = (i + track.children.length) % track.children.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      Array.prototype.forEach.call(dots, function (d, j) {
        d.classList.toggle("active", j === index);
      });
    }

    function next() { go(index + 1); }
    function start() { timer = setInterval(next, 5000); }
    function stop() { if (timer) clearInterval(timer); }

    go(0);
    start();
    track.addEventListener("mouseenter", stop);
    track.addEventListener("mouseleave", start);
    spawnHeroFx();
  }

  /* ---------- Stats ---------- */
  function renderStats() {
    var wrap = document.getElementById("statsGrid");
    if (!wrap) return;
    var total = data.games.length;
    var dl = data.games.reduce(function (sum, g) { return sum + (parseInt(g.downloads) || 0); }, 0);
    var items = [
      { num: total, label: "لعبة معرّبة" },
      { num: dl >= 1000 ? (dl / 1000).toFixed(1).replace(/\.0$/, "") + "K" : dl, label: "تنزيل" },
      { num: data.lessons.length, label: "دروس" },
      { num: "عربي", label: "اللغة" },
    ];
    wrap.innerHTML = "";
    items.forEach(function (s) {
      wrap.appendChild(el("div", "stat", '<div class="stat-num">' + esc(s.num) + "</div><div class=\"stat-label\">" + s.label + "</div>"));
    });
  }

  /* ---------- New arabizations ---------- */
  function renderNew() {
    var wrap = document.getElementById("newGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    data.games.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 6).forEach(function (g) {
      var card = el("div", "mini-card");
      card.innerHTML =
        '<div class="mini-cover">' +
        (isNew(g) ? '<span class="mini-badge">جديد</span>' : "") +
        imgHTML(g, "mini-cover-img") +
        coverOverlayHTML(g) +
        "</div>" +
        '<div class="mini-body">' +
        "<h4>" + esc(g.title) + "</h4>" +
        '<div class="mini-ar">' + nameFancy(g, g.ar) + "</div>" +
        platBadgesHTML(g) +
        extrasHTML(g) +
        '<span class="mini-date">' + esc(g.size || "") + "</span>" +
        "</div>";
      card.addEventListener("click", function () { gotoGame(g.id); });
      wireOverlay(card, g.id);
      wrap.appendChild(card);
    });
  }

  /* ---------- Updates ---------- */
  function renderUpdates() {
    var wrap = document.getElementById("updatesList");
    if (!wrap) return;
    wrap.innerHTML = "";
    data.updates.forEach(function (u) {
      var item = el("div", "update-item");
      item.innerHTML =
        '<span class="u-emoji">🕒</span>' +
        "<div>" +
        "<small>" + esc(u.days) + "</small>" +
        "<h4>" + esc(u.title) + "</h4>" +
        '<div class="u-ar">' + esc(u.ar || "") + "</div>" +
        "</div>";
      if (u.link) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function () { window.open(u.link, "_blank"); });
      }
      wrap.appendChild(item);
    });
  }

  /* ---------- Mod of the day ---------- */
  function renderModOfDay() {
    var wrap = document.getElementById("modOfDay");
    if (!wrap) return;
    var slide = (data.settings.slides || [])[0];
    var g = slide ? gameById(slide.gameId) : data.games[0];
    if (!g) { wrap.innerHTML = '<div class="mod-of-day" style="padding:2rem;color:#cbd5e1">أضف ألعابًا من لوحة التحكم.</div>'; return; }
    wrap.innerHTML =
      '<div class="mod-of-day">' +
      (g.cover
        ? '<img src="' + esc(g.cover) + '" alt="" />'
        : '<div class="mod-fallback" style="background:' + fallbackGradient(g) + '">' + esc(g.emoji || g.ar.charAt(0)) + "</div>") +
      '<div class="mod-body">' +
      "<h4>" + esc(g.title) + "</h4>" +
      "<p>" + esc((slide && slide.tagline) || g.desc || "") + "</p>" +
      "</div></div>";
    wrap.querySelector(".mod-of-day").style.cursor = "pointer";
    wrap.addEventListener("click", function () { gotoGame(g.id); });
  }

  /* ---------- Ad slots ---------- */
  function renderAds() {
    var ads = data.settings.ads || {};
    [["adTop", ads.top], ["adInFeed", ads.inFeed], ["adBottom", ads.bottom]].forEach(function (pair) {
      var node = document.getElementById(pair[0]);
      if (!node) return;
      node.innerHTML = pair[1] || "";
      if (pair[1]) {
        var scripts = node.querySelectorAll("script");
        scripts.forEach(function (old) {
          var s = document.createElement("script");
          Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
          s.text = old.text;
          old.parentNode.replaceChild(s, old);
        });
      }
    });
  }

  /* ---------- Game grid + filters ---------- */
  var state = { platform: "all", genre: "all", type: "all", search: "", editing: null };
  var gameFormState = { cover: "", gallery: [], videoFile: null, videoLocal: false, videoHadLocal: false };
  var settingsLogo = "";

  function renderFilters() {
    var wrap = document.getElementById("filters");
    if (!wrap) return;
    wrap.innerHTML = "";

    var pfSet = {};
    data.games.forEach(function (g) {
      (g.platforms || []).forEach(function (p) { pfSet[canonPf(p)] = true; });
    });
    var pfs = Object.keys(pfSet).sort();

    if (pfs.length) {
      var pfRow = el("div", "filters-row", '<span class="filters-label">المنصة:</span>');
      pfRow.appendChild(chipEl("all", true, "الكل", "pf"));
      pfs.forEach(function (pf) { pfRow.appendChild(chipEl(pf, false, platLabel(pf), "pf")); });
      wrap.appendChild(pfRow);
    }

    var genreRow = el("div", "filters-row", '<span class="filters-label">النوع:</span>');
    genreRow.appendChild(chipEl("all", true, "الكل", "genre"));
    var set = {};
    data.games.forEach(function (g) {
      (g.genres || []).forEach(function (genre) { set[genre] = true; });
    });
    Object.keys(set).sort().forEach(function (genre) {
      genreRow.appendChild(chipEl(genre, false, genre, "genre"));
    });
    wrap.appendChild(genreRow);

    var typeRow = el("div", "filters-row", '<span class="filters-label">حالة التحميل:</span>');
    typeRow.appendChild(chipEl("all", true, "الكل", "type"));
    typeRow.appendChild(chipEl("app", false, "📱 تطبيق / برنامج", "type"));
    typeRow.appendChild(chipEl("ar", false, "🌍 معرّبة", "type"));
    typeRow.appendChild(chipEl("free", false, "🎁 مجانية", "type"));
    wrap.appendChild(typeRow);
  }

  function chipEl(val, active, label, kind) {
    var chip = el("button", "chip" + (active ? " active" : ""), esc(label));
    if (kind === "pf") chip.dataset.pf = val;
    else if (kind === "type") chip.dataset.type = val;
    else chip.dataset.genre = val;
    chip.addEventListener("click", function () {
      if (kind === "pf") state.platform = val;
      else if (kind === "type") state.type = val;
      else state.genre = val;
      setActiveChip();
      renderGrid();
    });
    return chip;
  }

  function setActiveChip() {
    document.querySelectorAll("#filters .chip").forEach(function (chip) {
      if (chip.dataset.pf !== undefined) {
        chip.classList.toggle("active", chip.dataset.pf === state.platform);
      } else if (chip.dataset.type !== undefined) {
        chip.classList.toggle("active", chip.dataset.type === state.type);
      } else {
        chip.classList.toggle("active", chip.dataset.genre === state.genre);
      }
    });
  }

  function flipCardHTML(g) {
    return '<div class="flip-inner">' +
      '<div class="flip-front">' +
      '<div class="game-cover">' +
      (isNew(g) ? '<span class="badge-new">جديد</span>' : "") +
      imgHTML(g, "game-cover-img") +
      "</div>" +
      '<div class="game-body">' +
      '<div class="game-name-ar">' + nameFancy(g, g.ar || g.title) + "</div>" +
      "<h3>" + esc(g.title) + "</h3>" +
      platBadgesHTML(g) +
      '<div class="game-tags">' +
      (g.genres || []).map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") +
      "</div>" +
      '<div class="game-meta">' +
      '<span class="game-size">' + esc(g.size || "") + "</span>" +
      '<span>⬇ ' + esc(g.downloads || "0") + "</span>" +
      "</div></div>" +
      "</div>" +
      flipBackHTML(g) +
      "</div>";
  }

  function renderGrid() {
    var grid = document.getElementById("gameGrid");
    var empty = document.getElementById("emptyState");
    if (!grid || !empty) return;

    var q = state.search.trim().toLowerCase();
    var list = data.games.filter(function (g) {
      if (state.platform !== "all" && (g.platforms || []).map(canonPf).indexOf(state.platform) === -1) return false;
      if (state.genre !== "all" && (g.genres || []).indexOf(state.genre) === -1) return false;
      if (state.type === "app" && !g.isApp) return false;
      if (state.type === "ar" && !g.arLocal) return false;
      if (state.type === "free" && !g.free) return false;
      if (!q) return true;
      return (g.title + " " + g.ar).toLowerCase().indexOf(q) !== -1;
    });

    grid.innerHTML = "";
    empty.hidden = list.length !== 0;

    list.forEach(function (g) {
      var card = el("div", "game-card flip-card");
      card.innerHTML = flipCardHTML(g);
      card.addEventListener("click", function () { gotoGame(g.id); });
      wireFlip(card, g.id);
      grid.appendChild(card);
    });
  }

  function renderNewAll() {
    var wrap = document.getElementById("newAllGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    data.games.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).forEach(function (g) {
      var card = el("div", "game-card flip-card");
      card.innerHTML = flipCardHTML(g);
      card.addEventListener("click", function () { gotoGame(g.id); });
      wireFlip(card, g.id);
      wrap.appendChild(card);
    });
  }

  /* ---------- Lessons ---------- */
  function renderLessons() {
    var wrap = document.getElementById("lessonsGrid");
    if (!wrap) return;
    wrap.innerHTML = "";
    data.lessons.forEach(function (l) {
      var card = el("a", "lesson-card");
      if (l.link) card.href = l.link;
      if (l.link) card.target = "_blank";
      card.innerHTML =
        '<span class="lesson-icon">' + esc(l.icon) + "</span>" +
        "<h3>" + esc(l.title) + "</h3>" +
        "<p>" + esc(l.desc) + "</p>";
      wrap.appendChild(card);
    });
  }

  /* ---------- Support + socials ---------- */
  var SOCIAL_META = {
    telegram: "✈️ تلجرام",
    youtube: "▶️ يوتيوب",
    discord: "🎮 ديسكورد",
    twitter: "🐦 تويتر",
    instagram: "📷 إنستغرام",
    facebook: "📘 فيسبوك",
  };

  function renderSupport() {
    var btnWrap = document.getElementById("supportButtons");
    var note = document.getElementById("supportNote");
    var socials = document.getElementById("socialLinks");
    var s = data.settings.socials || {};

    if (btnWrap) {
      btnWrap.innerHTML = "";
      if (s.kofi) btnWrap.appendChild(el("a", "support-btn", "☕ كوفي")).href = s.kofi;
      if (s.patreon) btnWrap.appendChild(el("a", "support-btn", "🅿️ باتريون")).href = s.patreon;
      if (s.youtube) btnWrap.appendChild(el("a", "support-btn", "▶️ يوتيوب")).href = s.youtube;
      if (!s.kofi && !s.patreon && !s.youtube) {
        btnWrap.appendChild(el("span", "support-btn", "ادعمنا قريبًا"));
      }
    }

    if (note) note.textContent = data.settings.supportNote || "";

    if (socials) {
      socials.innerHTML = "";
      Object.keys(SOCIAL_META).forEach(function (key) {
        if (s[key]) {
          var a = el("a", "", SOCIAL_META[key]);
          a.href = s[key];
          a.target = "_blank";
          a.rel = "noopener";
          socials.appendChild(a);
        }
      });
    }

    var email = document.getElementById("contactEmail");
    if (email) {
      var em = data.settings.contactEmail || "";
      email.innerHTML = em ? '<a class="contact-mail" href="mailto:' + esc(em) + '">📧 تواصل معنا: ' + esc(em) + "</a>" : "";
    }
  }

  /* ---------- Footer ---------- */
  var PAGE_TITLES = {
    index: "ألعاب معرّبة",
    new: "جديد التعريبات",
    games: "جميع الألعاب",
    minigames: "ألعاب بلا نت",
    lessons: "دروس مهمة",
    download: "حمّل التطبيق",
    request: "اطلب تعريب",
    contact: "تواصل معنا",
  };

  function renderFooter() {
    renderBrandLogo();
    var bn = document.getElementById("brandName");
    if (bn) bn.textContent = data.settings.site.name;
    var bt = document.getElementById("brandTagline");
    if (bt) bt.textContent = data.settings.site.tagline || "";
    var page = document.body && document.body.dataset.page;
    document.title = data.settings.site.name + " — " + (PAGE_TITLES[page] || "ألعاب معرّبة");

    var fat = document.getElementById("footerAboutText");
    if (fat) fat.textContent = data.settings.about;
    var fc = document.getElementById("footerCopyright");
    if (fc) fc.textContent = "© " + new Date().getFullYear() + " " + data.settings.site.name + " — جميع الحقوق محفوظة";

    var links = document.getElementById("footerLinks");
    if (!links) return;
    links.innerHTML = "";
    [["new.html", "جديد التعريبات"], ["games.html", "جميع الألعاب"], ["minigames.html", "ألعاب بلا نت"], ["lessons.html", "دروس مهمة"], ["download.html", "تحميل التطبيق"], ["request.html", "اطلب تعريب"], ["contact.html", "تواصل معنا"]].forEach(function (pair) {
      links.appendChild(el("li", "", '<a href="' + pair[0] + '">' + pair[1] + "</a>"));
    });

    var recs = document.getElementById("footerRecs");
    if (recs) {
      recs.innerHTML = "";
      data.games.slice(0, 5).forEach(function (g) {
        var li = el("li", "", '<a href="#games" data-recommend="' + g.id + '">' + esc(g.title) + "</a>");
        li.querySelector("a").addEventListener("click", function (e) {
          e.preventDefault();
          gotoGame(g.id);
        });
        recs.appendChild(li);
      });
    }

    var fs = document.getElementById("footerSocials");
    if (!fs) return;
    fs.innerHTML = "";
    var s = data.settings.socials || {};
    Object.keys(SOCIAL_META).forEach(function (key) {
      if (s[key]) {
        var a = el("a", "", SOCIAL_META[key]);
        a.href = s[key];
        a.target = "_blank";
        a.rel = "noopener";
        fs.appendChild(a);
      }
    });
  }

  /* ---------- Detail modal ---------- */
  function openDetail(id) {
    var g = gameById(id);
    if (!g) return;
    var content = document.getElementById("detailContent");
    if (!content) {
      window.location.href = "games.html";
      return;
    }
    content.innerHTML =
      '<div class="detail-head">' +
      '<div class="detail-thumb">' + imgHTML(g, "detail-thumb-img") + "</div>" +
      '<div class="detail-headinfo">' +
      "<h2>" + esc(g.title) + "</h2>" +
      '<span class="detail-ar">' + esc(g.ar) + "</span>" +
      platBadgesHTML(g) +
      extrasHTML(g) +
      '<div class="game-tags">' +
      (g.genres || []).map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="detail-meta">' +
      '<span class="meta-item">الحجم: <b>' + esc(g.size || "—") + "</b></span>" +
      '<span class="meta-item">⬇ <b>' + esc(g.downloads || "0") + "</b></span>" +
      (g.platforms || []).map(function (p) { return '<span class="meta-item">' + esc(p) + "</span>"; }).join("") +
      "</div>" +
      '<p class="detail-desc" style="color:' + descColor(g) + '">' + esc(g.desc || "") + "</p>" +
      (g.min || g.rec
        ? '<div class="req-box"><b>متطلبات التشغيل:</b> ' + esc(g.min || "") + (g.rec ? " — موصى به: " + esc(g.rec) : "") + "</div>"
        : "") +
      '<div class="detail-actions">' +
      (g.buy
        ? '<a class="btn-buy" href="' + esc(g.buy) + '" target="_blank" rel="noopener">🛒 شراء اللعبة</a>'
        : "") +
      (g.link
        ? (g.pass
          ? '<button class="btn-dl" id="dlLockedBtn" type="button">🔒 تحميل اللعبة</button>'
          : '<a class="btn-dl" href="' + esc(g.link) + '" target="_blank" rel="noopener">⬇ تحميل اللعبة</a>')
        : '<button class="btn-dl" id="noLinkBtn" type="button">⬇ تحميل اللعبة</button>') +
      '<button class="btn-ghost" data-close="detailModal" type="button">إغلاق</button>' +
      "</div>";
    openModal("detailModal");
    var noLink = document.getElementById("noLinkBtn");
    if (noLink) noLink.addEventListener("click", function () {
      noLink.textContent = "سيُضاف رابط التحميل قريبًا";
      noLink.style.opacity = "0.8";
    });
    var lockedBtn = document.getElementById("dlLockedBtn");
    if (lockedBtn) lockedBtn.addEventListener("click", function () { tryDownloadGame(g.id); });
  }

  /* ---------- Dedicated game page ---------- */
  function gamePageHTML(g) {
    var imgs = [];
    if (g.cover) imgs.push(g.cover);
    (g.gallery || []).forEach(function (src) { if (src) imgs.push(src); });

    var gallerySec = "";
    if (imgs.length > 1) {
      gallerySec =
        '<section class="gp-gallery section">' +
        '<div class="container">' +
        "<h2>🖼️ استعراض اللعبة</h2>" +
        '<div class="gp-gallery-main" id="gpGalleryMain"></div>' +
        '<div class="gp-gallery-thumbs" id="gpGalleryThumbs"></div>' +
        "</div></section>";
    }

    var reqSec = "";
    if (g.min || g.rec) {
      var mm = parseReqString(g.min);
      var rr = parseReqString(g.rec);
      var reqRows = REQ_ROWS.map(function (r) {
        return "<tr><td>" + esc(r.label) + "</td><td>" + esc(mm[r.key] || "—") + "</td><td>" + esc(rr[r.key] || "—") + "</td></tr>";
      }).join("");
      reqSec =
        '<div class="req-box">' +
        "<b>📋 متطلبات التشغيل</b>" +
        '<table class="gp-req-table">' +
        "<thead><tr><th></th><th>الحد الأدنى</th><th>الموصى به</th></tr></thead>" +
        "<tbody>" + reqRows + "</tbody>" +
        "</table>" +
        "</div>";
    }

    var dlBtn = g.link
      ? '<button class="btn-dl" id="gpDlBtn" type="button">⬇ تحميل اللعبة</button>'
      : '<button class="btn-dl" id="gpNoLinkBtn" type="button">⬇ تحميل اللعبة</button>';

    return (
      '<section class="gp-wrap">' +
      '<div class="container">' +
      '<nav class="breadcrumb" aria-label="مسار التنقل">' +
      '<a class="btn-back" href="index.html">← الرئيسية</a>' +
      '<span class="bc-sep">/</span>' +
      '<a class="btn-back" href="games.html">جميع الألعاب</a>' +
      '<span class="bc-sep">/</span>' +
      '<span class="bc-cur">' + esc(g.ar || g.title) + "</span>" +
      "</nav>" +
      '<section class="gp-hero">' +
      '<div class="gp-cover">' +
      (isNew(g) ? '<span class="badge-new">جديد</span>' : "") +
      imgHTML(g, "gp-cover-img") +
      "</div>" +
      '<div class="gp-info">' +
      "<h1>" + esc(g.title) + "</h1>" +
      '<div class="gp-ar">' + nameFancy(g, g.ar) + "</div>" +
      '<div class="gp-tags">' +
      (g.genres || []).map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") +
      "</div>" +
      platBadgesHTML(g) +
      extrasHTML(g) +
      '<div class="gp-meta">' +
      (g.size ? '<span class="meta-item">📦 ' + esc(g.size) + "</span>" : "") +
      '<span class="meta-item">⬇ ' + esc(g.downloads || "0") + "</span>" +
      (g.tradRate ? '<span class="meta-item">🌐 ' + esc(g.tradRate) + "</span>" : "") +
      (g.installTime ? '<span class="meta-item">⏱ ' + esc(g.installTime) + "</span>" : "") +
      (g.compat ? '<span class="meta-item">💻 ' + esc(g.compat) + "</span>" : "") +
      "</div>" +
      '<div class="gp-actions">' +
      dlBtn +
      (g.buy ? '<a class="btn-buy" href="' + esc(g.buy) + '" target="_blank" rel="noopener">🛒 شراء اللعبة</a>' : "") +
      "</div>" +
      '<div class="gp-video-sec" id="gpVideoWrap" hidden></div>' +
      reqSec +
      "</div>" +
      "</section>" +
      "</div>" +
      "</section>" +
      gallerySec +
      '<section class="section section-alt gp-desc-sec">' +
      '<div class="container">' +
      "<h2>📖 عن اللعبة والتعريب</h2>" +
      '<p class="detail-desc" style="line-height:1.9;color:' + descColor(g) + '">' + esc(g.desc || "لا يوجد وصف بعد.") + "</p>" +
      "</div>" +
      "</section>" +
      '<section class="section gp-comments">' +
      '<div class="container">' +
      '<div class="sec-head"><h2>💬 التعليقات <span class="comment-count" id="commentCount"></span></h2></div>' +
      '<div class="comment-list" id="commentList"></div>' +
      '<form id="commentForm" class="comment-form">' +
      '<input type="text" id="commentName" placeholder="اسمك (اختياري)" maxlength="40" autocomplete="off" />' +
      '<textarea id="commentText" placeholder="اكتب تعليقك هنا..." required rows="3" maxlength="500"></textarea>' +
      '<div class="comment-form-row">' +
      '<button class="btn btn-primary" type="submit">إرسال التعليق</button>' +
      '<span class="comment-msg" id="commentMsg"></span>' +
      "</div>" +
      "</form>" +
      "</div>" +
      "</section>" +
      '<section class="section gp-related">' +
      '<div class="container">' +
      '<div class="sec-head"><h2>🎮 ألعاب مشابهة</h2>' +
      '<a class="more-link" href="games.html">المزيد &lt;</a></div>' +
      '<div class="game-grid" id="gpRelated"></div>' +
      "</div>" +
      "</section>"
    );
  }

  function renderGamePage() {
    if (document.body.dataset.page !== "game") return;
    var wrap = document.getElementById("gameDetailPage");
    if (!wrap) return;
    var p = queryParams();
    var g;
    if (p.id !== undefined) {
      g = gameById(parseInt(p.id, 10));
    } else if (p.slug) {
      g = data.games.filter(function (x) { return slugify(x.title) === p.slug; })[0];
    }
    if (!g) {
      document.title = "اللعبة غير موجودة — " + data.settings.site.name;
      wrap.innerHTML =
        '<div class="gp-notfound container" style="text-align:center;padding:4rem 1rem">' +
        '<span style="font-size:3rem;display:inline-block;margin-bottom:.6rem">🎮</span>' +
        "<h1>اللعبة غير موجودة</h1>" +
        '<p style="color:var(--muted)">قد يكون الرابط غير صحيح أو اللعبة أُزيلت.</p>' +
        '<p><a class="btn btn-primary" href="games.html">تصفح جميع الألعاب</a></p>' +
        "</div>";
      return;
    }
    document.title = esc(g.title) + " — " + data.settings.site.name;
    setMeta("description", String(g.desc || "").slice(0, 160));
    setOg("og:title", g.title);
    setOg("og:description", String(g.desc || "").slice(0, 200));
    setOg("og:image", g.cover || "");

    wrap.innerHTML = gamePageHTML(g);

    var imgs = [];
    if (g.cover) imgs.push(g.cover);
    (g.gallery || []).forEach(function (src) { if (src) imgs.push(src); });
    wireGallery(imgs);

    var dl = document.getElementById("gpDlBtn");
    if (dl) dl.addEventListener("click", function () { openDownloadModal(g.id); });
    var noLink = document.getElementById("gpNoLinkBtn");
    if (noLink) noLink.addEventListener("click", function () {
      noLink.textContent = "سيُضاف رابط التحميل قريبًا";
      noLink.style.opacity = "0.8";
    });
    renderRelatedFor(g);
    renderComments(g.id);
    renderGameVideo(g);
  }

  function renderRelatedFor(g) {
    var wrap = document.getElementById("gpRelated");
    if (!wrap) return;
    wrap.innerHTML = "";
    var others = data.games.filter(function (x) {
      return x.id !== g.id && (x.genres || []).some(function (gr) { return (g.genres || []).indexOf(gr) !== -1; });
    }).slice(0, 4);
    if (!others.length) others = data.games.filter(function (x) { return x.id !== g.id; }).slice(0, 4);
    others.forEach(function (o) {
      var card = el("div", "game-card flip-card");
      card.innerHTML = flipCardHTML(o);
      card.addEventListener("click", function () { gotoGame(o.id); });
      wireFlip(card, o.id);
      wrap.appendChild(card);
    });
    if (!others.length) wrap.innerHTML = '<p class="empty-state">لا توجد ألعاب أخرى بعد.</p>';
  }

  /* ---------- Comments ---------- */
  var COMMENT_AVATARS = ["🕹️", "👾", "🎮", "🤖", "🐉", "🦊", "🐺", "🦉", "🐱", "👑", "⚔️", "🚀"];

  function commentAvatar(name) {
    var n = String(name || "").charCodeAt(0) || 0;
    return COMMENT_AVATARS[Math.abs(n) % COMMENT_AVATARS.length];
  }

  function loadComments(gameId) {
    var map = load(K_COMMENTS, {});
    if (!map || typeof map !== "object" || Array.isArray(map)) map = {};
    return Array.isArray(map[gameId]) ? map[gameId] : [];
  }

  function saveComments(gameId, arr) {
    var map = load(K_COMMENTS, {});
    if (!map || typeof map !== "object" || Array.isArray(map)) map = {};
    map[gameId] = arr;
    return store(K_COMMENTS, map);
  }

  function renderComments(gameId) {
    var list = document.getElementById("commentList");
    var count = document.getElementById("commentCount");
    var form = document.getElementById("commentForm");
    if (!list || !form) return;
    var arr = loadComments(gameId).slice().reverse();
    if (count) count.textContent = "(" + arr.length + ")";

    if (!arr.length) {
      list.innerHTML = '<p class="empty-state">لا توجد تعليقات بعد — كن أول من يعلّق! 💬</p>';
    } else {
      list.innerHTML = "";
      arr.forEach(function (c) {
        var item = el("div", "comment-item");
        item.innerHTML =
          '<div class="comment-avatar">' + esc(c.avatar || commentAvatar(c.name)) + "</div>" +
          '<div class="comment-body">' +
          '<div class="comment-top">' +
          "<strong>" + esc(c.name || "زائر") + "</strong>" +
          '<span class="comment-date">' + esc(c.date || "") + "</span>" +
          "</div>" +
          '<p class="comment-text">' + esc(c.text) + "</p>" +
          "</div>" +
          '<button class="comment-del" data-cid="' + esc(c.id) + '" type="button" title="حذف (للمدير)">✕</button>';
        item.querySelector(".comment-del").addEventListener("click", function () {
          deleteComment(gameId, c.id);
        });
        list.appendChild(item);
      });
    }

    var msg = document.getElementById("commentMsg");
    form.onsubmit = function (e) {
      e.preventDefault();
      var text = getF("commentText");
      if (!text) return;
      var name = getF("commentName") || "زائر";
      var comment = {
        id: "c" + Date.now(),
        name: name.slice(0, 40),
        avatar: commentAvatar(name),
        text: text.slice(0, 500),
        date: new Date().toLocaleString("ar-EG", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
      };
      var arr2 = loadComments(gameId);
      arr2.push(comment);
      saveComments(gameId, arr2);
      setF("commentText", "");
      setF("commentName", "");
      if (msg) { msg.textContent = "تم نشر تعليقك ✓"; msg.style.color = "#16a34a"; }
      renderComments(gameId);
    };
  }

  function deleteComment(gameId, id) {
    if (!data.settings.adminPass) {
      alert("اضبط كلمة مرور المدير أولًا من لوحة التحكم حتى يمكنك حذف التعليقات.");
      return;
    }
    var pass = prompt("🔒 أدخل كلمة مرور المدير لحذف هذا التعليق:");
    if (pass === null || pass === "") return;
    if (hashPass(pass) !== data.settings.adminPass) {
      alert("كلمة المرور غير صحيحة.");
      return;
    }
    var arr = loadComments(gameId).filter(function (c) { return String(c.id) !== String(id); });
    saveComments(gameId, arr);
    renderComments(gameId);
  }

  /* ---------- Video preview (Steam-like) ---------- */
  var MEDIA_DB = "ry-media";
  var MEDIA_STORE = "files";

  function openMediaDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(MEDIA_DB, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(MEDIA_STORE)) req.result.createObjectStore(MEDIA_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function mediaPut(key, value) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function mediaGet(key) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readonly");
        var r = tx.objectStore(MEDIA_STORE).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function mediaDel(key) {
    return openMediaDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        tx.objectStore(MEDIA_STORE).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function renderGameVideo(g) {
    var wrap = document.getElementById("gpVideoWrap");
    if (!wrap) return;
    if (g.videoLocal) {
      mediaGet("video_" + g.id).then(function (blob) {
        if (!blob || !blob.size) return;
        buildVideoPlayer(wrap, g, URL.createObjectURL(blob));
      }).catch(function () {});
    } else if (g.video) {
      buildVideoPlayer(wrap, g, g.video);
    }
  }

  function buildVideoPlayer(wrap, g, src) {
    var v = document.createElement("video");
    v.className = "gp-video";
    v.controls = true;
    v.muted = true;
    v.loop = true;
    v.preload = "metadata";
    v.setAttribute("playsinline", "");
    if (g.cover) v.poster = g.cover;
    v.innerHTML = "";
    var srcEl = document.createElement("source");
    srcEl.src = src;
    v.appendChild(srcEl);
    wrap.innerHTML = '<div class="gp-video-label">🎬 مقطع استعراض</div>';
    wrap.appendChild(v);
    wrap.hidden = false;
    try { v.play(); } catch (e) {}
  }

  function wireGallery(imgs) {
    var main = document.getElementById("gpGalleryMain");
    var thumbsWrap = document.getElementById("gpGalleryThumbs");
    if (!main || !thumbsWrap) return;
    var cur = 0;
    function show(i) {
      cur = (i + imgs.length) % imgs.length;
      main.innerHTML = '<img src="' + esc(imgs[cur]) + '" alt="" />';
      Array.prototype.forEach.call(thumbsWrap.children, function (t, idx) {
        t.classList.toggle("active", idx === cur);
      });
    }
    imgs.forEach(function (src, i) {
      var t = el("button", "gp-thumb", '<img src="' + esc(src) + '" alt="" loading="lazy" />');
      t.addEventListener("click", function () { show(i); });
      thumbsWrap.appendChild(t);
    });
    main.addEventListener("click", function () { openLightbox(imgs, cur); });
    show(0);
  }

  function openLightbox(imgs, index) {
    var ov = document.createElement("div");
    ov.className = "gp-lightbox";
    ov.innerHTML =
      '<button class="gp-lb-btn gp-lb-close" type="button">✕</button>' +
      '<button class="gp-lb-btn gp-lb-prev" type="button">‹</button>' +
      '<div class="gp-lb-img"></div>' +
      '<button class="gp-lb-btn gp-lb-next" type="button">›</button>';
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    var imgWrap = ov.querySelector(".gp-lb-img");
    var cur = index;
    function show() { imgWrap.innerHTML = '<img src="' + esc(imgs[cur]) + '" alt="" />'; }
    function go(d) { cur = (cur + d + imgs.length) % imgs.length; show(); }
    show();
    function close() {
      document.removeEventListener("keydown", keyfn);
      ov.remove();
      document.body.style.overflow = "";
    }
    ov.querySelector(".gp-lb-close").addEventListener("click", close);
    ov.querySelector(".gp-lb-prev").addEventListener("click", function (e) { e.stopPropagation(); go(-1); });
    ov.querySelector(".gp-lb-next").addEventListener("click", function (e) { e.stopPropagation(); go(1); });
    ov.addEventListener("click", function (e) { if (e.target === ov || e.target === imgWrap) close(); });
    function keyfn(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    document.addEventListener("keydown", keyfn);
  }

  /* ---------- Modals ---------- */
  function openModal(id) {
    var m = document.getElementById(id);
    if (m) m.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal(id) {
    var m = document.getElementById(id);
    if (m) m.hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- Custom download modal (countdown + version + password) ---------- */
  var pendingDl = null;
  var dlVersion = "main";

  function openDownloadModal(id) {
    var g = gameById(id);
    if (!g) return;
    pendingDl = id;
    dlVersion = "main";
    var meta = document.getElementById("dlMeta");
    var hint = document.getElementById("dlPassHint");
    var notice = document.getElementById("dlLockNotice");
    var ytBtn = document.getElementById("dlYtBtn");
    var ver = document.getElementById("dlVersions");
    var input = document.getElementById("dlPassInput");
    var msg = document.getElementById("dlPassMsg");
    if (meta) {
      meta.innerHTML =
        '<div class="dl-thumb">' + imgHTML(g, "dl-thumb-img") + "</div>" +
        '<div class="dl-info">' +
        "<strong>" + esc(g.title) + "</strong>" +
        '<span class="dl-ar">' + nameFancy(g, g.ar) + "</span>" +
        (g.size ? '<span class="dl-size">📦 ' + esc(g.size) + "</span>" : "") +
        "</div>";
    }
    if (ver) {
      if (g.link && g.linkAlt) {
        ver.hidden = false;
        ver.innerHTML =
          '<button class="dl-ver active" data-v="main" type="button">📥 النسخة الأساسية</button>' +
          '<button class="dl-ver" data-v="alt" type="button">🔁 نسخة بديلة</button>';
        ver.querySelectorAll(".dl-ver").forEach(function (b) {
          b.addEventListener("click", function () {
            dlVersion = b.dataset.v;
            ver.querySelectorAll(".dl-ver").forEach(function (x) { x.classList.toggle("active", x === b); });
          });
        });
      } else {
        ver.hidden = true;
      }
    }
    if (hint) {
      hint.textContent = g.pass
        ? "🔒 أدخل الكود الصحيح ثم اضغط تحميل."
        : "اضغط زر التحميل وسيبدأ التحميل تلقائيًا خلال 3 ثوانٍ.";
    }
    if (notice) {
      notice.hidden = !g.pass;
      if (g.pass) {
        notice.innerHTML =
          '<b>🔓 فك كلمة المرور</b><br />' +
          "هذه اللعبة مقفولة بكلمة مرور — الكود موجود في الفيديو على قناتنا في يوتيوب. أدخله بالضبط كما يظهر في الفيديو.";
      }
    }
    if (ytBtn) {
      var ytUrl = (data.settings.socials && data.settings.socials.youtube) || "";
      ytBtn.hidden = !(g.pass && ytUrl);
      if (ytUrl) ytBtn.href = ytUrl;
    }
    if (input) { input.value = ""; input.style.display = g.pass ? "" : "none"; }
    if (msg) msg.textContent = "";
    openModal("dlPassModal");
    if (input && g.pass) setTimeout(function () { input.focus(); }, 60);
  }

  function tryDownloadGame(id) {
    openDownloadModal(id);
  }

  function chosenLink(g) {
    return (dlVersion === "alt" && g.linkAlt) ? g.linkAlt : (g.link || "");
  }

  function handleDlPass() {
    var g = pendingDl ? gameById(pendingDl) : null;
    var input = document.getElementById("dlPassInput");
    var msg = document.getElementById("dlPassMsg");
    var btn = document.getElementById("dlPassBtn");
    if (!g || !btn) return;
    var link = chosenLink(g);
    if (!link) {
      if (msg) { msg.textContent = "لا يوجد رابط تحميل لهذه اللعبة بعد."; msg.style.color = "#dc2626"; }
      return;
    }
    if (g.pass) {
      var unlocked = false;
      try { unlocked = sessionStorage.getItem("ry_dl_" + g.id) === "1"; } catch (e) {}
      if (!unlocked) {
        if (!input || !input.value || hashPass(input.value) !== g.pass) {
          if (msg) { msg.textContent = "الكود غير صحيح — تأكد من الكود الظاهر في الفيديو على يوتيوب."; msg.style.color = "#dc2626"; }
          if (input) input.select();
          return;
        }
        try { sessionStorage.setItem("ry_dl_" + g.id, "1"); } catch (e) {}
      }
    }
    btn.disabled = true;
    var steps = [3, 2, 1];
    var k = 0;
    function tick() {
      if (k < steps.length) {
        btn.textContent = "⏳ التحميل خلال " + steps[k] + "...";
        k++;
        setTimeout(tick, 700);
      } else {
        btn.textContent = "⬇ تحميل";
        btn.disabled = false;
        closeModal("dlPassModal");
        window.open(link, "_blank");
      }
    }
    tick();
  }

  /* ---------- Admin: login ---------- */
  function openAdmin() {
    renderAdminGames(); renderAdminSlider(); renderAdminLessons(); renderAdminUpdates(); fillSettingsForm(); renderAdminRequests();
    applyOwnerLock();
    openModal("adminModal");
  }

  function openLogin() {
    var body = document.getElementById("loginBody");
    var title = document.getElementById("loginTitle");
    if (!body || !title) return;
    body.innerHTML = "";
    var msg = function (m, ok) {
      var n = document.getElementById("loginMsg");
      if (!n) return;
      n.textContent = m;
      n.style.color = ok ? "#16a34a" : "#dc2626";
    };
    if (hasPass()) {
      title.textContent = "🔐 دخول لوحة التحكم";
      body.innerHTML =
        '<p class="hint" style="margin-bottom:.7rem">أدخل كلمة المرور للدخول إلى لوحة التحكم.</p>' +
        '<form id="loginForm" class="admin-form">' +
        '<input type="password" id="loginPass" placeholder="كلمة المرور" autocomplete="current-password" />' +
        '<button class="btn btn-primary" type="submit">دخول</button>' +
        '<span class="req-status" id="loginMsg"></span>' +
        "</form>";
      document.getElementById("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();
        if (hashPass(document.getElementById("loginPass").value) === data.settings.adminPass) {
          setLoggedIn(true);
          closeModal("loginModal");
          openAdmin();
        } else {
          msg("كلمة المرور غير صحيحة.", false);
        }
      });
    } else {
      title.textContent = "🔐 إنشاء كلمة المرور";
      body.innerHTML =
        '<p class="hint" style="margin-bottom:.7rem">أهلاً بك! أنشئ الآن كلمة مرور لحماية لوحة التحكم من الآخرين.</p>' +
        '<form id="loginForm" class="admin-form">' +
        '<input type="password" id="loginPass1" placeholder="كلمة المرور" autocomplete="new-password" />' +
        '<input type="password" id="loginPass2" placeholder="تأكيد كلمة المرور" autocomplete="new-password" />' +
        '<button class="btn btn-primary" type="submit">تعيين كلمة المرور والدخول</button>' +
        '<span class="req-status" id="loginMsg"></span>' +
        "</form>";
      document.getElementById("loginForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var a = document.getElementById("loginPass1").value;
        var b = document.getElementById("loginPass2").value;
        if (!a) { msg("أدخل كلمة مرور.", false); return; }
        if (a !== b) { msg("كلمتا المرور غير متطابقتين.", false); return; }
        data.settings.adminPass = hashPass(a);
        if (!saveAll()) { msg("تعذّر الحفظ، تأكد من مساحة التخزين.", false); return; }
        setLoggedIn(true);
        msg("تم الحفظ. جارٍ الدخول...", true);
        closeModal("loginModal");
        openAdmin();
      });
    }
    openModal("loginModal");
  }

  function logout() {
    setLoggedIn(false);
    setOwner(false);
    closeModal("adminModal");
    alert("تم تسجيل الخروج. لن تتمكن من دخول لوحة التحكم بدون كلمة المرور.");
  }

  /* ---------- Requests ---------- */
  function handleRequestSubmit(e) {
    e.preventDefault();
    var status = document.getElementById("rqStatus");
    if (!status) return;
    var title = getF("rqTitle");
    if (!title) {
      status.textContent = "اكتب اسم اللعبة أولًا.";
      status.style.color = "#dc2626";
      return;
    }
    var item = {
      id: "r" + Date.now(),
      game: title,
      desc: getF("rqDesc"),
      contact: getF("rqContact"),
      date: new Date().toLocaleDateString("ar-EG"),
    };
    var done = function (remote) {
      setF("rqTitle", ""); setF("rqDesc", ""); setF("rqContact", "");
      status.textContent = remote
        ? "تم إرسال طلبك بنجاح ✓"
        : "تم حفظ طلبك في هذا المتصفح ✓ (يفضّل فتح الموقع عبر السيرفر ليصل الطلب للمسؤول)";
      status.style.color = "#16a34a";
    };
    var fail = function () {
      data.requests.push(item);
      store(K_REQUESTS, data.requests);
      done(false);
    };
    try {
      fetch("api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).then(function (r) { if (r.ok) done(true); else fail(); }).catch(fail);
    } catch (err) { fail(); }
  }

  function renderAdminRequests() {
    var list = document.getElementById("adminRequestsList");
    var count = document.getElementById("requestsCount");
    if (!list) return;
    list.innerHTML = '<li class="hint" style="padding:.5rem">جارٍ التحميل...</li>';

    function render(arr) {
      list.innerHTML = "";
      if (count) count.textContent = "عدد الطلبات: " + arr.length;
      if (!arr.length) {
        list.innerHTML = '<li class="hint" style="padding:.5rem">لا توجد طلبات بعد.</li>';
        return;
      }
      arr.slice().reverse().forEach(function (r) {
        var item = el("li", "admin-item");
        item.innerHTML =
          '<div class="admin-item-info">' +
          '<div class="admin-item-thumb">🎮</div>' +
          '<div class="admin-item-text"><strong>' + esc(r.game || "") + "</strong>" +
          "<small>" + esc((r.desc || "") + (r.contact ? " — " + r.contact : "") + (r.date ? " — " + r.date : "")) + "</small></div>" +
          "</div>" +
          '<div class="admin-item-actions"><button class="icon-btn del" type="button">حذف</button></div>';
        item.querySelector(".icon-btn.del").addEventListener("click", function () {
          deleteRequest(r.id, true);
        });
        list.appendChild(item);
      });
    }

    try {
      fetch("api/requests")
        .then(function (r) { return r.json(); })
        .then(function (arr) {
          if (Array.isArray(arr)) render(arr);
          else render(data.requests);
        })
        .catch(function () { render(data.requests); });
    } catch (err) { render(data.requests); }
  }

  function deleteRequest(id, remote) {
    if (!confirm("حذف هذا الطلب؟")) return;
    var fallback = function () {
      data.requests = data.requests.filter(function (x) { return String(x.id) !== String(id); });
      store(K_REQUESTS, data.requests);
      renderAdminRequests();
    };
    if (!remote) { fallback(); return; }
    try {
      fetch("api/request?id=" + encodeURIComponent(id), { method: "DELETE" })
        .then(function (r) { if (r.ok) renderAdminRequests(); else fallback(); })
        .catch(fallback);
    } catch (err) { fallback(); }
  }

  function handlePasswordChange() {
    var msg = document.getElementById("pwMsg");
    if (!msg) return;
    var cur = document.getElementById("pwCur").value;
    var nw = document.getElementById("pwNew").value;
    if (hasPass() && hashPass(cur) !== data.settings.adminPass) {
      msg.textContent = "كلمة المرور الحالية غير صحيحة.";
      msg.style.color = "#dc2626";
      return;
    }
    if (!nw) {
      msg.textContent = "اكتب كلمة المرور الجديدة.";
      msg.style.color = "#dc2626";
      return;
    }
    data.settings.adminPass = hashPass(nw);
    if (saveAll()) {
      msg.textContent = "تم تغيير كلمة المرور بنجاح ✓";
      msg.style.color = "#16a34a";
      setF("pwCur", ""); setF("pwNew", "");
    } else {
      msg.textContent = "تعذّر الحفظ.";
      msg.style.color = "#dc2626";
    }
  }

  /* ---------- Admin: tabs ---------- */
  function initAdminTabs() {
    document.querySelectorAll("#adminTabs .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll("#adminTabs .tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var name = tab.dataset.tab;
        ["games", "slider", "lessons", "updates", "requests", "settings"].forEach(function (n) {
          var panel = document.getElementById("tab-" + n);
          if (panel) panel.hidden = n !== name;
        });
        if (name === "requests") renderAdminRequests();
        if (name === "settings") fillSettingsForm();
      });
    });
  }

  /* ---------- Admin: games ---------- */
  function renderAdminGames() {
    var list = document.getElementById("adminGameList");
    if (!list) return;
    list.innerHTML = "";
    data.games.forEach(function (g) {
      list.appendChild(adminItem(g.ar || g.title, g.size || "", g, [
        { cls: "edit", label: "تعديل", fn: function () { openGameForm(g); } },
        { cls: "del", label: "حذف", fn: function () {
          if (confirm("حذف " + g.ar + "؟")) {
            data.games = data.games.filter(function (x) { return x.id !== g.id; });
            saveAll(); refreshSite();
          }
        } },
      ]));
    });
  }

  function openGameForm(g) {
    state.editing = g ? g.id : null;
    var form = document.getElementById("gameForm");
    if (!form) return;
    setF("gId", g ? g.id : "");
    setF("gTitle", g ? g.title : "");
    setF("gAr", g ? g.ar : "");
    setF("gCover", "");
    setF("gSize", g ? g.size : "");
    setF("gGenres", g ? (g.genres || []).join("، ") : "");
    setF("gPlatforms", g ? (g.platforms || []).join("، ") : "");
    var arLocalChk = document.getElementById("gArLocal");
    if (arLocalChk) arLocalChk.checked = !!(g && g.arLocal);
    var freeChk = document.getElementById("gFree");
    if (freeChk) freeChk.checked = !!(g && g.free);
    var isAppChk = document.getElementById("gIsApp");
    if (isAppChk) isAppChk.checked = !!(g && g.isApp);
    var checks = document.querySelectorAll('#pfBox input[type="checkbox"]');
    var known = {};
    if (g && Array.isArray(g.platforms)) g.platforms.forEach(function (p) { known[canonPf(p)] = true; });
    checks.forEach(function (c) { c.checked = !!known[c.dataset.pf]; });
    setF("gDesc", g ? g.desc : "");
    fillReqTable(g ? g.min : "", g ? g.rec : "");
    var gGenreInput = document.getElementById("gGenres");
    if (gGenreInput && gGenreInput.dispatchEvent) gGenreInput.dispatchEvent(new Event("input", { bubbles: true }));
    setF("gDownloads", g ? g.downloads : "");
    setF("gLink", g ? g.link : "");
    setF("gLinkAlt", g ? g.linkAlt : "");
    setF("gBuy", g ? g.buy : "");
    setF("gTradRate", g ? g.tradRate : "");
    setF("gInstallTime", g ? g.installTime : "");
    setF("gCompat", g ? g.compat : "");
    setF("gPass", "");
    var keepWrap = document.getElementById("gPassKeepWrap");
    var keepChk = document.getElementById("gPassKeep");
    if (keepWrap) keepWrap.hidden = !(g && g.pass);
    if (keepChk) keepChk.checked = !!(g && g.pass);
    seedGameImages(g);
    openModal("gameModal");
  }

  function getCover() {
    var u = getF("gCover");
    return u ? u : (gameFormState.cover || "");
  }

  function seedGameImages(g) {
    gameFormState.cover = (g && g.cover) || "";
    gameFormState.gallery = (g && Array.isArray(g.gallery)) ? g.gallery.slice() : [];
    gameFormState.videoFile = null;
    gameFormState.videoLocal = !!(g && g.videoLocal);
    gameFormState.videoHadLocal = gameFormState.videoLocal;
    if (gameFormState.cover && gameFormState.cover.indexOf("data:") !== 0) setF("gCover", gameFormState.cover);
    if (g && g.video && g.video !== "local") setF("gVideo", g.video);
    else setF("gVideo", "");
    renderCoverPreview();
    renderGalleryThumbs();
    renderVideoPreview();
  }

  async function handleGameSubmit(e) {
    e.preventDefault();
    try {
      var id = getF("gId") ? parseInt(getF("gId"), 10) : Date.now();
      var idx = data.games.findIndex(function (x) { return x.id === id; });
      var prevPass = (idx !== -1 && data.games[idx]) ? (data.games[idx].pass || "") : "";
      var enteredPass = getF("gPass");
      var keepChk = document.getElementById("gPassKeep");
      var keepPass = !enteredPass && keepChk && keepChk.checked;
      if (gameFormState.videoFile) {
        await mediaPut("video_" + id, gameFormState.videoFile);
        gameFormState.videoLocal = true;
      } else if (!gameFormState.videoLocal && gameFormState.videoHadLocal) {
        try { await mediaDel("video_" + id); } catch (err) {}
      }
      var game = {
        id: id,
        title: getF("gTitle"),
        ar: getF("gAr"),
        cover: getCover(),
        gallery: gameFormState.gallery.slice(),
        video: getF("gVideo") || "",
        videoLocal: !!gameFormState.videoLocal,
        size: getF("gSize"),
        genres: splitList(getF("gGenres")),
        platforms: collectPlatforms(),
        desc: getF("gDesc"),
        min: collectReq().min,
        rec: collectReq().rec,
        downloads: getF("gDownloads"),
        link: getF("gLink"),
        linkAlt: getF("gLinkAlt"),
        buy: getF("gBuy"),
        tradRate: getF("gTradRate"),
        installTime: getF("gInstallTime"),
        compat: getF("gCompat"),
        arLocal: !!document.getElementById("gArLocal") && document.getElementById("gArLocal").checked,
        free: !!document.getElementById("gFree") && document.getElementById("gFree").checked,
        isApp: !!document.getElementById("gIsApp") && document.getElementById("gIsApp").checked,
        pass: enteredPass ? hashPass(enteredPass) : (keepPass ? prevPass : ""),
      };
      if (!game.date) game.date = new Date().toISOString().slice(0, 10);
      if (idx !== -1) {
        var prev = data.games[idx];
        game.date = prev.date;
        data.games[idx] = Object.assign({}, prev, game);
      } else {
        data.games.unshift(game);
      }
      saveAll();
      refreshSite();
      renderAdminGames();
      closeModal("gameModal");
    } catch (err) {
      alert("حدث خطأ أثناء حفظ اللعبة: " + err.message);
    }
  }

  /* ---------- Admin: slider ---------- */
  function renderAdminSlider() {
    var list = document.getElementById("adminSliderList");
    if (!list) return;
    list.innerHTML = "";
    (data.settings.slides || []).forEach(function (slide, i) {
      var g = gameById(slide.gameId);
      var item = adminItem(g ? g.ar : "لعبة محذوفة", g ? (g.title || "") : "", slide, [
        { cls: "up", label: "↑", fn: function () { moveSlide(i, -1); } },
        { cls: "down", label: "↓", fn: function () { moveSlide(i, 1); } },
        { cls: "del", label: "حذف", fn: function () {
          data.settings.slides.splice(i, 1);
          saveAll(); refreshSite(); renderAdminSlider();
        } },
      ]);
      item.querySelector(".admin-item-text").innerHTML = "<strong>" + esc(slide.tagline || "") + "</strong><small>" + esc(g ? g.title : "") + "</small>";
      list.appendChild(item);
    });

    var select = document.getElementById("sliderGameSelect");
    var cur = select.value ? parseInt(select.value, 10) : "";
    select.innerHTML = "";
    data.games.forEach(function (g) {
      var opt = el("option", "", esc(g.ar) + " — " + esc(g.title));
      opt.value = g.id;
      if (String(g.id) === String(cur)) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function moveSlide(i, dir) {
    var slides = data.settings.slides;
    var j = i + dir;
    if (j < 0 || j >= slides.length) return;
    var tmp = slides[i];
    slides[i] = slides[j];
    slides[j] = tmp;
    saveAll(); refreshSite(); renderAdminSlider();
  }

  /* ---------- Admin: lessons / updates ---------- */
  function openLessonForm(kind, item) {
    var isLesson = kind === "lesson";
    document.getElementById("lessonModalTitle").textContent = item ? "تعديل " + (isLesson ? "الدرس" : "التحديث") : (isLesson ? "درس جديد" : "تحديث جديد");
    setF("lfKind", kind);
    setF("lfId", item ? item.id : "");
    setF("lfIcon", item ? item.icon : "");
    setF("lfTitle", item ? item.title : "");
    setF("lfDesc", item ? item.desc : "");
    setF("lfLink", item ? item.link : "");
    document.getElementById("lfIcon").parentElement.parentElement.style.display = isLesson ? "" : "none";
    openModal("lessonModal");
  }

  function handleLessonSubmit(e) {
    e.preventDefault();
    try {
      var kind = getF("lfKind");
      var id = getF("lfId") ? parseInt(getF("lfId"), 10) : Date.now();
      var item = {
        id: id,
        icon: getF("lfIcon") || "📘",
        title: getF("lfTitle"),
        desc: getF("lfDesc"),
        link: getF("lfLink"),
      };
      var arr = kind === "lesson" ? data.lessons : data.updates;
      var idx = arr.findIndex(function (x) { return x.id === id; });
      if (idx !== -1) arr[idx] = item;
      else arr.push(item);
      saveAll();
      refreshSite();
      if (kind === "lesson") renderAdminLessons();
      else renderAdminUpdates();
      closeModal("lessonModal");
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    }
  }

  function renderAdminLessons() {
    var list = document.getElementById("adminLessonList");
    if (!list) return;
    list.innerHTML = "";
    data.lessons.forEach(function (l) {
      list.appendChild(adminItem(l.title, l.desc || "", l, [
        { cls: "edit", label: "تعديل", fn: function () { openLessonForm("lesson", l); } },
        { cls: "del", label: "حذف", fn: function () {
          data.lessons = data.lessons.filter(function (x) { return x.id !== l.id; });
          saveAll(); refreshSite(); renderAdminLessons();
        } },
      ]));
    });
  }

  function renderAdminUpdates() {
    var list = document.getElementById("adminUpdateList");
    if (!list) return;
    list.innerHTML = "";
    data.updates.forEach(function (u) {
      list.appendChild(adminItem(u.title, u.days + (u.ar ? " — " + u.ar : ""), u, [
        { cls: "edit", label: "تعديل", fn: function () { openLessonForm("update", u); } },
        { cls: "del", label: "حذف", fn: function () {
          data.updates = data.updates.filter(function (x) { return x.id !== u.id; });
          saveAll(); refreshSite(); renderAdminUpdates();
        } },
      ]));
    });
  }

  /* ---------- Admin: settings ---------- */
  function fillSettingsForm() {
    var s = data.settings;
    setF("sName", s.site.name);
    setF("sTagline", s.site.tagline);
    setF("sAbout", s.about);
    setF("sSupportNote", s.supportNote);
    setF("sContactEmail", s.contactEmail);
    settingsLogo = (s.site && s.site.logo) || "";
    renderLogoPreview();
    var soc = s.socials || {};
    setF("sTelegram", soc.telegram);
    setF("sYoutube", soc.youtube);
    setF("sDiscord", soc.discord);
    setF("sTwitter", soc.twitter);
    setF("sInstagram", soc.instagram);
    setF("sFacebook", soc.facebook);
    setF("sKofi", soc.kofi);
    setF("sPatreon", soc.patreon);
    var ads = s.ads || {};
    setF("sAdTop", ads.top);
    setF("sAdInFeed", ads.inFeed);
    setF("sAdBottom", ads.bottom);
    setF("sOwnerEmail", OWNER_EMAIL);
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();
    if (!isOwner()) { alert("الوصول مرفوض — هذه الإعدادات للمالك فقط."); return; }
    try {
      var s = data.settings;
      s.site = { name: getF("sName") || "ريان", tagline: getF("sTagline"), logo: settingsLogo || "" };
      s.about = getF("sAbout");
      s.supportNote = getF("sSupportNote");
      s.contactEmail = getF("sContactEmail");
      s.socials = {
        telegram: getF("sTelegram"), youtube: getF("sYoutube"), discord: getF("sDiscord"),
        twitter: getF("sTwitter"), instagram: getF("sInstagram"), facebook: getF("sFacebook"),
        kofi: getF("sKofi"), patreon: getF("sPatreon"),
      };
      s.ads = { top: getF("sAdTop"), inFeed: getF("sAdInFeed"), bottom: getF("sAdBottom") };
      saveAll();
      refreshSite();
      alert("تم حفظ الإعدادات.");
    } catch (err) {
      alert("حدث خطأ أثناء حفظ الإعدادات: " + err.message);
    }
  }

  /* ---------- Admin: live device clock (colored) ---------- */
  function initAdminClock() {
    var tEl = document.getElementById("adminClockTime");
    var dEl = document.getElementById("adminClockDate");
    if (!tEl || !dEl) return;
    var days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    var months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var d = new Date();
      var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
      var p = h < 12 ? "صباحًا" : "مساءً";
      h = h % 12 || 12;
      tEl.textContent = pad(h) + ":" + pad(m) + ":" + pad(s) + " " + p;
      dEl.textContent = days[d.getDay()] + " — " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Shared admin helpers ---------- */
  function adminItem(title, sub, obj, actions) {
    var item = el("li", "admin-item");
    var thumb = obj && obj.cover
      ? '<img class="admin-item-thumb" src="' + esc(obj.cover) + '" alt="" />'
      : '<div class="admin-item-thumb">' + esc((title || "؟").charAt(0)) + "</div>";
    item.innerHTML =
      '<div class="admin-item-info">' +
      thumb +
      "<div class=\"admin-item-text\"><strong>" + esc(title || "") + "</strong><small>" + esc(sub || "") + "</small></div>" +
      "</div>" +
      '<div class="admin-item-actions">' +
      actions.map(function (a, i) { return '<button class="icon-btn ' + a.cls + '" data-idx="' + i + '" type="button">' + a.label + "</button>"; }).join("") +
      "</div>";
    item.querySelectorAll(".admin-item-actions .icon-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { actions[parseInt(btn.dataset.idx, 10)].fn(); });
    });
    return item;
  }

  function setF(id, val) {
    var n = document.getElementById(id);
    if (n) n.value = val || "";
  }

  function getF(id) {
    var n = document.getElementById(id);
    return n ? n.value.trim() : "";
  }

  function splitList(str) {
    return str.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function on(id, evt, fn) {
    var n = document.getElementById(id);
    if (n) n.addEventListener(evt, fn);
  }

  /* ---------- Live sync (cross-tab) ---------- */
  var LIVE_KEYS = [K_GAMES, K_LESSONS, K_UPDATES, K_SETTINGS, K_REQUESTS, K_COMMENTS];
  var syncTimer = null;

  function toast(msg) {
    var old = document.getElementById("ryToast");
    if (old) old.remove();
    var t = document.createElement("div");
    t.id = "ryToast";
    t.textContent = msg;
    t.style.cssText =
      "position:fixed;bottom:18px;right:18px;z-index:99999;background:var(--card,#0f172a);" +
      "color:var(--text,#f1f5f9);padding:10px 16px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.25);" +
      "font-size:.9rem;font-weight:700;max-width:85vw;direction:rtl;opacity:0;" +
      "transform:translateY(8px);transition:opacity .25s ease,transform .25s ease;";
    document.body.appendChild(t);
    requestAnimationFrame(function () {
      t.style.opacity = "1";
      t.style.transform = "translateY(0)";
    });
    setTimeout(function () {
      t.style.opacity = "0";
      t.style.transform = "translateY(8px)";
      setTimeout(function () { t.remove(); }, 300);
    }, 2000);
  }

  function setupLiveSync() {
    if (!window.addEventListener) return;
    window.addEventListener("storage", function (e) {
      if (e.key !== null && LIVE_KEYS.indexOf(e.key) === -1) return;
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(function () {
        loadAll();
        refreshSite();
        if (document.getElementById("adminModal") && !document.getElementById("adminModal").hidden) {
          renderAdminGames(); renderAdminSlider(); renderAdminLessons(); renderAdminUpdates(); renderAdminRequests();
        }
        toast("تمت مزامنة المحتوى تلقائيًا ✓");
      }, 150);
    });
  }

  function collectPlatforms() {
    var out = [];
    var seen = {};
    function push(p) {
      var c = canonPf(p);
      if (!c || seen[c]) return;
      seen[c] = true;
      out.push(PLATFORM_META[c] ? PLATFORM_META[c].ar : String(p));
    }
    document.querySelectorAll('#pfBox input[type="checkbox"]:checked').forEach(function (c) { push(c.dataset.pf); });
    splitList(getF("gPlatforms")).forEach(push);
    return out;
  }

  /* ---------- Image uploaders (Instagram-like) ---------- */
  function compressImage(file, maxDim, quality, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxDim / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w * scale));
        c.height = Math.max(1, Math.round(h * scale));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        try { cb(c.toDataURL("image/jpeg", quality)); }
        catch (err) { cb(e.target.result); }
      };
      img.onerror = function () { cb(e.target.result); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function wireSingleUploader(dropId, inputId, onFile) {
    var drop = document.getElementById(dropId);
    var input = document.getElementById(inputId);
    if (!drop || !input) return;
    drop.addEventListener("click", function () { input.click(); });
    ["dragover", "dragenter"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("dragging"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("dragging"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", function () {
      if (input.files && input.files[0]) onFile(input.files[0]);
      input.value = "";
    });
  }

  function renderCoverPreview() {
    var prev = document.getElementById("coverPreview");
    var drop = document.getElementById("coverDrop");
    if (!prev || !drop) return;
    var src = getCover();
    if (src) { prev.src = src; prev.hidden = false; drop.hidden = true; }
    else { prev.hidden = true; drop.hidden = false; }
  }

  function renderGalleryThumbs() {
    var wrap = document.getElementById("galleryThumbs");
    if (!wrap) return;
    wrap.innerHTML = "";
    gameFormState.gallery.forEach(function (src, i) {
      var t = el("div", "img-thumb", '<img src="' + esc(src) + '" alt="" />' +
        '<button class="img-thumb-remove" data-i="' + i + '" type="button">✕</button>');
      t.querySelector(".img-thumb-remove").addEventListener("click", function () {
        gameFormState.gallery.splice(i, 1);
        renderGalleryThumbs();
      });
      wrap.appendChild(t);
    });
  }

  function renderLogoPreview() {
    var prev = document.getElementById("logoPreview");
    var drop = document.getElementById("logoDrop");
    var rm = document.getElementById("logoRemove");
    if (!prev) return;
    if (settingsLogo) {
      prev.src = settingsLogo; prev.hidden = false;
      if (drop) drop.hidden = true;
      if (rm) rm.hidden = false;
    } else {
      prev.hidden = true;
      if (drop) drop.hidden = false;
      if (rm) rm.hidden = true;
    }
  }

  function renderVideoPreview() {
    var prev = document.getElementById("videoPreview");
    var drop = document.getElementById("videoDrop");
    var rm = document.getElementById("videoRemove");
    var txt = document.getElementById("videoDropText");
    if (!prev || !drop) return;
    if (gameFormState.videoFile) {
      var url = URL.createObjectURL(gameFormState.videoFile);
      prev.src = url;
      prev.hidden = false;
      drop.hidden = true;
      rm.hidden = false;
      if (txt) txt.textContent = "سيُحفظ هذا الفيديو مع اللعبة ✓";
    } else if (gameFormState.videoLocal) {
      prev.hidden = true;
      drop.hidden = true;
      rm.hidden = false;
      if (txt) txt.textContent = "فيديو مرفوع مسبقًا ✓";
    } else {
      prev.hidden = true;
      drop.hidden = false;
      rm.hidden = true;
      if (txt) txt.textContent = "اضغط أو اسحب فيديو قصير هنا";
    }
  }

  function initImageUploaders() {
    wireSingleUploader("coverDrop", "coverFile", function (file) {
      compressImage(file, 1000, 0.82, function (dataUrl) {
        gameFormState.cover = dataUrl;
        setF("gCover", "");
        renderCoverPreview();
      });
    });
    wireSingleUploader("logoDrop", "logoFile", function (file) {
      compressImage(file, 420, 0.85, function (dataUrl) {
        settingsLogo = dataUrl;
        renderLogoPreview();
      });
    });

    var gCoverInput = document.getElementById("gCover");
    if (gCoverInput) gCoverInput.addEventListener("input", renderCoverPreview);

    var galDrop = document.getElementById("galleryDrop");
    var galInput = document.getElementById("galleryFile");
    if (galDrop && galInput) {
      galDrop.addEventListener("click", function () { galInput.click(); });
      ["dragover", "dragenter"].forEach(function (ev) {
        galDrop.addEventListener(ev, function (e) { e.preventDefault(); galDrop.classList.add("dragging"); });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        galDrop.addEventListener(ev, function (e) { e.preventDefault(); galDrop.classList.remove("dragging"); });
      });
      galDrop.addEventListener("drop", function (e) {
        if (e.dataTransfer && e.dataTransfer.files) handleGalleryFiles(e.dataTransfer.files);
      });
      galInput.addEventListener("change", function () {
        if (galInput.files) handleGalleryFiles(galInput.files);
        galInput.value = "";
      });
    }

    var logoRm = document.getElementById("logoRemove");
    if (logoRm) logoRm.addEventListener("click", function () {
      settingsLogo = "";
      renderLogoPreview();
    });

    wireVideoUploader();
  }

  function wireVideoUploader() {
    var drop = document.getElementById("videoDrop");
    var input = document.getElementById("videoFile");
    var rm = document.getElementById("videoRemove");
    if (!drop || !input) return;

    drop.addEventListener("click", function () { input.click(); });
    ["dragover", "dragenter"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("dragging"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("dragging"); });
    });
    drop.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) acceptVideo(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", function () {
      if (input.files && input.files[0]) acceptVideo(input.files[0]);
      input.value = "";
    });
    if (rm) rm.addEventListener("click", function () {
      gameFormState.videoFile = null;
      gameFormState.videoLocal = false;
      setF("gVideo", "");
      renderVideoPreview();
    });

    var gVideoInput = document.getElementById("gVideo");
    if (gVideoInput) gVideoInput.addEventListener("input", function () {
      gameFormState.videoLocal = false;
      gameFormState.videoFile = null;
    });
  }

  function acceptVideo(file) {
    if (!file.type || file.type.indexOf("video") !== 0) {
      alert("اختر ملف فيديو بصيغة mp4 أو webm.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert("حجم الفيديو كبير جدًا (أقصى حد 100 ميجا). جرّب فيديو أقصر وأصغر.");
      return;
    }
    gameFormState.videoFile = file;
    gameFormState.videoLocal = true;
    setF("gVideo", "");
    renderVideoPreview();
    var probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = function () {
      var d = probe.duration;
      if (d && d > 4.6 && confirm("⚠️ هذا الفيديو مدته " + Math.round(d) + " ثوانٍ، وطلبت ألا يتجاوز ~4 ثوانٍ مثل ستيم.\nهل تريد متابعة رفعه على أي حال؟")) {
        return;
      }
      if (d && d > 4.6) {
        gameFormState.videoFile = null;
        gameFormState.videoLocal = false;
        renderVideoPreview();
        alert("تم إلغاء الرفع. أعد اختيار فيديو أقصر من 4 ثوانٍ.");
      }
    };
    probe.onerror = function () {};
    probe.src = URL.createObjectURL(file);
  }

  /* ---------- Genre quick picker (type of game) ---------- */
  function initGenreBuilder() {
    var presets = document.getElementById("genrePresets");
    var input = document.getElementById("gGenres");
    if (!presets || !input) return;
    var chips = presets.querySelectorAll(".req-chip");

    function parse() {
      var list = String(input.value || "").split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      chips.forEach(function (ch) {
        var g = ch.getAttribute("data-genre");
        ch.classList.toggle("active", list.indexOf(g) !== -1);
      });
    }

    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        var g = ch.getAttribute("data-genre");
        var list = String(input.value || "").split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var i = list.indexOf(g);
        if (i !== -1) list.splice(i, 1);
        else list.push(g);
        input.value = list.join("، ");
        parse();
      });
    });
    input.addEventListener("input", parse);
    parse();
  }

  /* ---------- Steam-style requirements table (min / rec) ---------- */
  var REQ_ROWS = [
    { key: "os", label: "نظام التشغيل", kws: ["ويندوز", "windows", "ماك", "mac", "لينكس", "linux", "نظام"] },
    { key: "cpu", label: "المعالج", kws: ["معالج", "i3", "i5", "i7", "i9", "ryzen", "core"] },
    { key: "ram", label: "الذاكرة", kws: ["ذاكرة", "رام", "ram", "memory"] },
    { key: "gpu", label: "كرت الشاشة", kws: ["كرت", "كارت", "غرافيك", "gpu", "graphics"] },
    { key: "storage", label: "مساحة التخزين", kws: ["تخزين", "مساحة", "storage", "disk"] },
  ];

  function parseReqString(v) {
    var out = { os: "", cpu: "", ram: "", gpu: "", storage: "" };
    String(v || "").split(/[،,]/).forEach(function (tok) {
      tok = tok.trim();
      if (!tok) return;
      var row = null;
      REQ_ROWS.forEach(function (r) { if (!row && tok.indexOf(r.label) !== -1) row = r; });
      var viaKw = false;
      if (!row) {
        REQ_ROWS.forEach(function (r) {
          if (row) return;
          if (r.kws.some(function (k) { return tok.toLowerCase().indexOf(k.toLowerCase()) !== -1; })) { row = r; viaKw = true; }
        });
      }
      if (!row) return;
      var val = tok.replace(new RegExp(row.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "").replace(/^[\s:：\-]+|[\s:：\-]+$/g, "");
      if (viaKw) {
        row.kws.forEach(function (k) {
          if (tok.toLowerCase().indexOf(k.toLowerCase()) === 0) {
            var rem = tok.slice(k.length).replace(/^[\s:：\-]+/, "").trim();
            if (rem.length >= 3) val = rem;
          }
        });
      }
      if (!val) val = tok;
      out[row.key] = val;
    });
    return out;
  }

  function collectReq() {
    function build(prefix) {
      var parts = [];
      REQ_ROWS.forEach(function (r) {
        var el = document.getElementById(prefix + r.key);
        var v = el ? el.value.trim() : "";
        if (v) parts.push(r.label + ": " + v);
      });
      return parts.join("، ");
    }
    return { min: build("min"), rec: build("rec") };
  }

  function fillReqTable(min, rec) {
    var mm = parseReqString(min);
    var rr = parseReqString(rec);
    REQ_ROWS.forEach(function (r) {
      var m = document.getElementById("min" + r.key);
      var c = document.getElementById("rec" + r.key);
      if (m) m.value = mm[r.key];
      if (c) c.value = rr[r.key];
    });
  }

  function handleGalleryFiles(files) {
    Array.prototype.slice.call(files).slice(0, 10).forEach(function (f) {
      compressImage(f, 1200, 0.8, function (dataUrl) {
        gameFormState.gallery.push(dataUrl);
        renderGalleryThumbs();
      });
    });
  }

  function renderBrandLogo() {
    var logo = (data.settings.site && data.settings.site.logo) || "";
    var mark = document.querySelector(".brand-mark");
    if (!mark) return;
    var img = document.getElementById("brandLogo");
    if (!img) {
      img = document.createElement("img");
      img.id = "brandLogo";
      img.className = "brand-logo";
      img.alt = "";
      mark.insertBefore(img, mark.firstChild);
    }
    if (logo) {
      img.src = logo;
      img.hidden = false;
      mark.classList.add("has-logo");
    } else {
      img.hidden = true;
      mark.classList.remove("has-logo");
    }
    var fav = document.querySelector('link[rel="icon"]');
    if (fav && logo) fav.href = logo;
  }

  /* ---------- Refresh site ---------- */
  function refreshSite() {
    renderHero();
    renderStats();
    renderNew();
    renderNewAll();
    renderUpdates();
    renderModOfDay();
    renderGrid();
    renderFilters();
    renderLessons();
    renderSupport();
    renderFooter();
    renderAds();
    renderGamePage();
  }

  /* ---------- Export / Import ---------- */
  function exportData() {
    var payload = { games: data.games, lessons: data.lessons, updates: data.updates, settings: data.settings };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "RCP-GAMAR-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var p = JSON.parse(reader.result);
        if (!p.games || !Array.isArray(p.games)) throw new Error("bad");
        data.games = p.games;
        data.lessons = p.lessons || [];
        data.updates = p.updates || [];
        data.settings = Object.assign({}, DEFAULT_SETTINGS, p.settings || {});
        saveAll();
        refreshSite();
        renderAdminGames(); renderAdminSlider(); renderAdminLessons(); renderAdminUpdates(); fillSettingsForm();
        alert("تم الاستيراد بنجاح.");
      } catch (err) {
        alert("ملف غير صالح. تأكد أنه ملف JSON تم تصديره من الموقع.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Download app ---------- */
  /* ---------- Download the app ---------- */
  var deferredPrompt = null;

  function getStoreMode() {
    var ua = navigator.userAgent || "";
    if (/Android/i.test(ua)) return "play";
    if (/iPhone|iPad|iPod/i.test(ua)) return "appstore";
    return "desktop";
  }

  function doInstall() {
    var installBtn = document.getElementById("installBtn");
    var ua = navigator.userAgent || "";
    var os = "desktop";
    if (/Android/i.test(ua)) os = "android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "ios";
    else if (/Windows/i.test(ua)) os = "windows";
    else if (/Linux/i.test(ua)) os = "linux";
    else if (/Mac/i.test(ua)) os = "mac";
    var card = document.querySelector('.download-card[data-plat="' + os + '"]');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; if (installBtn) installBtn.hidden = true; });
    } else if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function setupDownloadApp() {
    var installBtn = document.getElementById("installBtn");
    var dlNote = document.getElementById("dlNote");
    if (!installBtn) return;

    var ua = navigator.userAgent || "";
    var platform = "desktop";
    if (/Android/i.test(ua)) platform = "android";
    else if (/iPhone|iPad|iPod/i.test(ua)) platform = "ios";
    else if (/Windows/i.test(ua)) platform = "windows";
    else if (/Linux/i.test(ua)) platform = "linux";
    else if (/Mac/i.test(ua)) platform = "mac";

    var card = document.querySelector('.download-card[data-plat="' + platform + '"]');
    if (card) card.classList.add("active");

    var notes = {
      android: "أنت على أندرويد: اضغط زر «تثبيت التطبيق» بالأعلى، أو في Chrome اضغط ⋮ ثم «إضافة إلى الشاشة الرئيسية».",
      ios: "على آيفون/آيباد: افتح الموقع في Safari، اضغط زر المشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية».",
      windows: "أنت على ويندوز: اضغط زر «تثبيت التطبيق» بالأعلى، أو زر التثبيت في شريط العنوان بـ Chrome/Edge.",
      linux: "أنت على لينكس: اضغط زر «تثبيت التطبيق» بالأعلى، أو زر التثبيت في شريط العنوان بـ Chrome/Edge.",
      mac: "على ماك: افتح في Chrome ثم «تثبيت التطبيق» من القائمة، أو أضف الموقع إلى الشاشة الرئيسية في Safari.",
      desktop: ""
    };
    if (dlNote && notes[platform]) dlNote.textContent = notes[platform];

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (platform !== "ios" && platform !== "mac") installBtn.hidden = false;
    });
    installBtn.addEventListener("click", doInstall);
  }

  function renderStoreBanner() {
    var banner = document.getElementById("storeBanner");
    if (!banner) return;
    var mode = getStoreMode();
    var cfg = {
      play: {
        store: "متوفر على Google Play",
        sub: "ثبّت التطبيق بأسلوب متجر Google Play — واجهة خضراء ووصول سريع لكل الألعاب المعرّبة.",
        icon: "▶️",
        btn: "تثبيت",
        meta: "4.9 ★ | +1 مليون تنزيل"
      },
      appstore: {
        store: "متوفر على App Store",
        sub: "ثبّت التطبيق بأسلوب متجر آبل — تجربة أنيقة وسريعة على جهازك.",
        icon: "🍎",
        btn: "الحصول",
        meta: "4.8 ★ | مقيّم كتطبيق الأسبوع"
      },
      desktop: {
        store: "نسخة الحاسوب",
        sub: "ثبّت التطبيق من المتصفح مباشرة واجعله على شاشتك — يعمل دون إنترنت بعد التحميل.",
        icon: "🖥️",
        btn: "⬇ تثبيت التطبيق الآن",
        meta: "مجاني | يعمل دون اتصال"
      }
    };
    var c = cfg[mode];
    var icon = document.getElementById("storeIcon");
    if (icon) icon.innerHTML = c.icon;
    var sn = document.getElementById("storeStoreName");
    if (sn) sn.textContent = c.store;
    var sub = document.getElementById("storeSub");
    if (sub) sub.textContent = c.sub;
    var b = document.getElementById("storeInstall");
    if (b) {
      b.textContent = c.btn;
      b.addEventListener("click", doInstall);
    }
    var meta = document.getElementById("storeMeta");
    if (meta) meta.textContent = c.meta;
  }

  /* ---------- Theme (light / dark) ---------- */
  function setupTheme() {
    var root = document.documentElement;
    var btn = document.getElementById("themeToggle");
    var saved = "light";
    try { saved = localStorage.getItem("ry-theme") || "light"; } catch (e) {}
    if (saved === "dark") root.setAttribute("data-theme", "dark");

    function apply(t) {
      var dark = t === "dark";
      root.setAttribute("data-theme", dark ? "dark" : "light");
      try { localStorage.setItem("ry-theme", dark ? "dark" : "light"); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        var mode = getStoreMode();
        var color = mode === "appstore" ? "#0a84ff" : (mode === "play" ? "#0f9d58" : (dark ? "#0f1117" : "#e11d48"));
        meta.setAttribute("content", color);
      }
      if (btn) {
        btn.textContent = dark ? "☀️" : "🌙";
        btn.title = dark ? "الوضع الفاتح" : "الوضع الداكن";
      }
    }

    apply(saved);
    if (btn) btn.addEventListener("click", function () {
      apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------- Init ---------- */
  function init() {
    loadAll();
    refreshSite();
    setupDownloadApp();
    renderStoreBanner();
    setupTheme();
    initAdminClock();
    initImageUploaders();
    initGenreBuilder();
    setupLiveSync();

    /* Search */
    var searchBtn = document.getElementById("searchBtn");
    var searchInput = document.getElementById("searchInput");
    if (searchBtn) searchBtn.addEventListener("click", function () { state.search = searchInput.value; renderGrid(); });
    if (searchInput) searchInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") { state.search = searchInput.value; renderGrid(); }
    });

    /* Nav */
    var navToggle = document.getElementById("navToggle");
    var mainNav = document.getElementById("mainNav");
    if (navToggle && mainNav) navToggle.addEventListener("click", function () { mainNav.classList.toggle("open"); });
    document.querySelectorAll(".main-nav a").forEach(function (a) {
      a.addEventListener("click", function () { mainNav.classList.remove("open"); });
    });

    /* Modals close */
    document.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeModal(b.dataset.close); });
    });
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-close]") : null;
      if (btn) closeModal(btn.dataset.close);
    });
    document.querySelectorAll(".modal-backdrop").forEach(function (m) {
      m.addEventListener("click", function (e) {
        if (e.target === m) closeModal(m.id);
      });
    });

    /* Admin */
    initAdminTabs();
    on("adminBtn", "click", function () {
      if (isLoggedIn()) openAdmin();
      else openLogin();
    });
    on("adminLogoutBtn", "click", logout);
    on("adminOwnerLockBtn", "click", unlockOwner);

    on("pwChangeBtn", "click", handlePasswordChange);
    on("requestForm", "submit", handleRequestSubmit);

    on("dlPassBtn", "click", handleDlPass);
    on("dlPassInput", "keydown", function (e) { if (e.key === "Enter") handleDlPass(); });

    on("addGameBtn", "click", function () { openGameForm(null); });
    on("addLessonBtn", "click", function () { openLessonForm("lesson", null); });
    on("addUpdateBtn", "click", function () { openLessonForm("update", null); });

    on("gameForm", "submit", handleGameSubmit);
    on("sliderAddBtn", "click", function () {
      var sel = document.getElementById("sliderGameSelect");
      var tag = document.getElementById("sliderTagline");
      if (!sel || !tag) return;
      var gameId = parseInt(sel.value, 10);
      if (!gameById(gameId)) { alert("اختر لعبة أولًا."); return; }
      if (!data.settings.slides) data.settings.slides = [];
      data.settings.slides.push({ id: Date.now(), gameId: gameId, badge: "تعريب جديد", tagline: tag.value || "اكتشف هذا التعريب الجديد." });
      tag.value = "";
      saveAll(); refreshSite(); renderAdminSlider();
    });

    on("lessonForm", "submit", handleLessonSubmit);
    on("settingsForm", "submit", handleSettingsSubmit);
    on("resetBtn", "click", function () {
      if (confirm("استعادة جميع الإعدادات الافتراضية؟ (لن تُحذف الألعاب)")) {
        data.settings = Object.assign({}, DEFAULT_SETTINGS);
        saveAll(); refreshSite(); fillSettingsForm();
      }
    });
    on("exportBtn", "click", exportData);
    on("importFile", "change", function (e) {
      if (e.target.files[0]) importData(e.target.files[0]);
      e.target.value = "";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
