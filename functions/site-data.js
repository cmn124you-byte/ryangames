const { getStore } = require("@netlify/blobs");

const KEY = "site-data";
const OWNER_EMAIL = "cmn124you@gmail.com";
const DEFAULT_ADMIN_KEY = "ryan2026";
const MAX_BODY = 8 * 1024 * 1024;

function getStoreSafe() {
  try {
    return getStore({ name: "ry-site" });
  } catch (err) {
    const env = process.env || {};
    if (env.NETLIFY_BLOBS_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: "ry-site", siteID: env.NETLIFY_BLOBS_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    if (env.NETLIFY_SITE_ID && env.NETLIFY_BLOBS_TOKEN) {
      return getStore({ name: "ry-site", siteID: env.NETLIFY_SITE_ID, token: env.NETLIFY_BLOBS_TOKEN });
    }
    throw err;
  }
}

function base(extra) {
  return Object.assign(
    {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
    extra || {}
  );
}

const respond = (statusCode, body) => base({ statusCode, body: JSON.stringify(body) });

function readBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
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

function isOwnerRequest(event) {
  const key = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();
  const expected = (process.env.ADMIN_WRITE_KEY || DEFAULT_ADMIN_KEY).trim();
  return key !== "" && key === expected;
}

exports.handler = async (event) => {
  try {
    const store = getStoreSafe();
    const method = event.httpMethod || "GET";

    if (method === "GET") {
      const doc = await store.get(KEY, { type: "json" });
      return respond(200, doc || { games: [], lessons: [], updates: [], settings: {}, updatedAt: 0 });
    }

    if (method === "PUT" || method === "POST") {
      if (!isOwnerRequest(event)) return respond(403, { error: "forbidden" });
      const raw = readBody(event);
      const json = JSON.stringify(raw || {});
      if (json.length > MAX_BODY) return respond(413, { error: "payload_too_large" });
      const doc = sanitize(raw);
      await store.set(KEY, doc);
      return respond(200, { ok: true, updatedAt: doc.updatedAt });
    }

    if (method === "OPTIONS") return base({ statusCode: 204, headers: { Allow: "GET, PUT, POST, OPTIONS" } });

    return respond(405, { error: "method_not_allowed" });
  } catch (err) {
    const msg = String((err && err.message) || err);
    return respond(msg === "invalid_json" ? 400 : 500, { error: "server_error", message: msg });
  }
};
