/* Cloudflare Pages advanced-mode worker for ryan games.
 * Routes /api/* to KV-backed handlers; everything else is served from ASSETS.
 * KV namespace binding: RY_SITE
 * Keys: "site-data", "requests", "scores:{game}:{userId}"
 */
const DEFAULT_ADMIN_KEY = "ryan2026";
const MAX_BODY = 8 * 1024 * 1024;
const MAX_ITEMS = 2000;
const ALLOWED_GAMES = ["fish", "jump", "fight", "words", "ahmd", "quiz", "arrange", "dhikr"];

const CORS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });

async function readBody(request) {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("invalid_json");
  }
}

function sanitize(doc) {
  if (!doc || typeof doc !== "object") return null;
  const out = {
    games: Array.isArray(doc.games) ? doc.games.slice(0, 2000) : [],
    lessons: Array.isArray(doc.lessons) ? doc.lessons.slice(0, 500) : [],
    updates: Array.isArray(doc.updates) ? doc.updates.slice(0, 500) : [],
    settings: doc.settings && typeof doc.settings === "object" ? doc.settings : {},
    updatedAt: Date.now(),
  };
  out.settings = Object.assign({}, out.settings);
  delete out.settings.adminPass;
  delete out.settings.publishKey;
  return out;
}

function isOwnerRequest(request, env) {
  const key = (request.headers.get("x-admin-key") || request.headers.get("X-Admin-Key") || "").trim();
  const expected = String(env.ADMIN_WRITE_KEY || DEFAULT_ADMIN_KEY).trim();
  return key !== "" && key === expected;
}

async function kvGet(kv, key) {
  const raw = await kv.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function kvSet(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}

async function loadRequests(kv) {
  const raw = await kv.get("requests");
  if (raw === null) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

async function handleSiteData(request, env) {
  const kv = env.RY_SITE;
  const method = request.method.toUpperCase();

  if (method === "GET") {
    const doc = await kvGet(kv, "site-data");
    return json(doc || { games: [], lessons: [], updates: [], settings: {}, updatedAt: 0 });
  }

  if (method === "PUT" || method === "POST") {
    if (!isOwnerRequest(request, env)) return json({ error: "forbidden" }, 403);
    const body = await readBody(request);
    const doc = sanitize(body);
    if (!doc) return json({ error: "invalid_payload" }, 400);
    const str = JSON.stringify(doc);
    if (str.length > MAX_BODY) return json({ error: "payload_too_large" }, 413);
    await kvSet(kv, "site-data", doc);
    return json({ ok: true, updatedAt: doc.updatedAt });
  }

  return json({ error: "method_not_allowed" }, 405);
}

async function handleRequests(request, env, url) {
  const kv = env.RY_SITE;
  const method = request.method.toUpperCase();

  if (method === "GET") {
    return json(await loadRequests(kv));
  }

  if (method === "POST") {
    const body = await readBody(request);
    const game = String(body.game || "").trim().slice(0, 200);
    if (!game) return json({ error: "missing_game" }, 400);
    const item = {
      id: String(body.id || "r" + Date.now()),
      game: game,
      desc: String(body.desc || "").trim().slice(0, 500),
      contact: String(body.contact || "").trim().slice(0, 200),
      date: String(body.date || new Date().toLocaleDateString("ar-EG")),
      ts: Date.now(),
    };
    const list = await loadRequests(kv);
    list.push(item);
    if (list.length > MAX_ITEMS) list.splice(0, list.length - MAX_ITEMS);
    await kvSet(kv, "requests", list);
    return json({ ok: true, count: list.length });
  }

  if (method === "DELETE") {
    const id = url.searchParams.get("id") || "";
    let list = await loadRequests(kv);
    const before = list.length;
    list = list.filter((x) => String(x.id) !== String(id));
    await kvSet(kv, "requests", list);
    return json({ ok: true, removed: before - list.length });
  }

  return json({ error: "method_not_allowed" }, 405);
}

async function listScores(kv) {
  const entries = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: "scores:", cursor });
    for (const k of page.keys) {
      const e = await kvGet(kv, k.name);
      if (e && typeof e.score === "number") entries.push(e);
    }
    cursor = page.cursor;
  } while (cursor);
  return entries;
}

async function handleLeaderboard(request, env, url) {
  const kv = env.RY_SITE;
  const game = url.searchParams.get("game") || "all";
  const country = url.searchParams.get("country") || "";
  const limit = Math.min(100, parseInt(url.searchParams.get("limit"), 10) || 50);

  let list = await listScores(kv);
  if (country) list = list.filter((e) => e.country === country);
  if (game !== "all") {
    const games = game === "words" ? ["quiz", "arrange", "dhikr"] : [game];
    list = list.filter((e) => games.indexOf(e.game) !== -1);
  }

  if (game === "all" || country) {
    const byUser = {};
    list.forEach((e) => {
      const id = e.userId || e.email;
      if (!byUser[id] || e.score > byUser[id].score) byUser[id] = e;
    });
    list = Object.keys(byUser).map((k) => byUser[k]);
  }

  list.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const top = list.slice(0, limit).map((e, i) => ({
    rank: i + 1,
    nickname: e.nickname,
    flag: e.flag,
    country: e.country,
    game: e.game,
    score: e.score,
    ts: e.ts,
    userId: e.userId,
  }));

  return json({ game, country, list: top });
}

async function handleSubmitScore(request, env) {
  const kv = env.RY_SITE;
  const body = await readBody(request);
  const game = String(body.game || "").trim();
  const score = Math.max(0, Math.floor(parseInt(body.score, 10) || 0));
  if (!game) return json({ error: "missing_game" }, 400);
  if (ALLOWED_GAMES.indexOf(game) === -1) return json({ error: "unknown_game" }, 400);

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "missing_email" }, 400);

  const userId = email;
  const entry = {
    userId: userId,
    email: email,
    nickname: String(body.nickname || email.split("@")[0] || "لاعب").slice(0, 40),
    country: String(body.country || "").slice(0, 60),
    flag: String(body.flag || "🌍").slice(0, 8),
    game: game,
    score: Number(score),
    ts: Date.now(),
  };

  const key = "scores:" + game + ":" + userId;
  const existing = await kvGet(kv, key);
  if (existing && existing.score >= entry.score) {
    return json({ saved: false, best: existing.score });
  }
  await kvSet(kv, key, entry);
  return json({ saved: true, best: entry.score });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    const method = request.method.toUpperCase();
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      const route = url.pathname.slice(5);
      if (route === "site-data") return await handleSiteData(request, env);
      if (route === "request" || route === "requests") return await handleRequests(request, env, url);
      if (route === "leaderboard") return await handleLeaderboard(request, env, url);
      if (route === "submit-score") return await handleSubmitScore(request, env);
      return json({ error: "not_found" }, 404);
    } catch (err) {
      const msg = String((err && err.message) || err);
      return json({ error: "server_error", message: msg }, msg === "invalid_json" ? 400 : 500);
    }
  },
};
