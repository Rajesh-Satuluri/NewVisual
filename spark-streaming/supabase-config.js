// ─────────────────────────────────────────────────────────────────────────
// Cloud-sync configuration (classic script — runs before the app module).
//
// Paste a Supabase project URL + publishable (anon) key here to turn on
// cross-device sync. Left BLANK ⇒ sync is completely OFF and the tool is
// 100% local-only. Set these up per-tool (own rows/schema) before enabling.
// ─────────────────────────────────────────────────────────────────────────
window.Spark = window.Spark || {};
window.Spark.SUPABASE = {
  url: '',
  anonKey: '',
};
