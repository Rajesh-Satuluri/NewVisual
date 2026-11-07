/* ============================================================
   supabase-config.js — OPTIONAL cloud-sync configuration
   The tool is LOCAL-FIRST and fully functional with this left blank.
   Leaving url/anonKey empty keeps cloud sync INERT (AV.CloudSync is a
   no-op; the sync UI renders nothing).

   To enable sync later: create a Supabase project, run supabase/schema.sql,
   and fill in the two values below. Only the public anon key belongs here —
   never a service-role key.
   ============================================================ */
(function () {
  "use strict";
  window.O9SCS_SUPABASE = {
    url: "",      // e.g. "https://xxxx.supabase.co"
    anonKey: ""   // public anon key only
  };
})();
