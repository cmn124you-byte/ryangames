/* ============================================================
 * Ryan Games / ريان ألعاب — public runtime configuration
 * ------------------------------------------------------------
 * The Supabase anon key is PUBLIC by design: Row Level Security
 * allows anonymous clients to only READ published content.
 * NEVER put the service_role key (or any secret) in this file.
 * ============================================================ */
(function () {
  window.RY_CONFIG = {
    // Your Supabase project (fill these in, or inject them at build time).
    // Example: SUPABASE_URL: "https://abcdefgh.supabase.co"
    SUPABASE_URL: "https://ytecufjqyezcbvpcokki.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_4dPspHL8PjOsIuvXIlCa4w_pTasnnGp",

    // Netlify Functions base path (admin writes, uploads, AI translation).
    API_BASE: "/api",

    // Public site URL (used for Open Graph / canonical links).
    SITE_URL: "https://cmn124you-byte.github.io/ryangames/",

    // How long (ms) to trust the local cache before re-fetching.
    CACHE_TTL: 60 * 60 * 1000, // 1 hour
  };
})();
