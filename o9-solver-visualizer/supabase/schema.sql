-- ============================================================
-- supabase/schema.sql — optional cloud-sync backend schema
-- Run this in a Supabase project only if you choose to enable sync
-- (fill supabase-config.js afterwards). The tool is fully functional
-- local-only without any of this.
--
-- One row per sync code holds the merged o9scs_* progress blob. Access
-- is by the hashed sync code (anon key + row-level security); no PII.
-- STATUS: SCAFFOLD — table shape documented; policies finalised in the
-- cloud-sync iteration (REVAMP-BLUEPRINT.md §9, Iter 10).
-- ============================================================

create table if not exists o9scs_progress (
  sync_code   text primary key,        -- hashed sync code (not reversible)
  payload     jsonb not null default '{}'::jsonb,  -- merged o9scs_* keys
  updated_at  timestamptz not null default now()
);

-- TODO(iter-10): enable row-level security + per-sync-code access policy,
-- and a merge-on-write function mirroring components/cloudsync.js rules.
