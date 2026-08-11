/* ============================================================
 * Ryan Games — file upload to Supabase Storage
 * Route: /api/upload  (admin only; service_role key kept server-side)
 * Body: { fileName, contentType, base64, folder }
 * The file is stored under: uploads/{folder}/{fileName}
 * Returns the public URL.
 * ============================================================ */
const { createClient } = require("@supabase/supabase-js");

const DEFAULT_ADMIN_KEY = "ryan2026";
const MAX_BODY = 25 * 1024 * 1024; // 25 MB base64
const BUCKET = "ry-games";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function client() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("supabase_not_configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isAdmin(event) {
  const key = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();
  const expected = (process.env.ADMIN_WRITE_KEY || DEFAULT_ADMIN_KEY).trim();
  return key !== "" && key === expected;
}

function safeName(name) {
  const clean = String(name || "").replace(/[^\w.\u0600-\u06FF-]/g, "_");
  return clean.slice(0, 120);
}

function safeFolder(folder) {
  const clean = String(folder || "misc").replace(/[^\w/\u0600-\u06FF-]/g, "/").replace(/\/+/g, "/");
  return clean.slice(0, 200);
}

exports.handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  if (method === "OPTIONS") return { statusCode: 204, headers };
  if (method !== "POST") return respond(405, { error: "method_not_allowed" });
  if (!isAdmin(event)) return respond(403, { error: "forbidden" });

  let supabase;
  try {
    supabase = client();
  } catch (e) {
    return respond(500, { error: "server_error", message: "supabase_not_configured" });
  }

  try {
    const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
    const fileName = safeName(body.fileName);
    const contentType = String(body.contentType || "application/octet-stream");
    const folder = safeFolder(body.folder);
    const base64 = String(body.base64 || "").replace(/^data:[^;]*;base64,/, "");

    if (!fileName) return respond(400, { error: "missing_file_name" });
    if (!base64) return respond(400, { error: "missing_file_data" });
    if (base64.length > MAX_BODY) return respond(413, { error: "payload_too_large" });

    const bytes = Buffer.from(base64, "base64");
    const objectName = "uploads/" + folder + "/" + fileName;

    const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (bucketErr && bucketErr.message.indexOf("already exists") === -1) {
      // non-fatal: bucket may already exist
    }

    const { error } = await supabase.storage.from(BUCKET).upload(objectName, bytes, {
      contentType: contentType,
      upsert: true,
    });
    if (error) return respond(500, { error: "upload_failed", message: error.message });

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectName);
    return respond(200, { ok: true, url: data.publicUrl, path: objectName });
  } catch (err) {
    const msg = String((err && err.message) || err);
    return respond(msg.indexOf("Unexpected token") !== -1 ? 400 : 500, { error: "server_error", message: msg });
  }
};
