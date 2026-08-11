/* ============================================================
 * Ryan Games — minigame score submission (Supabase-first)
 * Route: /api/submit-score
 * POST -> record the best score per (game, user). Keeps only the
 *         highest score; responds { saved:false, best } when the
 *         existing score is already better.
 * If Supabase is not configured, falls back to Netlify Blobs
 * (legacy path) so nothing is lost during migration.
 * ============================================================ */
const { getStore } = require("@netlify/blobs");
const { createClient } = require("@supabase/supabase-js");

const ALLOWED_GAMES = ["fish", "jump", "fight", "words", "ahmd", "quiz", "arrange", "dhikr"];

function supabase() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getStoreSafe() {
  try {
    return getStore({ name: "ry-scores" });
  } catch (err) {
    const env = process.env || {};
    if (env.NETLIFY_BLOBS_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: "ry-scores", siteID: env.NETLIFY_BLOBS_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    if (env.NETLIFY_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: "ry-scores", siteID: env.NETLIFY_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    throw err;
  }
}

const respond = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const game = String(body.game || "").trim();
    const score = Math.max(0, Math.floor(parseInt(body.score, 10) || 0));
    if (!game) return respond(400, { error: "missing_game" });
    if (ALLOWED_GAMES.indexOf(game) === -1) return respond(400, { error: "unknown_game" });

    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(400, { error: "missing_email" });

    const userId = email;
    const entry = {
      userId: userId,
      email: email,
      nickname: String(body.nickname || email.split("@")[0] || "لاعب").slice(0, 40),
      country: String(body.country || "").slice(0, 60),
      flag: String(body.flag || "🌍").slice(0, 8),
      game: String(game),
      score: Number(score),
      ts: Date.now(),
    };

    const sb = supabase();
    if (sb) {
      const { data: existing } = await sb
        .from("scores")
        .select("score")
        .eq("game", game)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing && existing.score >= entry.score) {
        return respond(200, { saved: false, best: existing.score });
      }
      const { error } = await sb.from("scores").upsert(entry, { onConflict: "game,user_id" });
      if (!error) return respond(200, { saved: true, best: entry.score });
    }

    const store = getStoreSafe();
    const key = "scores:" + game + ":" + userId;
    const legacy = await store.get(key, { type: "json" });
    if (legacy && legacy.score >= entry.score) {
      return respond(200, { saved: false, best: legacy.score });
    }
    await store.set(key, entry);
    return respond(200, { saved: true, best: entry.score });
  } catch (err) {
    return respond(500, { error: "server_error", message: String((err && err.message) || err) });
  }
};
