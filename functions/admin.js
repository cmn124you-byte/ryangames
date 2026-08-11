/* ============================================================
 * Ryan Games — admin sync function
 * Route: /api/admin/site-data   (Netlify redirect: /api/* -> /.netlify/functions/:splat)
 *
 * Receives the FULL site snapshot {games, lessons, updates, settings, news}
 * from the admin panel, validates the admin key, then writes everything
 * into Supabase using the service_role key (kept server-side only).
 * Supabase is the Single Source of Truth; all clients read from it.
 * ============================================================ */
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_ADMIN_KEY = "ryan2026";
const MAX_BODY = 8 * 1024 * 1024;
const MAX_ITEMS = 2000;

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function client() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("supabase_not_configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isAdmin(event) {
  const key = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();
  const expected = (process.env.ADMIN_WRITE_KEY || DEFAULT_ADMIN_KEY).trim();
  return key !== "" && key === expected;
}

function readBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch (e) {
    throw new Error("invalid_json");
  }
}

function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
}

function num(s) {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

/* Map a legacy game object (app.js shape) into the Supabase `games` row. */
function toGameRow(g) {
  return {
    slug: String(g.slug || slugify(g.title) || "game-" + g.id).toLowerCase(),
    title_ar: String(g.ar || g.title || ""),
    title_en: String(g.title || ""),
    description: String(g.desc || ""),
    cover_url: String(g.cover || ""),
    status: g.status || "published",
    platform: Array.isArray(g.platforms) ? g.platforms : [],
    genre: Array.isArray(g.genres) ? g.genres : [],
    size: String(g.size || ""),
    downloads: num(g.downloads),
    release_date: String(g.date || g.releaseDate || ""),
    buy_url: String(g.buy || ""),
    free: !!g.free,
    is_app: !!g.isApp,
    translation_status: g.translationStatus || (g.arLocal ? "active" : "inactive"),
    translation_version: String(g.translationVersion || g.translationVer || ""),
    translation_date: String(g.translationDate || ""),
    install_time: String(g.installTime || ""),
    compat: String(g.compat || ""),
    min_requirements: String(g.min || ""),
    rec_requirements: String(g.rec || ""),
    installation_guide: String(g.installationGuide || ""),
    notes: String(g.notes || ""),
    video_url: String(g.video || ""),
    download_url: String(g.link || g.downloadUrl || ""),
    download_url_alt: String(g.linkAlt || ""),
    download_pass_hash: String(g.pass || ""),
    browser_title: String(g.browserTitle || ""),
    featured: !!g.featured,
    legacy_id: g.id !== undefined && g.id !== null ? num(g.id) : null,
    meta: g,
  };
}

/* Upsert a game keeping identity by legacy_id first, then by slug. */
async function upsertGame(supabase, row) {
  if (row.legacy_id) {
    const { data: existing } = await supabase
      .from("games")
      .select("id, slug, legacy_id")
      .eq("legacy_id", row.legacy_id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("games").update(row).eq("id", existing.id);
      if (error) throw error;
      return existing.id;
    }
  }
  const { data: bySlug } = await supabase.from("games").select("id").eq("slug", row.slug).maybeSingle();
  if (bySlug) {
    const { error } = await supabase.from("games").update(row).eq("id", bySlug.id);
    if (error) throw error;
    return bySlug.id;
  }
  const { data, error } = await supabase.from("games").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function syncTranslations(supabase, gameId, g) {
  if (!g.link && !g.downloadUrl) return;
  const { data: existing } = await supabase.from("translations").select("id").eq("game_id", gameId).limit(1);
  const row = {
    game_id: gameId,
    version: String(g.translationVersion || g.translationVer || "1.0"),
    status: "published",
    download_url: String(g.link || g.downloadUrl || ""),
    installation_guide: String(g.installationGuide || ""),
    changelog: String(g.changelog || ""),
    translation_date: String(g.translationDate || g.date || ""),
  };
  if (existing && existing.length) {
    await supabase.from("translations").update(row).eq("id", existing[0].id);
  } else {
    await supabase.from("translations").insert(row);
  }
}

async function syncImages(supabase, gameId, g) {
  await supabase.from("game_images").delete().eq("game_id", gameId);
  const rows = [];
  if (g.cover) rows.push({ game_id: gameId, url: String(g.cover), kind: "cover", sort_order: 0 });
  let i = 1;
  (g.gallery || []).forEach((src) => {
    if (src) rows.push({ game_id: gameId, url: String(src), kind: "screenshot", sort_order: i++ });
  });
  if (rows.length) await supabase.from("game_images").insert(rows);
}

exports.handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  if (method === "OPTIONS") return { statusCode: 204, headers };

  if (method !== "PUT" && method !== "POST") return respond(405, { error: "method_not_allowed" });
  if (!isAdmin(event)) return respond(403, { error: "forbidden" });

  let supabase;
  try {
    supabase = client();
  } catch (e) {
    return respond(500, { error: "server_error", message: "supabase_not_configured" });
  }

  try {
    const doc = readBody(event);
    const json = JSON.stringify(doc || {});
    if (json.length > MAX_BODY) return respond(413, { error: "payload_too_large" });

    const games = Array.isArray(doc.games) ? doc.games.slice(0, MAX_ITEMS) : [];
    const lessons = Array.isArray(doc.lessons) ? doc.lessons.slice(0, 500) : [];
    const updates = Array.isArray(doc.updates) ? doc.updates.slice(0, 500) : [];
    const news = Array.isArray(doc.news) ? doc.news.slice(0, 500) : [];

    /* games + translations + images */
    for (const g of games) {
      const id = await upsertGame(supabase, toGameRow(g));
      await syncTranslations(supabase, id, g);
      await syncImages(supabase, id, g);
    }

    /* lessons: full snapshot */
    if (doc.lessons && Array.isArray(doc.lessons)) {
      await supabase.from("lessons").delete().gte("sort_order", 0);
      const rows = lessons.map((l, i) => ({
        icon: String(l.icon || ""),
        title: String(l.title || ""),
        desc: String(l.desc || ""),
        link: String(l.link || ""),
        sort_order: l.id !== undefined ? num(l.id) : i,
        status: "published",
      }));
      if (rows.length) await supabase.from("lessons").insert(rows);
    }

    /* updates: full snapshot */
    if (doc.updates && Array.isArray(doc.updates)) {
      await supabase.from("updates").delete().gte("created_at", "1970-01-01");
      const rows = updates.map((u) => ({
        title: String(u.title || ""),
        body: String(u.ar || ""),
        link: String(u.link || ""),
        date: String(u.days || u.date || ""),
        status: "published",
      }));
      if (rows.length) await supabase.from("updates").insert(rows);
    }

    /* news: upsert by slug */
    for (const n of news) {
      const slug = String(n.slug || slugify(n.title) || "news-" + n.id);
      const row = {
        slug: slug,
        title: String(n.title || ""),
        content: String(n.content || n.body || n.desc || ""),
        image: String(n.image || ""),
        date: String(n.date || ""),
        pinned: !!(n.pinned),
        status: n.status || (n.published ? "published" : "draft"),
      };
      await supabase.from("news").upsert(row, { onConflict: "slug" });
    }

    /* settings: single row, secrets stripped */
    if (doc.settings && typeof doc.settings === "object") {
      const s = doc.settings;
      const socials = s.socials || {};
      delete socials.publishKey;
      const safe = {
        id: 1,
        site_name: String((s.site && s.site.name) || "ريان ألعاب"),
        site_mark: String((s.site && s.site.mark) || "ر"),
        tagline: String((s.site && s.site.tagline) || "تعريبات الألعاب العربية"),
        about: String(s.about || ""),
        support_note: String(s.supportNote || ""),
        contact_email: String(s.contactEmail || ""),
        owner_email: String(s.ownerEmail || "cmn124you@gmail.com"),
        socials: socials,
        ads: s.ads || {},
        slides: s.slides || [],
      };
      await supabase.from("settings").upsert(safe, { onConflict: "id" });
    }

    return respond(200, { ok: true, updatedAt: Date.now() });
  } catch (err) {
    const msg = String((err && err.message) || err);
    return respond(msg === "invalid_json" ? 400 : 500, { error: "server_error", message: msg });
  }
};
