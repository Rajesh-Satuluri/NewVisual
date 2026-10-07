/*
 * supabase-config.js — connection details for cross-device cloud sync.
 *
 * Fill these two values in from your Supabase project
 * (Project Settings -> API), then run supabase/schema.sql once in the
 * Supabase SQL Editor. Until BOTH are filled, cloud sync stays OFF and the
 * app behaves exactly as before (everything saved locally per device).
 *
 * Both values are SAFE to commit / ship publicly:
 *   • The "anon public" key is designed to be exposed in front-end code.
 *   • Reading or writing any data still requires your private sync code,
 *     which lives only on your devices and is never stored here.
 */
window.BLIND75 = window.BLIND75 || {};
window.BLIND75.SUPABASE = {
  url: "",      // e.g. "https://abcdefghijklmno.supabase.co"
  anonKey: ""   // the "anon public" API key
};
