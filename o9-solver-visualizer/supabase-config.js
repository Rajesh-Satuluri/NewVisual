/*
 * supabase-config.js — connection details for cross-device cloud sync.
 *
 * Fill these two values in from your Supabase project
 * (Project Settings -> API), then run supabase/schema.sql once in the
 * Supabase SQL Editor. Until BOTH are filled, cloud sync stays OFF and the
 * app behaves exactly as before (everything saved locally, per device).
 *
 * Both values are SAFE to commit / ship publicly:
 *   • The "anon public" / publishable key is designed to be exposed in
 *     front-end code.
 *   • Reading or writing any data still requires your private sync code,
 *     which lives only on your devices and is never stored here (the server
 *     only ever sees its SHA-256 hash).
 *
 * This reuses the same Supabase project as the other tools in this monorepo;
 * the Kafka data lives in its own `kafka_state` table (see supabase/schema.sql)
 * so it never collides with them.
 */
export const SUPABASE = {
  url: 'https://zkqbgjttjrljikeylchu.supabase.co',
  anonKey: 'sb_publishable_5vWJiCbxESEkKqLtXK_UKA_e1Bw_okx' // publishable key — safe to ship
};
