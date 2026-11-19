-- ============================================================================
-- schema.sql — Supabase backend for cross-device sync of the Cloud DE
-- Visualizer's state: learning progress/signals (viewed, quiz, ratings,
-- activities, interview self-rates) AND per-question interview Q&A edits.
--
-- All of it travels in a SINGLE jsonb bundle (the `state` column), so adding a
-- new bucket later never requires another schema change. The merge that decides
-- who-wins-per-bucket runs client-side in js/core/cloudsync.js.
--
-- This lives in its OWN table (`cde_state`) in the shared monorepo project, so
-- it never collides with the Blind75 (`study_state`) or Kafka (`kafka_state`)
-- tables. Its functions are `cde_get` / `cde_put` for the same reason.
--
-- HOW TO INSTALL
--   1. Open your Supabase project -> SQL Editor -> New query.
--   2. Paste this whole file and click "Run". It is idempotent and safe to
--      re-run.
--   3. Project Settings -> API: the "Project URL" and the publishable / "anon
--      public" key are already in cloud-de-visualizer/supabase-config.js (the
--      same project the other tools use) — nothing to copy unless you change
--      projects.
--
-- SECURITY MODEL (no login — "shared sync code")
--   • Every device that shares the same secret sync code sees the same data.
--   • The code is NEVER stored in clear text. Each row is keyed on the SHA-256
--     hash of the code, so the database only ever holds the hash.
--   • Row-Level Security is ON with NO policies, so the public key has ZERO
--     direct read/write access to the table. All access goes through the two
--     SECURITY DEFINER functions below, which require the caller to pass the
--     sync code. You cannot enumerate or read anyone else's row without it.
--   • Because of that, the public key is safe to ship in the static site.
-- ============================================================================

-- Supabase ships pgcrypto in the "extensions" schema (not public). Make sure
-- it's present there; the functions below add "extensions" to their
-- search_path so digest() resolves.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cde_state (
  code_hash   text primary key,
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- RLS on, no policies => direct table access denied for anon/authenticated.
alter table public.cde_state enable row level security;

-- ---------------------------------------------------------------------------
-- cde_get(code): return the full state bundle for a sync code (empty bundle if
-- none yet).
-- ---------------------------------------------------------------------------
create or replace function public.cde_get(p_code text)
returns table (state jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select s.state, s.updated_at
  from public.cde_state s
  where s.code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- cde_put(code, state): upsert the whole state bundle for a sync code.
-- Returns the new updated_at timestamp.
-- ---------------------------------------------------------------------------
create or replace function public.cde_put(
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

  insert into public.cde_state (code_hash, state, updated_at)
  values (h, coalesce(p_state, '{}'::jsonb), ts)
  on conflict (code_hash) do update
    set state      = excluded.state,
        updated_at = ts;

  return ts;
end;
$$;

-- Only expose the two functions to the public API roles; nothing else.
revoke all on function public.cde_get(text)        from public;
revoke all on function public.cde_put(text, jsonb) from public;
grant execute on function public.cde_get(text)        to anon, authenticated;
grant execute on function public.cde_put(text, jsonb) to anon, authenticated;
