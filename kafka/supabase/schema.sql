-- ============================================================================
-- schema.sql — Supabase backend for cross-device cloud sync of the KAFKA
-- learning platform's state.
--
-- Everything the tool remembers (module mastery, quiz best scores, the whole
-- unified progress bundle, spaced-repetition schedule, self-explanations,
-- Coding-Dojo pads, theme, and other preferences) travels in a SINGLE jsonb
-- bundle — the `state` column, one row per sync code. Adding a new bucket later
-- never needs another schema change; the who-wins-per-key merge runs entirely
-- client-side in kafka/components/cloudsync.js.
--
-- This lives in its OWN table (kafka_state) with its OWN functions
-- (kafka_get / kafka_put), so it can share a Supabase project with the other
-- tools in this monorepo (blind75's study_state, the table formats' otf_state)
-- without ever colliding. The same sync code can be reused across tools.
--
-- HOW TO INSTALL / UPGRADE
--   1. Create a free project at https://supabase.com (or open your existing one
--      — reusing the project the other tools already use is fine).
--   2. Open the project -> SQL Editor -> New query.
--   3. Paste this whole file and click "Run". It is idempotent and safe to
--      re-run.
--   4. Project Settings -> API: copy the "Project URL" and the publishable /
--      "anon public" key into kafka/supabase-config.js (if not already filled).
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

-- Supabase ships pgcrypto in the "extensions" schema (not public). Make sure
-- it's present there; the functions below add "extensions" to their
-- search_path so digest() resolves.
create extension if not exists pgcrypto with schema extensions;

-- Base table: one jsonb bundle per sync-code hash.
create table if not exists public.kafka_state (
  code_hash   text        primary key,
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- RLS on, no policies => direct table access denied for anon/authenticated.
alter table public.kafka_state enable row level security;

-- ---------------------------------------------------------------------------
-- kafka_get(code): return the full state bundle for a sync code (empty bundle
-- if none yet).
-- ---------------------------------------------------------------------------
create or replace function public.kafka_get(p_code text)
returns table (state jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select s.state, s.updated_at
  from public.kafka_state s
  where s.code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

-- ---------------------------------------------------------------------------
-- kafka_put(code, state): upsert the whole state bundle for a sync code.
-- Returns the new updated_at timestamp. Rejects codes shorter than 8 chars.
-- ---------------------------------------------------------------------------
create or replace function public.kafka_put(
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

  insert into public.kafka_state (code_hash, state, updated_at)
  values (h, coalesce(p_state, '{}'::jsonb), ts)
  on conflict (code_hash) do update
    set state      = excluded.state,
        updated_at = ts;

  return ts;
end;
$$;

-- Only expose the two functions to the public API roles; nothing else.
revoke all on function public.kafka_get(text)        from public;
revoke all on function public.kafka_put(text, jsonb) from public;
grant execute on function public.kafka_get(text)        to anon, authenticated;
grant execute on function public.kafka_put(text, jsonb) to anon, authenticated;
