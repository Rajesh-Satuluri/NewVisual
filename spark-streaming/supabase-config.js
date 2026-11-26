// ─────────────────────────────────────────────────────────────────────────
// Cloud-sync configuration (classic script — runs before the app module).
//
// Paste a Supabase project URL + publishable (anon) key here to turn on
// cross-device sync. Left BLANK ⇒ sync is completely OFF and the tool is
// 100% local-only. Set these up per-tool (own rows/schema) before enabling.
//
// Both values below are SAFE to commit / ship publicly:
//   • The "anon public" / publishable key is designed to live in front-end code.
//   • Reading or writing any data still requires the private sync code, which
//     lives only on the user's devices and is never stored here — the server
//     only ever sees its SHA-256 hash (see supabase/schema.sql: spark_get/put).
//
// This reuses the same Supabase project as the other tools in this monorepo;
// the Spark data lives in its own `spark_state` table (see supabase/schema.sql)
// so it never collides with kafka_state, study_state, or otf_state.
//
// One-time setup: run supabase/schema.sql once in the Supabase SQL Editor.
// Until the table + RPCs exist, the engine stays a safe no-op (sync shows an
// error status but the tool keeps working 100% locally).
// ─────────────────────────────────────────────────────────────────────────
window.Spark = window.Spark || {};
window.Spark.SUPABASE = {
  url: 'https://zkqbgjttjrljikeylchu.supabase.co',
  anonKey: 'sb_publishable_5vWJiCbxESEkKqLtXK_UKA_e1Bw_okx', // publishable key — safe to ship
};
