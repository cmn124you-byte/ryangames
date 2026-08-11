const { getStore } = require("@netlify/blobs");

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
    const keys = Object.keys(env).filter((k) => /NETLIFY/i.test(k)).join(",");
    const e = new Error("blobs_unavailable env=" + (keys || "none"));
    e.cause = String(err && err.message);
    throw e;
  }
}

exports.handler = async (event) => {
  const base = {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  };
  const respond = (statusCode, body) =>
    Object.assign({}, base, { statusCode, body: JSON.stringify(body) });

  try {
    const q = event.queryStringParameters || {};
    const game = q.game || "all";
    const country = q.country || "";
    const limit = Math.min(100, parseInt(q.limit, 10) || 50);

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

    return respond(200, { game, country, list: top });
  } catch (err) {
    return respond(500, { error: "server_error", message: String(err && err.message), cause: String(err && err.cause || "") });
  }
};
