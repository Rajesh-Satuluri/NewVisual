-- ============================================================================
-- schema.sql — Supabase backend for FULL-COVERAGE cross-device sync of the
-- study tool's state: progress status, Python topic status, spaced-repetition
-- schedule, review flags, daily activity/streak, challenge flags, viz links,
-- notes, code edits, logic edits, and a safe subset of preferences.
--
-- All of that now travels in a SINGLE jsonb bundle (the `state` column), so
-- adding a new bucket later never requires another schema change. The merge
-- that decides who-wins-per-bucket runs client-side in js/modules/cloudsync.js.
--
-- HOW TO INSTALL / UPGRADE
--   1. Create a free project at https://supabase.com (or open your existing one).
--   2. Open the project -> SQL Editor -> New query.
--   3. Paste this whole file and click "Run". It is idempotent and safe to
--      re-run; running it on an older install backfills existing rows into the
--      new `state` column, so previously-synced notes/code are preserved.
--   4. Project Settings -> API: copy the "Project URL" and the publishable /
--      "anon public" key into blind75-visualizer/js/supabase-config.js.
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

-- Base table. Legacy installs already have notes/code_edits/logic_edits
-- columns; we keep them (harmless) and add the unified `state` bundle.
create table if not exists public.study_state (
  code_hash   text primary key,
  notes       jsonb       not null default '{}'::jsonb,
  code_edits  jsonb       not null default '{}'::jsonb,
  logic_edits jsonb       not null default '{}'::jsonb,
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Add `state` to pre-existing installs that don't have it yet.
alter table public.study_state
  add column if not exists state jsonb not null default '{}'::jsonb;

-- Backfill: fold any legacy per-column data into the new bundle, but only for
-- rows that haven't been written in the new format yet (state still empty).
update public.study_state
   set state = jsonb_build_object(
         'notes',      coalesce(notes,       '{}'::jsonb),
         'codeEdits',  coalesce(code_edits,  '{}'::jsonb),
         'logicEdits', coalesce(logic_edits, '{}'::jsonb)
       )
 where state = '{}'::jsonb
   and (notes <> '{}'::jsonb or code_edits <> '{}'::jsonb or logic_edits <> '{}'::jsonb);

-- RLS on, no policies => direct table access denied for anon/authenticated.
alter table public.study_state enable row level security;

-- Retire the old 3-bucket function signatures so the new ones below are the
-- only study_get/study_put overloads the API exposes.
drop function if exists public.study_get(text);
drop function if exists public.study_put(text, jsonb, jsonb, jsonb);

-- ---------------------------------------------------------------------------
-- study_get(code): return the full state bundle for a sync code (empty bundle
-- if none yet). Falls back to the legacy columns for rows not yet migrated.
-- ---------------------------------------------------------------------------
create or replace function public.study_get(p_code text)
returns table (state jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select
    case
      when s.state <> '{}'::jsonb then s.state
      else jsonb_build_object(
             'notes',      coalesce(s.notes,       '{}'::jsonb),
             'codeEdits',  coalesce(s.code_edits,  '{}'::jsonb),
             'logicEdits', coalesce(s.logic_edits, '{}'::jsonb)
           )
    end as state,
    s.updated_at
  from public.study_state s
  where s.code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- study_put(code, state): upsert the whole state bundle for a sync code.
-- Returns the new updated_at timestamp.
-- ---------------------------------------------------------------------------
create or replace function public.study_put(
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

  insert into public.study_state (code_hash, state, updated_at)
  values (h, coalesce(p_state, '{}'::jsonb), ts)
  on conflict (code_hash) do update
    set state      = excluded.state,
        updated_at = ts;

  return ts;
end;
$$;

-- Only expose the two functions to the public API roles; nothing else.
revoke all on function public.study_get(text)        from public;
revoke all on function public.study_put(text, jsonb) from public;
grant execute on function public.study_get(text)        to anon, authenticated;
grant execute on function public.study_put(text, jsonb) to anon, authenticated;
