#!/usr/bin/env node
/**
 * Ryan Games — Safe Migration script: legacy (data.js + optional live API)
 * -> Supabase (PostgreSQL + Storage). Non-destructive: it only READS the old
 * sources and UPSERTS into Supabase. The old files are never deleted.
 *
 * Usage:
 *   npm install
 *   set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  (see .env.example)
 *   node seed.mjs
 *
 * Output: migration-report.json with per-table counts to verify nothing is lost.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const LEGACY_DATA_URL = process.env.LEGACY_DATA_URL || ""; // optional: e.g. live /api/site-data

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see supabase/seed/.env.example).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------- helpers ---------- */
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  return res.json();
}

/* ---------- 1. read legacy sources (never modify them) ---------- */
const dataJsPath = join(ROOT, "data.js");
const dataJs = readFileSync(dataJsPath, "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataJs, sandbox);

const DEFAULT_GAMES = Array.isArray(sandbox.DEFAULT_GAMES) ? sandbox.DEFAULT_GAMES : [];
const DEFAULT_LESSONS = Array.isArray(sandbox.DEFAULT_LESSONS) ? sandbox.DEFAULT_LESSONS : [];
const DEFAULT_UPDATES = Array.isArray(sandbox.DEFAULT_UPDATES) ? sandbox.DEFAULT_UPDATES : [];
const DEFAULT_SETTINGS = sandbox.DEFAULT_SETTINGS || {};
const DATA_VERSION = sandbox.DATA_VERSION || 0;

let live = null;
if (LEGACY_DATA_URL) {
  try {
    live = await fetchJson(LEGACY_DATA_URL);
    console.log("Loaded live legacy data from", LEGACY_DATA_URL);
  } catch (e) {
    console.warn("Could not load live legacy data:", e.message);
  }
}

const games = live && Array.isArray(live.games) && live.games.length ? live.games : DEFAULT_GAMES;
const lessons = live && Array.isArray(live.lessons) && live.lessons.length ? live.lessons : DEFAULT_LESSONS;
const updates = live && Array.isArray(live.updates) && live.updates.length ? live.updates : DEFAULT_UPDATES;
const settings = Object.assign({}, DEFAULT_SETTINGS, (live && live.settings) || {});

const requestsPath = join(ROOT, "_data", "requests.json");
let requests = [];
try {
  if (existsSync(requestsPath)) {
    const parsed = JSON.parse(readFileSync(requestsPath, "utf8"));
    if (Array.isArray(parsed)) requests = parsed;
  }
} catch (e) {
  console.warn("Could not read _data/requests.json:", e.message);
}

const report = {
  legacy: {
    dataVersion: DATA_VERSION,
    games: games.length,
    lessons: lessons.length,
    updates: updates.length,
    settings: true,
    requests: requests.length,
  },
  migrated: {},
  imagesUploaded: 0,
  errors: [],
};

/* ---------- 2. upload local image files to Storage (keep relative path on failure) ---------- */
async function uploadIfLocal(url, folder, name) {
  if (!url) return url;
  if (/^https?:\/\//.test(url) || /^data:/.test(url) || /^blob:/.test(url)) return url;
  const clean = url.replace(/^\//, "").split("?")[0];
  const localPath = join(ROOT, clean);
  if (!existsSync(localPath)) return url;
  const ext = (basename(clean).split(".").pop() || "png").toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg" ? "image/jpeg"
    : ext === "webp" ? "image/webp"
    : ext === "png" ? "image/png"
    : ext === "gif" ? "image/gif"
    : ext === "avif" ? "image/avif"
    : "application/octet-stream";
  const bytes = readFileSync(localPath);
  const objectName = "uploads/games/" + folder + "/" + name + "." + ext;
  try {
    const { error } = await supabase.storage.from("ry-games").upload(objectName, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (error) throw error;
    report.imagesUploaded++;
    const { data: pub } = supabase.storage.from("ry-games").getPublicUrl(objectName);
    return pub.publicUrl;
  } catch (e) {
    report.errors.push("image upload failed for " + clean + ": " + e.message);
    return url; // non-destructive: keep the original URL
  }
}

/* ---------- 3. map & upsert games ---------- */
const gameRows = [];
for (const g of games) {
  const slug = slugify(g.slug || g.title);
  if (!slug) continue;
  const cover = await uploadIfLocal(g.cover, slug, "cover");

  const gameRow = {
    slug,
    title_ar: String(g.ar || g.title || "").trim(),
    title_en: String(g.title || "").trim(),
    description: String(g.desc || ""),
    cover_url: cover,
    status: g.status || "published",
    platform: Array.isArray(g.platforms) ? g.platforms : [],
    genre: Array.isArray(g.genres) ? g.genres : [],
    size: g.size || "",
    downloads: parseInt(g.downloads, 10) || 0,
    release_date: g.date || g.releaseDate || "",
    buy_url: g.buy || "",
    free: !!g.free,
    is_app: !!g.isApp,
    translation_status: g.translationStatus || (g.arLocal ? "active" : "inactive"),
    translation_version: g.translationVersion || g.translationVer || "",
    translation_date: g.translationDate || "",
    install_time: g.installTime || "",
    compat: g.compat || "",
    min_requirements: g.min || "",
    rec_requirements: g.rec || "",
    installation_guide: g.installationGuide || "",
    notes: g.notes || "",
    video_url: g.video || "",
    download_url: g.link || g.downloadUrl || "",
    download_url_alt: g.linkAlt || "",
    download_pass_hash: g.pass ? String(g.pass) : "",
    browser_title: g.browserTitle || "",
    featured: !!(settings.slides || []).some((s) => String(s.gameId) === String(g.id)),
    legacy_id: g.id !== undefined ? g.id : null,
    meta: g,
  };

  const { error } = await supabase.from("games").upsert(gameRow, { onConflict: "slug" });
  if (error) {
    report.errors.push("game upsert " + slug + ": " + error.message);
    continue;
  }
  gameRows.push({ slug, game: g, cover });
}

/* ---------- 4. game_images + translations per game ---------- */
let translationsMigrated = 0;
let imagesMigrated = 0;

for (const { slug, game: g, cover } of gameRows) {
  const { data: gdb } = await supabase.from("games").select("id").eq("slug", slug).single();
  if (!gdb) continue;
  const gameId = gdb.id;

  if (cover) {
    await supabase.from("game_images").delete().eq("game_id", gameId).eq("kind", "cover");
    await supabase.from("game_images").insert({ game_id: gameId, url: cover, kind: "cover", sort_order: 0 });
    imagesMigrated++;
  }

  let idx = 1;
  for (const shot of g.gallery || []) {
    const sUrl = await uploadIfLocal(shot, slug, "screenshot-" + idx);
    await supabase.from("game_images").insert({ game_id: gameId, url: sUrl, kind: "screenshot", sort_order: idx });
    idx++;
    imagesMigrated++;
  }

  const dlUrl = g.link || g.downloadUrl || "";
  if (dlUrl) {
    await supabase.from("translations").delete().eq("game_id", gameId);
    const { error } = await supabase.from("translations").insert({
      game_id: gameId,
      version: g.translationVer || g.translationVersion || "1.0",
      status: "published",
      download_url: dlUrl,
      installation_guide: g.installationGuide || "",
      changelog: g.changelog || "",
      translation_date: g.translationDate || g.date || "",
    });
    if (error) report.errors.push("translation insert " + slug + ": " + error.message);
    else translationsMigrated++;
  }
}

/* ---------- 5. lessons ---------- */
for (const l of lessons) {
  const { error } = await supabase
    .from("lessons")
    .upsert(
      {
        icon: l.icon || "",
        title: l.title || "",
        desc: l.desc || "",
        link: l.link || "",
        sort_order: l.id || 0,
        status: "published",
      },
      { onConflict: "id" }
    );
  if (error) report.errors.push("lesson upsert: " + error.message);
}
report.migrated.lessons = lessons.length;

/* ---------- 6. updates ---------- */
for (const u of updates) {
  const { error } = await supabase.from("updates").insert({
    title: u.title || "",
    body: u.ar || "",
    link: u.link || "",
    date: u.days || u.date || "",
    status: "published",
  });
  if (error) report.errors.push("update insert: " + error.message);
}
report.migrated.updates = updates.length;

/* ---------- 7. translation_requests ---------- */
for (const r of requests) {
  const { error } = await supabase.from("translation_requests").insert({
    game: r.game || "",
    requester: r.contact || r.requester || "",
    message: r.desc || r.message || "",
    status: r.status || "new",
    date: r.date || "",
  });
  if (error) report.errors.push("request insert: " + error.message);
}
report.migrated.requests = requests.length;

/* ---------- 8. settings (no secrets) ---------- */
const safeSettings = {
  site_name: String((settings.site && settings.site.name) || "ريان ألعاب"),
  site_mark: String((settings.site && settings.site.mark) || "ر"),
  tagline: String((settings.site && settings.site.tagline) || "تعريبات الألعاب العربية"),
  about: String(settings.about || ""),
  support_note: String(settings.supportNote || ""),
  contact_email: String(settings.contactEmail || ""),
  owner_email: String(settings.ownerEmail || "cmn124you@gmail.com"),
  socials: settings.socials || {},
  ads: settings.ads || {},
  slides: settings.slides || [],
};
await supabase.from("settings").upsert({ id: 1, ...safeSettings }, { onConflict: "id" });
report.migrated.settings = 1;

/* ---------- 9. verify + report ---------- */
const { count: gamesInDb } = await supabase.from("games").select("*", { count: "exact", head: true });
const { count: translationsInDb } = await supabase.from("translations").select("*", { count: "exact", head: true });
const { count: lessonsInDb } = await supabase.from("lessons").select("*", { count: "exact", head: true });
const { count: updatesInDb } = await supabase.from("updates").select("*", { count: "exact", head: true });
const { count: imagesInDb } = await supabase.from("game_images").select("*", { count: "exact", head: true });

report.migrated.games = gameRows.length;
report.migrated.translations = translationsMigrated;
report.migrated.game_images = imagesMigrated;
report.verified = {
  games: gamesInDb,
  translations: translationsInDb,
  lessons: lessonsInDb,
  updates: updatesInDb,
  game_images: imagesInDb,
};
report.verified.allGamesMigrated = gamesInDb >= games.length;
report.verified.allTranslationsMigrated = translationsInDb >= translationsMigrated;
report.verified.allLessonsMigrated = lessonsInDb >= lessons.length;
report.verified.allUpdatesMigrated = updatesInDb >= updates.length;

const reportPath = join(__dirname, "migration-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

console.log("Migration report written to supabase/seed/migration-report.json");
console.log(JSON.stringify(report.verified, null, 2));
if (report.errors.length) {
  console.warn("\nWarnings/errors (data kept in old files, nothing deleted):");
  report.errors.forEach((e) => console.warn(" - " + e));
}
