/* ============================================================
 * Ryan Games — minigame leaderboard (Supabase-first)
 * Route: /api/leaderboard?game=X&country=Y&limit=N
 * GET -> top scores. "words" maps to the quiz/arrange/dhikr set.
 * When game=all or a country filter is used, only each user's best
 * score counts (same rule as the legacy Netlify Blobs store).
 * If Supabase is not configured, falls back to Netlify Blobs.
 * ============================================================ */
const { getStore } = require("@netlify/blobs");
const { createClient } = require("@supabase/supabase-js");

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
      return getStore({
        name: "ry-scores",
        siteID: env.NETLIFY_BLOBS_SITE_ID,
        token: env.NETLIFY_BLOBS_TOKEN,
      });
    }
    if (env.NETLIFY_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({
        name: "ry-scores",
        siteID: env.NETLIFY_SITE_ID,
        token: env.NETLIFY_BLOBS_TOKEN,
      });
    }
    throw err;
  }
}

const respond = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

function dedupeBest(entries, keyFn) {
  const byUser = {};
  entries.forEach((e) => {
    const id = keyFn(e);
    if (!byUser[id] || e.score > byUser[id].score) byUser[id] = e;
  });
  return Object.keys(byUser).map((k) => byUser[k]);
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const game = q.game || "all";
    const country = q.country || "";
    const limit = Math.min(100, parseInt(q.limit, 10) || 50);

    const sb = supabase();
    if (sb) {
      const games = game === "words" ? ["quiz", "arrange", "dhikr"] : game === "all" ? null : [game];
      let query = sb
        .from("scores")
        .select("user_id,email,nickname,country,flag,game,score,ts")
        .order("score", { ascending: false })
        .order("ts", { ascending: true })
        .limit(2000);
      if (country) query = query.eq("country", country);
      if (games) query = query.in("game", games);

      const { data, error } = await query;
      if (!error) {
        const rows = Array.isArray(data) ? data : [];
        let list = dedupeBest(rows, (e) => e.user_id || e.email);
        list.sort((a, b) => b.score - a.score || a.ts - b.ts);
        const top = list.slice(0, limit).map((e, i) => ({
          rank: i + 1,
          nickname: e.nickname,
          flag: e.flag,
          country: e.country,
          game: e.game,
          score: e.score,
          ts: e.ts,
          userId: e.user_id || e.email,
        }));
        return respond(200, { game, country, list: top });
      }
    }

    const store = getStoreSafe();
    const result = await store.list({ prefix: "scores:" });
    const entries = [];
    for (const meta of result.blobs) {
      const raw = await store.get(meta.key, { type: "json" });
      if (raw && typeof raw.score === "number") entries.push(raw);
    }

    let list = entries;
    if (country) list = list.filter((e) => e.country === country);
    if (game !== "all") {
      const games = game === "words" ? ["quiz", "arrange", "dhikr"] : [game];
      list = list.filter((e) => games.indexOf(e.game) !== -1);
    }

    if (game === "all" || country) {
      list = dedupeBest(list, (e) => e.userId || e.email);
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

    return respond(200, { game, country, list: top });
  } catch (err) {
    return respond(500, { error: "server_error", message: String((err && err.message) || err) });
  }
};
