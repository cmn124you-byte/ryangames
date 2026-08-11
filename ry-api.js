/* ============================================================
 * Ryan Games / ريان ألعاب — unified data client
 * ------------------------------------------------------------
 * The ONLY data-access layer used by Web, PWA, Android and Windows.
 * Reads from Supabase (the Single Source of Truth) via its REST API
 * using the public anon key + RLS. Falls back to the local cache and
 * then to data.js defaults when offline or unconfigured.
 *
 * Admin writes go through the server-side functions (Netlify) that
 * hold the service_role key — never exposed here.
 * ============================================================ */
(function () {
  "use strict";

  var cfg = (window.RY_CONFIG || {});
  var SUPABASE_URL = cfg.SUPABASE_URL || "";
  var ANON = cfg.SUPABASE_ANON_KEY || "";
  var API_BASE = cfg.API_BASE || "/api";
  var TTL = cfg.CACHE_TTL || 60 * 60 * 1000;

  var K_CACHE = "ry_cache_site";
  var K_TS = "ry_cache_ts";

  function configured() {
    return !!(SUPABASE_URL && ANON && SUPABASE_URL.indexOf("YOUR-") === -1 && SUPABASE_URL.indexOf("supabase.co") !== -1);
  }

  function sb(path, opts) {
    opts = opts || {};
    var headers = {
      apikey: ANON,
      Authorization: "Bearer " + ANON,
      "Content-Type": "application/json",
    };
    if (opts.Prefer) headers.Prefer = opts.Prefer;
    return fetch(SUPABASE_URL + "/rest/v1/" + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  }

  /* ---------- field mapping (new schema -> legacy shape) ---------- */
  function slugOf(g) { return g.slug || slugify(g.title_en || g.title || ""); }

  function slugify(s) {
    return String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
  }

  function legacyId(g) {
    if (g.legacy_id) return g.legacy_id;
    var h = 0;
    var str = slugOf(g);
    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function toLegacyGame(g) {
    var meta = (g.meta && typeof g.meta === "object") ? g.meta : {};
    return {
      id: legacyId(g),
      slug: slugOf(g),
      title: g.title_en || meta.title || "",
      ar: g.title_ar || meta.ar || "",
      cover: g.cover_url || meta.cover || "",
      desc: g.description || meta.desc || "",
      genres: Array.isArray(g.genre) ? g.genre.slice() : [],
      platforms: Array.isArray(g.platform) ? g.platform.slice() : [],
      size: g.size || meta.size || "",
      downloads: g.downloads != null ? String(g.downloads) : (meta.downloads != null ? String(meta.downloads) : "0"),
      date: g.release_date || meta.date || "",
      min: g.min_requirements || meta.min || "",
      rec: g.rec_requirements || meta.rec || "",
      link: g.download_url || meta.link || "",
      linkAlt: g.download_url_alt || meta.linkAlt || "",
      buy: g.buy_url || meta.buy || "",
      tradRate: g.translation_status === "active" ? "100%" : meta.tradRate || "",
      installTime: g.install_time || meta.installTime || "",
      compat: g.compat || meta.compat || "",
      arLocal: g.translation_status === "active",
      gallery: Array.isArray(g.screenshots) ? g.screenshots.slice() : [],
      video: g.video_url || meta.video || "",
      free: g.free,
      isApp: g.is_app,
      notes: g.notes || meta.notes || "",
      installationGuide: g.installation_guide || meta.installationGuide || "",
      translationVersion: g.translation_version || meta.translationVer || "",
      translationDate: g.translation_date || meta.translationDate || "",
      browserTitle: g.browser_title || meta.browserTitle || (g.title_en ? "تعريب لعبة " + g.title_en : ""),
      featured: g.featured || false,
      pass: g.download_pass_hash || meta.pass || "",
      updatedAt: g.updated_at || "",
    };
  }

  /* ---------- low-level fetchers ---------- */
  async function fetchGames() {
    const r = await sb("games?select=*&order=updated_at.desc&limit=1000");
    if (!r.ok) throw new Error("games_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchGameBySlug(slug) {
    const r = await sb("games?select=*&slug=eq." + encodeURIComponent(slug) + "&status=eq.published&limit=1");
    if (!r.ok) throw new Error("game_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function fetchTranslations() {
    const r = await sb("translations?select=*,games(slug,title_en,title_ar)&status=eq.published&order=updated_at.desc&limit=1000");
    if (!r.ok) throw new Error("translations_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchNews() {
    const r = await sb("news?select=*&status=eq.published&order=created_at.desc&limit=100");
    if (!r.ok) throw new Error("news_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchCategories() {
    const r = await sb("categories?select=*&limit=500");
    if (!r.ok) throw new Error("categories_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchSettings() {
    const r = await sb("settings?select=*&limit=1");
    if (!r.ok) throw new Error("settings_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function fetchLessons() {
    const r = await sb("lessons?select=*&status=eq.published&order=sort_order.asc&limit=500");
    if (!r.ok) throw new Error("lessons_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }

  async function fetchUpdates() {
    const r = await sb("updates?select=*&status=eq.published&order=created_at.desc&limit=500");
    if (!r.ok) throw new Error("updates_http_" + r.status);
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  }

  /* ---------- settings mapping (new -> legacy) ---------- */
  function toLegacySettings(row) {
    var d = {};
    try { d = window.DEFAULT_SETTINGS ? Object.assign({}, window.DEFAULT_SETTINGS) : {}; } catch (e) {}
    if (!row) return d;
    return Object.assign(d, {
      site: {
        name: row.site_name || d.site.name,
        mark: row.site_mark || d.site.mark,
        tagline: row.tagline || d.site.tagline,
      },
      about: row.about || d.about,
      supportNote: row.support_note || d.supportNote,
      contactEmail: row.contact_email || d.contactEmail,
      ownerEmail: row.owner_email || d.ownerEmail,
      socials: Object.assign({}, d.socials, row.socials || {}),
      ads: Object.assign({}, d.ads, row.ads || {}),
      slides: Array.isArray(row.slides) ? row.slides : d.slides,
    });
  }

  /* ---------- cache ---------- */
  function readCache() {
    try {
      var raw = localStorage.getItem(K_CACHE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(doc) {
    try {
      localStorage.setItem(K_CACHE, JSON.stringify(doc));
      localStorage.setItem(K_TS, String(Date.now()));
    } catch (e) {}
  }

  /* ---------- site data bundle (legacy shape for app.js) ---------- */
  async function siteData() {
    var fallback = readCache();
    if (!configured()) {
      return fallback || { games: [], lessons: [], updates: [], settings: null, news: [], updatedAt: 0 };
    }
    try {
      var [games, lessons, updates, settings, news] = await Promise.all([
        fetchGames(), fetchLessons(), fetchUpdates(), fetchSettings(), fetchNews(),
      ]);
      var legacyGames = games.map(toLegacyGame);
      var doc = {
        games: legacyGames,
        lessons: lessons.map(function (l) {
          return { id: l.sort_order || 0, icon: l.icon || "", title: l.title || "", desc: l.desc || "", link: l.link || "" };
        }),
        updates: updates.map(function (u, i) {
          return { id: i + 1, title: u.title || "", ar: u.body || "", days: u.date || "", link: u.link || "" };
        }),
        settings: toLegacySettings(settings),
        news: news,
        updatedAt: Date.now(),
      };
      writeCache(doc);
      return doc;
    } catch (e) {
      return fallback || { games: [], lessons: [], updates: [], settings: null, news: [], updatedAt: 0 };
    }
  }

  /* ---------- public search (Arabic / English / partial) ---------- */
  async function search(q) {
    q = String(q || "").trim();
    if (!q) return [];
    var doc = await siteData();
    var ql = q.toLowerCase();
    var norm = function (s) { return String(s || "").toLowerCase(); };
    var matches = (doc.games || []).filter(function (g) {
      var hay = norm(g.title + " " + g.ar + " " + g.desc + " " + (g.genres || []).join(" "));
      return hay.indexOf(ql) !== -1;
    });
    return matches;
  }

  /* ---------- admin publish (server-side service_role) ---------- */
  function adminSave(payload, adminKey) {
    if (!window.fetch) return Promise.reject(new Error("no_fetch"));
    var body = JSON.stringify(payload || {});
    if (body.length > 8 * 1024 * 1024) return Promise.reject(new Error("payload_too_large"));
    return fetch(API_BASE + "/admin/site-data", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey || "",
      },
      body: body,
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) {
          var err = new Error(data && data.error ? data.error : "http_" + r.status);
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- translation requests ---------- */
  function submitRequest(item) {
    return fetch(API_BASE + "/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  }

  function deleteRequest(id) {
    return fetch(API_BASE + "/request?id=" + encodeURIComponent(id), { method: "DELETE" });
  }

  /* ---------- uploads (server-side, goes to Supabase Storage) ---------- */
  function uploadFile(fileName, contentType, base64, folder, adminKey) {
    return fetch(API_BASE + "/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey || "",
      },
      body: JSON.stringify({ fileName: fileName, contentType: contentType, base64: base64, folder: folder }),
    });
  }

  /* ---------- AI image translation (server-side, key kept in env) ---------- */
  function aiTranslate(base64, opts, adminKey) {
    opts = opts || {};
    return fetch(API_BASE + "/ai-translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey || "",
      },
      body: JSON.stringify({ image: base64, lang: opts.lang || "ar", mode: opts.mode || "ocr" }),
    });
  }

  /* ---------- exported API ---------- */
  window.RyAPI = {
    configured: configured,
    slugify: slugify,
    toLegacyGame: toLegacyGame,
    siteData: siteData,
    fetchGames: fetchGames,
    fetchGameBySlug: fetchGameBySlug,
    fetchTranslations: fetchTranslations,
    fetchNews: fetchNews,
    fetchCategories: fetchCategories,
    search: search,
    adminSave: adminSave,
    submitRequest: submitRequest,
    deleteRequest: deleteRequest,
    uploadFile: uploadFile,
    aiTranslate: aiTranslate,
  };
})();
