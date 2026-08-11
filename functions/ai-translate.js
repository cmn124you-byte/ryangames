/* ============================================================
 * Ryan Games — AI image translation (صورة إنجليزية -> عربية)
 * Route: /api/ai-translate  (admin only)
 *
 * The AI provider key lives in env vars ONLY (never in frontend).
 * Configure one of:
 *   AI_TRANSLATE_PROVIDER = "openai" | "google" | "gemini"
 *   OPENAI_API_KEY | GOOGLE_API_KEY  (+ optional AI_MODEL)
 *
 * If no provider is configured this returns 501 so the UI can show
 * "الخدمة غير مفعّلة" — the architecture stays ready to expand.
 *
 * Flow: image (base64) -> OCR + Arabic overlay -> result base64.
 * ============================================================ */
const DEFAULT_ADMIN_KEY = "ryan2026";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });

function isAdmin(event) {
  const key = (event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "").trim();
  const expected = (process.env.ADMIN_WRITE_KEY || DEFAULT_ADMIN_KEY).trim();
  return key !== "" && key === expected;
}

async function translateWithOpenAI(base64) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("missing_OPENAI_API_KEY");
  const model = process.env.AI_MODEL || "gpt-4o";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You translate English text inside game UI screenshots into Arabic. Return a JSON object with fields: detected_text (the English text found) and arabic_text (faithful Arabic translation). Do not add commentary.",
        },
        { role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64," + base64 } }] },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error("openai_http_" + res.status);
  const data = await res.json();
  const content = JSON.parse(data.choices[0].message.content);
  return content;
}

async function translateWithGoogle(base64) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("missing_GOOGLE_API_KEY");
  const model = process.env.AI_MODEL || "gemini-2.0-flash";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: "Translate the English text in this screenshot to Arabic. Respond with JSON {\"detected_text\":\"...\",\"arabic_text\":\"...\"}." },
            { inline_data: { mime_type: "image/png", data: base64 } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("google_http_" + res.status);
  const data = await res.json();
  const text = data.candidates && data.candidates[0] && data.candidates[0].content
    ? data.candidates[0].content.parts.map((p) => p.text || "").join("")
    : "";
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { detected_text: text, arabic_text: text };
  }
}

exports.handler = async (event) => {
  const method = (event.httpMethod || "GET").toUpperCase();
  if (method === "OPTIONS") return { statusCode: 204, headers };
  if (method !== "POST") return respond(405, { error: "method_not_allowed" });
  if (!isAdmin(event)) return respond(403, { error: "forbidden" });

  try {
    const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
    const base64 = String(body.image || "").replace(/^data:[^;]*;base64,/, "");
    const lang = String(body.lang || "ar");
    if (!base64) return respond(400, { error: "missing_image" });

    const provider = String(process.env.AI_TRANSLATE_PROVIDER || "").toLowerCase();
    if (provider === "openai") {
      return respond(200, { ok: true, lang, result: await translateWithOpenAI(base64) });
    }
    if (provider === "google" || provider === "gemini") {
      return respond(200, { ok: true, lang, result: await translateWithGoogle(base64) });
    }

    return respond(501, {
      error: "ai_translate_not_configured",
      message:
        "لم يتم تفعيل خدمة الترجمة بالذكاء الاصطناعي بعد. أضف AI_TRANSLATE_PROVIDER ومفتاح المزوّد في إعدادات Netlify.",
    });
  } catch (err) {
    const msg = String((err && err.message) || err);
    return respond(msg.indexOf("http_") === 0 ? 502 : 500, { error: "server_error", message: msg });
  }
};
