-- ─────────────────────────────────────────────────────────────────────────
-- Flink Visualizer — cross-device cloud sync backend (Supabase / Postgres)
--
-- Mirrors the Open-Table-Formats / Blind75 sync design, but with its OWN table
-- and functions so the tools never collide. You MAY reuse the same Supabase
-- project (and even the same sync code) across tools — each writes its own row
-- in its own table.
--
-- Security model: the browser only ever holds the publishable (anon) key. That
-- key has ZERO direct access to the table (RLS on, no policies). All reads and
-- writes go through two SECURITY DEFINER functions that REQUIRE the caller to
-- pass the private sync code. The code itself is never stored — only its
-- SHA-256 hash is — so the server can never reveal it, and the publishable key
-- is safe to ship in the static site.
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.flink_state (
  code_hash  text primary key,                       -- SHA-256 hex of the sync code
  state      jsonb not null default '{}'::jsonb,      -- whole synced bundle, one row per code
  updated_at timestamptz not null default now()
);

-- Lock the table down: anon/authenticated get nothing directly.
alter table public.flink_state enable row level security;
revoke all on table public.flink_state from anon, authenticated;

-- ── Read: returns the stored bundle for a given code ────────────────────────
create or replace function public.flink_get(p_code text)
returns table (state jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select s.state, s.updated_at
  from public.flink_state s
  where s.code_hash = encode(digest(p_code, 'sha256'), 'hex');
$$;

-- ── Write: upsert the bundle for a given code (rejects weak codes) ───────────
create or replace function public.flink_put(p_code text, p_state jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_ts   timestamptz;
begin
  if p_code is null or length(p_code) < 8 then
    raise exception 'sync code must be at least 8 characters';
  end if;
  v_hash := encode(digest(p_code, 'sha256'), 'hex');
  insert into public.flink_state (code_hash, state, updated_at)
    values (v_hash, coalesce(p_state, '{}'::jsonb), now())
  on conflict (code_hash)
    do update set state = excluded.state, updated_at = now()
  returning updated_at into v_ts;
  return v_ts;
end;
$$;

-- Only these two entry points are callable by the browser.
revoke all on function public.flink_get(text)          from public;
revoke all on function public.flink_put(text, jsonb)   from public;
grant execute on function public.flink_get(text)        to anon, authenticated;
grant execute on function public.flink_put(text, jsonb) to anon, authenticated;
