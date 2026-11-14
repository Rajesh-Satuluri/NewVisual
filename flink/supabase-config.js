// ─────────────────────────────────────────────────────────────────────────
// Cloud-sync configuration (classic script — runs before the app module).
//
// Paste your Supabase project URL + publishable (anon) key here to turn on
// cross-device sync. Leave either BLANK and sync stays completely OFF — the
// tool works exactly as before, 100% local-only. The publishable key is safe
// to commit: it can do nothing without the private sync code (see
// supabase-schema.sql).
// ─────────────────────────────────────────────────────────────────────────
window.Flink = window.Flink || {};
window.Flink.SUPABASE = {
  url: 'https://zkqbgjttjrljikeylchu.supabase.co',
  anonKey: 'sb_publishable_5vWJiCbxESEkKqLtXK_UKA_e1Bw_okx',
};
