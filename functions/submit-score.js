const jwt = require("jsonwebtoken");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const base = {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  };
  const respond = (statusCode, body) =>
    Object.assign({}, base, { statusCode, body: JSON.stringify(body) });

  try {
    const token = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return respond(401, { error: "unauthorized" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return respond(401, { error: "invalid_token" });
    }

    const body = JSON.parse(event.body || "{}");
    const game = String(body.game || "").trim();
    const score = Math.max(0, Math.floor(parseInt(body.score, 10) || 0));
    if (!game) return respond(400, { error: "missing_game" });

    let fresh = null;
    const host = event.headers.host;
    if (host) {
      try {
        const resp = await fetch("https://" + host + "/.netlify/identity/user", {
          headers: { Authorization: "Bearer " + token },
        });
        if (resp.ok) fresh = await resp.json();
      } catch (err) {
        fresh = null;
      }
    }

    const meta = (fresh && (fresh.user_metadata || fresh.data)) || payload.user_metadata || {};
    const email = (fresh && fresh.email) || payload.email || "";
    const userId = (fresh && fresh.id) || payload.sub || "";

    const entry = {
      userId: String(userId),
      email: String(email),
      nickname: String(meta.nickname || (email.split("@")[0] || "لاعب")),
      country: String(meta.country || ""),
      flag: String(meta.flag || "🌍"),
      game: String(game),
      score: Number(score),
      ts: Date.now(),
    };

    const store = getStore({ name: "ry-scores" });
    const key = "scores:" + game + ":" + entry.userId;
    const existing = await store.get(key, { type: "json" });
    if (existing && existing.score >= entry.score) {
      return respond(200, { saved: false, best: existing.score });
    }
    await store.set(key, entry);
    return respond(200, { saved: true, best: entry.score });
  } catch (err) {
    return respond(500, { error: "server_error", message: String(err) });
  }
};
