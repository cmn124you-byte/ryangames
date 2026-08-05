const { getStore } = require("@netlify/blobs");

const STORE = "ry-requests";
const KEY = "requests";
const MAX_ITEMS = 2000;

function getStoreSafe() {
  try {
    return getStore({ name: STORE });
  } catch (err) {
    const env = process.env || {};
    if (env.NETLIFY_BLOBS_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: STORE, siteID: env.NETLIFY_BLOBS_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    if (env.NETLIFY_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: STORE, siteID: env.NETLIFY_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    throw err;
  }
}

const respond = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

function readBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch (e) {
    throw new Error("invalid_json");
  }
}

async function loadList(store) {
  const list = await store.get(KEY, { type: "json" });
  return Array.isArray(list) ? list : [];
}

exports.handler = async (event) => {
  try {
    const store = getStoreSafe();
    const method = event.httpMethod || "GET";

    if (method === "GET") {
      return respond(200, await loadList(store));
    }

    if (method === "POST") {
      const body = readBody(event);
      const game = String(body.game || "").trim().slice(0, 200);
      if (!game) return respond(400, { error: "missing_game" });
      const item = {
        id: String(body.id || "r" + Date.now()),
        game: game,
        desc: String(body.desc || "").trim().slice(0, 500),
        contact: String(body.contact || "").trim().slice(0, 200),
        date: String(body.date || new Date().toLocaleDateString("ar-EG")),
        ts: Date.now(),
      };
      const list = await loadList(store);
      list.push(item);
      if (list.length > MAX_ITEMS) list.splice(0, list.length - MAX_ITEMS);
      await store.set(KEY, list);
      return respond(200, { ok: true, count: list.length });
    }

    if (method === "DELETE") {
      const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
      let list = await loadList(store);
      const before = list.length;
      list = list.filter((x) => String(x.id) !== String(id));
      await store.set(KEY, list);
      return respond(200, { ok: true, removed: before - list.length });
    }

    if (method === "OPTIONS") return respond(204, { ok: true });
    return respond(405, { error: "method_not_allowed" });
  } catch (err) {
    const msg = String((err && err.message) || err);
    return respond(msg === "invalid_json" ? 400 : 500, { error: "server_error", message: msg });
  }
};
