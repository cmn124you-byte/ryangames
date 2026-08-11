/* ============================================================
 * Ryan Games — translation requests (Supabase-first)
 * Route: /api/request
 * POST  -> create a translation request (public)
 * DELETE -> remove a request by id (admin)
 * If Supabase is not configured, falls back to Netlify Blobs
 * (legacy path) so nothing is lost during migration.
 * ============================================================ */
const { getStore } = require("@netlify/blobs");
const { createClient } = require("@supabase/supabase-js");

const STORE = "ry-requests";
const KEY = "requests";
const MAX_ITEMS = 2000;
const DEFAULT_ADMIN_KEY = "ryan2026";

function supabase() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

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

async function loadLegacy(store) {
  const list = await store.get(KEY, { type: "json" });
  return Array.isArray(list) ? list : [];
}

function isAdmin(event) {
  const key = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();
  const expected = (process.env.ADMIN_WRITE_KEY || DEFAULT_ADMIN_KEY).trim();
  return key !== "" && key === expected;
}

exports.handler = async (event) => {
  try {
    const sb = supabase();
    const method = event.httpMethod || "GET";

    if (method === "GET") {
      if (sb) {
        const { data, error } = await sb
          .from("translation_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(MAX_ITEMS);
        if (!error) {
          return respond(200, (data || []).map(function (r) {
            return {
              id: r.id,
              game: r.game || "",
              desc: r.message || "",
              contact: r.requester || "",
              date: r.date || "",
              status: r.status || "new",
            };
          }));
        }
      }
      const store = getStoreSafe();
      return respond(200, await loadLegacy(store));
    }

    if (method === "POST") {
      const body = readBody(event);
      const game = String(body.game || "").trim().slice(0, 200);
      if (!game) return respond(400, { error: "missing_game" });
      const item = {
        game,
        requester: String(body.contact || "").trim().slice(0, 200),
        message: String(body.desc || "").trim().slice(0, 500),
        status: "new",
        date: String(body.date || new Date().toLocaleDateString("ar-EG")),
      };
      if (sb) {
        const { error } = await sb.from("translation_requests").insert(item);
        if (!error) return respond(200, { ok: true });
        // fall through to legacy on failure (non-destructive)
      }
      const store = getStoreSafe();
      const list = await loadLegacy(store);
      list.push(Object.assign({ id: "r" + Date.now(), desc: item.message, contact: item.requester }, item));
      if (list.length > MAX_ITEMS) list.splice(0, list.length - MAX_ITEMS);
      await store.set(KEY, list);
      return respond(200, { ok: true, count: list.length });
    }

    if (method === "DELETE") {
      if (!isAdmin(event)) return respond(403, { error: "forbidden" });
      const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
      if (sb) {
        const { error } = await sb.from("translation_requests").delete().eq("id", id);
        if (!error) return respond(200, { ok: true, removed: 1 });
      }
      const store = getStoreSafe();
      let list = await loadLegacy(store);
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
