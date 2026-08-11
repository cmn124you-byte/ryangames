/* ============================================================
 * Ryan Games — list translation requests (Supabase-first)
 * Route: /api/requests  (admin reads; public-safe read-only)
 * Falls back to Netlify Blobs when Supabase is not configured.
 * ============================================================ */
const { getStore } = require("@netlify/blobs");
const { createClient } = require("@supabase/supabase-js");

const STORE = "ry-requests";
const KEY = "requests";
const MAX_ITEMS = 2000;

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

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };
  try {
    const sb = supabase();
    if (sb) {
      const { data, error } = await sb
        .from("translation_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(MAX_ITEMS);
      if (!error) {
        const legacy = (data || []).map(function (r) {
          return {
            id: r.id,
            game: r.game || "",
            desc: r.message || "",
            contact: r.requester || "",
            date: r.date || "",
            status: r.status || "new",
          };
        });
        return { statusCode: 200, headers, body: JSON.stringify(legacy) };
      }
    }
    const store = getStoreSafe();
    const list = await store.get(KEY, { type: "json" });
    return { statusCode: 200, headers, body: JSON.stringify(Array.isArray(list) ? list : []) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "server_error", message: String((err && err.message) || err) }) };
  }
};
