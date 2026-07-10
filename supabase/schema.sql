-- ============================================================
-- DYA'AKARA — online schema
-- Run this ONCE in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- It creates the three tables the game's online layer uses
-- (friend codes / requests / friendships) with open row-level-
-- security policies suitable for a friendly private deployment.
--
-- NOTE: the policies below let anyone holding your anon key
-- read and write these tables. That is fine for a game shared
-- among friends; do not store anything sensitive here.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- players (one row per player identity) ----------
create table if not exists public.dya_players (
  id          uuid primary key,
  friend_code text not null unique,
  name        text not null default 'Player',
  level       int  not null default 0,
  avatar_idx  int  not null default 0,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ---------- friend requests ----------
create table if not exists public.dya_friend_requests (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references public.dya_players(id) on delete cascade,
  from_name  text not null default '',
  from_code  text not null default '',
  to_id      uuid not null references public.dya_players(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

-- ---------- friendships (one row per pair, a_id < b_id) ----------
create table if not exists public.dya_friends (
  a_id       uuid not null references public.dya_players(id) on delete cascade,
  b_id       uuid not null references public.dya_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);

-- ---------- row level security (open policies) ----------
alter table public.dya_players         enable row level security;
alter table public.dya_friend_requests enable row level security;
alter table public.dya_friends         enable row level security;

drop policy if exists "dya players open"  on public.dya_players;
drop policy if exists "dya requests open" on public.dya_friend_requests;
drop policy if exists "dya friends open"  on public.dya_friends;

create policy "dya players open"  on public.dya_players         for all using (true) with check (true);
create policy "dya requests open" on public.dya_friend_requests for all using (true) with check (true);
create policy "dya friends open"  on public.dya_friends         for all using (true) with check (true);

-- helpful indexes for the polling queries
create index if not exists dya_requests_to   on public.dya_friend_requests (to_id, status);
create index if not exists dya_requests_from on public.dya_friend_requests (from_id, status);
create index if not exists dya_friends_a     on public.dya_friends (a_id);
create index if not exists dya_friends_b     on public.dya_friends (b_id);
