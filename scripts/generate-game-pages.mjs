/* ============================================================
 * Ryan Games — static SEO page generator
 * Reads published games from Supabase (anon REST) first, falls
 * back to data.js defaults when offline/unconfigured, and
 * generates game-<slug>.html pages (SEO landing pages) +
 * sitemap.xml. Run in GitHub Actions before deploying to Pages.
 * Runtime data still comes live from Supabase via renderGamePage.
 * ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE_URL = "https://cmn124you-byte.github.io/ryangames/";

function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "");
}

function loadConfig() {
  const src = readFileSync(path.join(root, "ry-config.js"), "utf8");
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.RY_CONFIG || {};
}

async function fetchSupabaseGames() {
  const cfg = loadConfig();
  const url = cfg.SUPABASE_URL || "";
  const anon = cfg.SUPABASE_ANON_KEY || "";
  if (!url || !anon || url.indexOf("supabase.co") === -1) return null;
  const r = await fetch(
    url + "/rest/v1/games?select=*&status=eq.published&order=updated_at.desc&limit=500",
    { headers: { apikey: anon, Authorization: "Bearer " + anon } },
  );
  if (!r.ok) return null;
  const rows = await r.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows.map((g) => ({
    slug: g.slug || slugify(g.title_en || g.title_ar || ""),
    title: g.title_en || g.title_ar || "",
    ar: g.title_ar || "",
    cover: g.cover_url || "",
    desc: g.description || "",
    shortDesc: g.description || "",
  }));
}

function loadDefaults() {
  const src = readFileSync(path.join(root, "data.js"), "utf8");
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return {
    games: sandbox.DEFAULT_GAMES || [],
    settings: sandbox.DEFAULT_SETTINGS || {},
  };
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPage(game, tpl) {
  const title = game.ar || game.title;
  const desc = game.desc || game.shortDesc || `تحميل لعبة ${game.title} معرّبة للعربية مجاناً — التفاصيل والمتطلبات ومعرض الصور ودروس التثبيت.`;
  const slug = esc(slugify(game.slug || game.title));
  return tpl
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} | ريان ألعاب</title>`)
    .replace(/<meta name="description"[^>]*\/>/, `<meta name="description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:title"[^>]*\/>/, `<meta property="og:title" content="${esc(title)} | ريان ألعاب" />`)
    .replace(/<meta property="og:description"[^>]*\/>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:image"[^>]*\/>/, `<meta property="og:image" content="${esc(game.cover || SITE_URL + "promo/thumbnail.png")}" />`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="game-${slug}.html"`)
    .replace(/<script src="ry-config\.js"><\/script>/, `<script>window.__GAME_SLUG = "${slug}";</script>\n  <script src="ry-config.js"></script>`)
    .replace(/game-the-supper\.html/g, `game-${slug}.html`);
}

function main() {
  const { games: defaultGames, settings } = loadDefaults();
  fetchSupabaseGames()
    .then((supaGames) => {
      const games = supaGames || defaultGames;
      writePages(games, settings, supaGames ? "supabase" : "data.js");
    })
    .catch((err) => {
      console.error("[seo] Supabase fetch failed, using data.js:", String(err && err.message || err));
      writePages(defaultGames, settings, "data.js");
    });
}

function writePages(games, settings, source) {
  const tpl = readFileSync(path.join(root, "game.html"), "utf8");
  const outDir = path.join(root, "_pages");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const urlset = [
    { loc: SITE_URL, freq: "weekly", prio: 1 },
    { loc: SITE_URL + "games.html", freq: "weekly", prio: 0.9 },
    { loc: SITE_URL + "new.html", freq: "weekly", prio: 0.8 },
    { loc: SITE_URL + "minigames.html", freq: "weekly", prio: 0.8 },
    { loc: SITE_URL + "game.html", freq: "weekly", prio: 0.6 },
    { loc: SITE_URL + "lessons.html", freq: "weekly", prio: 0.6 },
    { loc: SITE_URL + "download.html", freq: "weekly", prio: 0.6 },
    { loc: SITE_URL + "request.html", freq: "weekly", prio: 0.5 },
    { loc: SITE_URL + "contact.html", freq: "weekly", prio: 0.5 },
  ];

  let made = 0;
  for (const g of games || []) {
    if (!g || !(g.title || g.ar)) continue;
    const slug = slugify(g.slug || g.title);
    if (!slug) continue;
    writeFileSync(path.join(outDir, `game-${slug}.html`), buildPage(g, tpl));
    urlset.push({ loc: SITE_URL + `game-${slug}.html`, freq: "monthly", prio: 0.8 });
    made++;
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urlset.map(u => `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.prio}</priority>\n  </url>`).join("\n") +
    "\n</urlset>\n";
  writeFileSync(path.join(outDir, "sitemap.xml"), xml);

  console.log(`[seo] generated ${made} game page(s) + sitemap.xml into _pages/ (source: ${source}, site: ${settings.site ? settings.site.name : ""})`);
}

main();
