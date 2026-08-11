/* ============================================================
 * Ryan Games — public site-data endpoint
 * Route: /api/site-data
 *
 * Reads the FULL site snapshot from Supabase (Single Source of
 * Truth) and returns it in the legacy shape expected by app.js.
 * Falls back to the Netlify blob store only when Supabase is not
 * configured. GET only — all writes go through /api/admin/site-data.
 * ============================================================ */
const { createClient } = require("@supabase/supabase-js");
const { getStore } = require("@netlify/blobs");

const KEY = "site-data";
const MAX_LIMIT = 1000;

function getStoreSafe() {
  try {
    return getStore({ name: "ry-site" });
  } catch (err) {
    const env = process.env || {};
    if (env.NETLIFY_BLOBS_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: "ry-site", siteID: env.NETLIFY_BLOBS_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    if (env.NETLIFY_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: "ry-site", siteID: env.NETLIFY_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    throw err;
  }
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function client() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
}

function legacyId(g) {
  if (g.legacy_id) return g.legacy_id;
  let h = 0;
  const str = g.slug || "";
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toLegacyGame(g) {
  const meta = g.meta && typeof g.meta === "object" ? g.meta : {};
  return {
    id: legacyId(g),
    slug: g.slug || slugify(g.title_en || g.title || ""),
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

function toLegacySettings(row) {
  return {
    site: {
      name: (row && row.site_name) || "ريان ألعاب",
      mark: (row && row.site_mark) || "ر",
      tagline: (row && row.tagline) || "تعريبات الألعاب العربية",
    },
    about: (row && row.about) || "",
    supportNote: (row && row.support_note) || "",
    contactEmail: (row && row.contact_email) || "",
    ownerEmail: (row && row.owner_email) || "cmn124you@gmail.com",
    socials: (row && row.socials) || {},
    ads: (row && row.ads) || {},
    slides: (row && Array.isArray(row.slides)) ? row.slides : [],
  };
}

function toLegacyNews(n) {
  return {
    id: n.id || n.slug || "n" + Date.now(),
    slug: n.slug || "",
    title: n.title || "",
    image: n.image || "",
    desc: n.desc || "",
    body: n.content || "",
    pinned: !!n.pinned,
    published: n.status !== "draft",
    date: n.date || n.created_at || "",
  };
}

async function buildFromSupabase(supabase) {
  const [games, lessons, updates, settingsRows, news] = await Promise.all([
    supabase.from("games").select("*").order("updated_at", { ascending: false }).limit(MAX_LIMIT),
    supabase.from("lessons").select("*").order("sort_order", { ascending: true }).limit(500),
    supabase.from("updates").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("settings").select("*").limit(1),
    supabase.from("news").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const gRows = Array.isArray(games.data) ? games.data : [];
  const lRows = Array.isArray(lessons.data) ? lessons.data : [];
  const uRows = Array.isArray(updates.data) ? updates.data : [];
  const nRows = Array.isArray(news.data) ? news.data : [];
  const sRow = Array.isArray(settingsRows.data) && settingsRows.data.length ? settingsRows.data[0] : null;

  return {
    games: gRows.map(toLegacyGame),
    lessons: lRows.map((l) => ({ id: l.sort_order || 0, icon: l.icon || "", title: l.title || "", desc: l.desc || "", link: l.link || "" })),
    updates: uRows.map((u, i) => ({ id: i + 1, title: u.title || "", ar: u.body || "", days: u.date || "", link: u.link || "" })),
    news: nRows.map(toLegacyNews),
    settings: toLegacySettings(sRow),
    updatedAt: Date.now(),
  };
}

exports.handler = async (event) => {
  const method = event.httpMethod || "GET";
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: { Allow: "GET, OPTIONS" } };
  }
  if (method !== "GET") return respond(405, { error: "method_not_allowed" });

  try {
    const supabase = client();
    if (supabase) {
      return respond(200, await buildFromSupabase(supabase));
    }

    // Legacy fallback: Netlify blob store (pre-Supabase data).
    const store = getStoreSafe();
    const doc = await store.get(KEY, { type: "json" });
    return respond(200, doc || { games: [], lessons: [], updates: [], settings: {}, news: [], updatedAt: 0 });
  } catch (err) {
    return respond(500, { error: "server_error", message: String((err && err.message) || err) });
  }
};
