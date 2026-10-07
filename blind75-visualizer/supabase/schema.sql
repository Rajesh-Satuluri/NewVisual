-- ============================================================================
-- schema.sql — Supabase backend for cross-device sync of the study tool's
-- notes + code edits + logic edits (Python Practice "code section" and the
-- "My Notes" box, plus the editable logic blocks).
--
-- HOW TO INSTALL
--   1. Create a free project at https://supabase.com.
--   2. Open the project -> SQL Editor -> New query.
--   3. Paste this whole file and click "Run".
--   4. Project Settings -> API: copy the "Project URL" and the "anon public"
--      key into blind75-visualizer/js/supabase-config.js.
--
-- SECURITY MODEL (no login — "shared sync code")
--   • Every device that shares the same secret sync code sees the same data.
--   • The code is NEVER stored in clear text. We key each row on the SHA-256
--     hash of the code, so the database only ever holds the hash.
--   • Row-Level Security is ON with NO policies, so the public "anon" key has
--     ZERO direct read/write access to the table. All access goes through the
--     two SECURITY DEFINER functions below, which require the caller to pass
--     the sync code. This makes it impossible to enumerate or read anyone
--     else's rows with the public key — you must know the code.
--   • Because of that, the anon key is safe to ship in the static site.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.study_state (
  code_hash   text primary key,
  notes       jsonb       not null default '{}'::jsonb,
  code_edits  jsonb       not null default '{}'::jsonb,
  logic_edits jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- RLS on, no policies => direct table access denied for anon/authenticated.
alter table public.study_state enable row level security;

-- ---------------------------------------------------------------------------
-- study_get(code): return the row for a sync code (empty if none yet).
-- ---------------------------------------------------------------------------
create or replace function public.study_get(p_code text)
returns table (notes jsonb, code_edits jsonb, logic_edits jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.notes, s.code_edits, s.logic_edits, s.updated_at
  from public.study_state s
  where s.code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- study_put(code, notes, code_edits, logic_edits): upsert the three buckets
-- for a sync code. Returns the new updated_at timestamp.
-- ---------------------------------------------------------------------------
create or replace function public.study_put(
  p_code        text,
  p_notes       jsonb,
  p_code_edits  jsonb,
  p_logic_edits jsonb
) returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  h  text        := encode(digest(p_code, 'sha256'), 'hex');
  ts timestamptz := now();
begin
  if p_code is null or length(p_code) < 8 then
    raise exception 'sync code must be at least 8 characters';
  end if;

  insert into public.study_state (code_hash, notes, code_edits, logic_edits, updated_at)
  values (
    h,
    coalesce(p_notes,       '{}'::jsonb),
    coalesce(p_code_edits,  '{}'::jsonb),
    coalesce(p_logic_edits, '{}'::jsonb),
    ts
  )
  on conflict (code_hash) do update
    set notes       = excluded.notes,
        code_edits  = excluded.code_edits,
        logic_edits = excluded.logic_edits,
        updated_at  = ts;

  return ts;
end;
$$;

-- Only expose the two functions to the public API roles; nothing else.
revoke all on function public.study_get(text)                    from public;
revoke all on function public.study_put(text, jsonb, jsonb, jsonb) from public;
grant execute on function public.study_get(text)                    to anon, authenticated;
grant execute on function public.study_put(text, jsonb, jsonb, jsonb) to anon, authenticated;
