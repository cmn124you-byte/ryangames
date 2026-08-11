/* ============================================================
 * Ryan Games — live smoke test for the Netlify functions
 * ------------------------------------------------------------
 * Run from CI with NODE_PATH=<repo>/functions/node_modules so the
 * functions' CommonJS deps resolve. Requires real Supabase env
 * (SUPABASE_URL + SERVICE_ROLE). Invokes each function handler
 * exactly as Netlify would and checks status codes + shapes.
 * Any rows created for the test are deleted afterwards.
 * Exit code is 0 only when every check passes.
 * ============================================================ */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

const siteData = require(path.join(here, "..", "functions", "site-data.js"));
const leaderboard = require(path.join(here, "..", "functions", "leaderboard.js"));
const submitScore = require(path.join(here, "..", "functions", "submit-score.js"));
const request = require(path.join(here, "..", "functions", "request.js"));
const admin = require(path.join(here, "..", "functions", "admin.js"));
const { createClient } = require("@supabase/supabase-js");

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log("PASS " + name + (detail ? "  (" + detail + ")" : ""));
  else { failures++; console.log("FAIL " + name + (detail ? "  (" + detail + ")" : "")); }
}

async function call(handler, event) {
  const res = await handler.handler(event);
  let body = {};
  try { body = typeof res.body === "string" ? JSON.parse(res.body) : res.body; } catch (e) {}
  return { status: res.statusCode, body };
}

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !key) {
  console.log("SKIP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(0);
}

const testEmail = "smoketest-" + Date.now() + "@test.local";
const cleanup = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

try {
  /* ---------- site-data ---------- */
  {
    const { status, body } = await call(siteData, { httpMethod: "GET" });
    check("site-data GET 200", status === 200, "status=" + status);
    check("site-data games >= 4", Array.isArray(body.games) && body.games.length >= 4, "games=" + (body.games || []).length);
    check("site-data lessons >= 8", Array.isArray(body.lessons) && body.lessons.length >= 8, "lessons=" + (body.lessons || []).length);
    check("site-data updates >= 8", Array.isArray(body.updates) && body.updates.length >= 8, "updates=" + (body.updates || []).length);
    check("site-data settings present", !!(body.settings && body.settings.site && body.settings.site.name), "name=" + (body.settings && body.settings.site && body.settings.site.name));
  }

  /* ---------- leaderboard ---------- */
  {
    const all = await call(leaderboard, { httpMethod: "GET", queryStringParameters: { game: "all" } });
    check("leaderboard all 200 + list", all.status === 200 && Array.isArray(all.body.list), "count=" + (all.body.list || []).length);
    const words = await call(leaderboard, { httpMethod: "GET", queryStringParameters: { game: "words", country: "مصر" } });
    check("leaderboard words/country 200", words.status === 200, "status=" + words.status);
  }

  /* ---------- submit-score best-only semantics ---------- */
  {
    const evt = (score) => ({ httpMethod: "POST", body: JSON.stringify({ email: testEmail, nickname: "SmokeTester", country: "مصر", flag: "🇪🇬", game: "fish", score }) });
    const r1 = await call(submitScore, evt(100));
    check("submit first score saved", r1.status === 200 && r1.body.saved === true, JSON.stringify(r1.body));
    const r2 = await call(submitScore, evt(150));
    check("submit higher score saved", r2.status === 200 && r2.body.saved === true && r2.body.best === 150, JSON.stringify(r2.body));
    const r3 = await call(submitScore, evt(120));
    check("submit lower score NOT saved", r3.status === 200 && r3.body.saved === false && r3.body.best === 150, JSON.stringify(r3.body));
    const r4 = await call(submitScore, { httpMethod: "POST", body: JSON.stringify({ email: testEmail, nickname: "X", game: "fish", score: 5 }) });
    check("submit missing email 400", r4.status === 400, "status=" + r4.status);
    const r5 = await call(submitScore, { httpMethod: "POST", body: JSON.stringify({ email: testEmail, nickname: "X", game: "not-a-game", score: 5 }) });
    check("submit unknown game 400", r5.status === 400, "status=" + r5.status);
  }

  /* ---------- translation request round-trip ---------- */
  {
    const post = await call(request, { httpMethod: "POST", body: JSON.stringify({ game: "smoke test game", contact: testEmail, desc: "smoke test request" }) });
    check("request POST ok", post.status === 200 && post.body.ok === true, JSON.stringify(post.body));
    const get = await call(request, { httpMethod: "GET" });
    const found = Array.isArray(get.body) && get.body.some((r) => r.contact === testEmail);
    check("request GET finds test row", get.status === 200 && found, "rows=" + (Array.isArray(get.body) ? get.body.length : 0));
  }

  /* ---------- admin auth + validation ---------- */
  {
    const bad = await call(admin, { httpMethod: "PUT", headers: { "X-Admin-Key": "definitely-wrong" }, body: JSON.stringify({ games: [] }) });
    check("admin wrong key 403", bad.status === 403, "status=" + bad.status);
    const noKey = await call(admin, { httpMethod: "PUT", headers: {}, body: JSON.stringify({ games: [] }) });
    check("admin no key 403", noKey.status === 403, "status=" + noKey.status);
  }
} finally {
  /* ---------- always remove the test rows ---------- */
  await cleanup.from("scores").delete().eq("email", testEmail);
  await cleanup.from("translation_requests").delete().eq("requester", testEmail);
  check("cleanup test rows", true);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : "\n" + failures + " CHECK(S) FAILED");
process.exit(failures === 0 ? 0 : 1);
