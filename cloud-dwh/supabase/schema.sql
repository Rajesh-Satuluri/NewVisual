-- ============================================================================
-- schema.sql — Supabase backend for cross-device cloud sync of the
-- Cloud Data Warehouses tool (Snowflake / Redshift / Fabric / Fundamentals).
--
-- This tool's entire saved state is a flat set of localStorage keys under the
-- `cdwh-` prefix — theme, platform, visited modules, progress records, quiz
-- best scores, code-block edits and a few UI preferences. It all travels in a
-- SINGLE jsonb bundle (the `state` column: one get, one put). The per-key merge
-- that decides who-wins runs client-side in js/features/cloudsync.js.
--
-- It lives in the SAME Supabase project as the other NewVisual tools (Blind75,
-- Open Table Formats, Kafka) but in its OWN table and functions
-- (cdwh_state / cdwh_get / cdwh_put), so the tools never collide. You can even
-- reuse the same sync code across tools — each reads/writes only its own table.
--
-- HOW TO INSTALL
--   1. Open your existing Supabase project.
--   2. SQL Editor -> New query -> paste this whole file -> Run.
--      It is idempotent and safe to re-run.
--   3. The Project URL and publishable ("anon public") key are already filled
--      in js/supabase-config.js (same project as the other tools).
--
-- SECURITY MODEL (no login — "shared sync code")
--   • Every device that shares the same secret sync code sees the same data.
--   • The code is NEVER stored in clear text. Each row is keyed on the SHA-256
--     hash of the code, so the database only ever holds the hash.
--   • Row-Level Security is ON with NO policies, so the public key has ZERO
--     direct read/write access to the table. All access goes through the two
--     SECURITY DEFINER functions below, which require the caller to pass the
--     sync code. You cannot enumerate or read anyone else's row without it.
--   • Because of that, the publishable key is safe to ship in the static site.
-- ============================================================================

-- pgcrypto (for digest()) lives in the "extensions" schema on Supabase.
create extension if not exists pgcrypto with schema extensions;

-- One row per sync code (by its hash). The whole state bundle rides in `state`.
create table if not exists public.cdwh_state (
  code_hash  text primary key,
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS on, no policies => direct table access denied for anon/authenticated.
alter table public.cdwh_state enable row level security;

-- ---------------------------------------------------------------------------
-- cdwh_get(code): return the state bundle for a sync code (empty if none yet).
-- ---------------------------------------------------------------------------
create or replace function public.cdwh_get(p_code text)
returns table (state jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select s.state, s.updated_at
  from public.cdwh_state s
  where s.code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- cdwh_put(code, state): upsert the whole state bundle. Returns updated_at.
-- ---------------------------------------------------------------------------
create or replace function public.cdwh_put(
  p_code  text,
  p_state jsonb
) returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h  text        := encode(digest(p_code, 'sha256'), 'hex');
  ts timestamptz := now();
begin
  if p_code is null or length(p_code) < 8 then
    raise exception 'sync code must be at least 8 characters';
  end if;

  insert into public.cdwh_state (code_hash, state, updated_at)
  values (h, coalesce(p_state, '{}'::jsonb), ts)
  on conflict (code_hash) do update
    set state      = excluded.state,
        updated_at = ts;

  return ts;
end;
$$;

-- Only expose the two functions to the public API roles; nothing else.
revoke all on function public.cdwh_get(text)        from public;
revoke all on function public.cdwh_put(text, jsonb) from public;
grant execute on function public.cdwh_get(text)        to anon, authenticated;
grant execute on function public.cdwh_put(text, jsonb) to anon, authenticated;
