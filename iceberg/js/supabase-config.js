/*
 * supabase-config.js — connection details for cross-device cloud sync of the
 * Open Table Formats tool.
 *
 * These point at the SAME Supabase project the Blind75 study tool uses, but
 * this tool reads/writes its OWN table (otf_state) via its OWN functions
 * (otf_get / otf_put) — see iceberg/supabase/schema.sql. Run that file once in
 * the project's SQL Editor and sync is ready.
 *
 * Both values below are SAFE to commit / ship publicly:
 *   • The publishable ("anon public") key is designed to be exposed in
 *     front-end code.
 *   • Reading or writing any data still requires your private sync code, which
 *     lives only on your devices (localStorage) and is never stored here.
 *
 * If either value is blank, cloud sync stays OFF and the tool behaves exactly
 * as before (everything saved locally per device).
 */
window.TableViz = window.TableViz || {};
window.TableViz.SUPABASE = {
  url: "https://zkqbgjttjrljikeylchu.supabase.co",
  anonKey: "sb_publishable_5vWJiCbxESEkKqLtXK_UKA_e1Bw_okx" // publishable key — safe to ship
};
