const { getStore } = require("@netlify/blobs");

const STORE = "ry-requests";
const KEY = "requests";

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
    const store = getStoreSafe();
    const list = await store.get(KEY, { type: "json" });
    return { statusCode: 200, headers, body: JSON.stringify(Array.isArray(list) ? list : []) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "server_error", message: String((err && err.message) || err) }) };
  }
};
