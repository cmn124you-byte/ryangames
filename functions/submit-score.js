const { getStore } = require("@netlify/blobs");

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

const ALLOWED_GAMES = ["fish", "jump", "fight", "words", "ahmd", "quiz", "arrange", "dhikr"];

exports.handler = async (event) => {
  const base = {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  };
  const respond = (statusCode, body) =>
    Object.assign({}, base, { statusCode, body: JSON.stringify(body) });

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

    const store = getStoreSafe();
    const key = "scores:" + game + ":" + userId;
    const existing = await store.get(key, { type: "json" });
    if (existing && existing.score >= entry.score) {
      return respond(200, { saved: false, best: existing.score });
    }
    await store.set(key, entry);
    return respond(200, { saved: true, best: entry.score });
  } catch (err) {
    return respond(500, { error: "server_error", message: String((err && err.message) || err) });
  }
};
