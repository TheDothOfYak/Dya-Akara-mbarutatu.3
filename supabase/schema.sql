-- ============================================================
-- DYA'AKARA — online schema
-- Run this in your Supabase project (safe to RE-RUN — every
-- statement is idempotent, so existing deployments just gain
-- the new tables):
--   Dashboard → SQL Editor → New query → paste → Run
--
-- It creates the tables the game's online layer uses:
--   • friends       (dya_players / dya_friend_requests / dya_friends)
--   • shared market (dya_listings) — unique tokens, atomic buys
--   • admin config  (dya_config)   — the Admin Panel's live game
--                                    edits, pushed to every player
--   • accounts      (dya_accounts / dya_bans) — a player's whole
--                                    save (collection, gold, level,
--                                    friends, settings…) travels with
--                                    their email+password to ANY
--                                    device; bans enforce everywhere
-- with open row-level-security policies suitable for a friendly
-- private deployment.
--
-- ⚠ NOTE ON SECURITY: the policies below let ANYONE holding your
-- site's anon key (which is public — it ships in the deployed
-- site's source) read or write these tables directly via Supabase's
-- REST API, bypassing the game entirely. That includes dya_accounts:
-- a determined visitor could read or edit another player's gold,
-- token collection, or password hash by calling the API directly.
-- This matches the trust model of every other table in this file
-- (fine for a game played among friends) — it is NOT the same as
-- real per-account security. If that matters for your deployment,
-- the fix is switching to real Supabase Auth with a row-level policy
-- scoped to `auth.uid()`, which is a bigger change than this file.
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

-- ---------- shared market listings (one row = one unique token) ----------
-- The full token travels inside the row. Buying is a CONDITIONAL
-- update (…where status='active') — the database guarantees exactly
-- one buyer ever wins a token. No duplicates.
--
-- seller_net_id / buyer_net_id are TEXT, not uuid: the 100 Dya'kukull
-- AI and Elbergi trade here too now, using stable ids like 'ai_47' —
-- they are not real players, but nothing about a listing or a sale
-- tells the difference. A real player's net_id is still a uuid, just
-- stored as text.
create table if not exists public.dya_listings (
  id            uuid primary key default gen_random_uuid(),
  token_id      text not null,
  seller_net_id text not null,
  seller_name   text not null default '',
  price         int  not null check (price > 0),
  status        text not null default 'active' check (status in ('active','sold','cancelled')),
  mode          text not null default 'sale' check (mode in ('sale','offer','display')),
  want          jsonb,                            -- optional multi-currency ask: {ngakara, okidQty, okidRarity}
  token         jsonb not null,
  buyer_net_id  text,
  buyer_name    text,
  sold_at       timestamptz,
  claimed       boolean not null default false,  -- seller's device has settled the outcome
  created_at    timestamptz not null default now()
);

-- widen pre-existing installs (safe to re-run: no-op once already text)
alter table public.dya_listings alter column seller_net_id type text using seller_net_id::text;
alter table public.dya_listings alter column buyer_net_id  type text using buyer_net_id::text;
alter table public.dya_listings add column if not exists mode text not null default 'sale';
alter table public.dya_listings add column if not exists want jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'dya_listings_mode_check') then
    alter table public.dya_listings add constraint dya_listings_mode_check check (mode in ('sale','offer','display'));
  end if;
end $$;

-- a token can only be on the market once at a time
create unique index if not exists dya_listings_unique_active
  on public.dya_listings (token_id) where status = 'active';

-- ---------- shared offers (haggling over a shared listing) ----------
-- A buyer and seller go back and forth in `history` (append-only log,
-- same shape as the local offer system). `version` makes every write
-- a conditional update (…where version=eq.N) — if two devices (say,
-- every player's browser independently deciding it's time for the
-- SAME AI seller to answer the SAME offer) race to write the next
-- step, only the first lands; the second affects zero rows and is a
-- harmless no-op, because the response is DETERMINISTIC (seeded from
-- the offer's own id + history length) — every device computes the
-- identical reply anyway.
--
-- Gold-only for now: bundle trade-ins (NgAkara/Okid/tokens) need the
-- buyer's own device to move those out of local storage, so they stay
-- a local-market-only feature until there's a reason to build that.
create table if not exists public.dya_offers (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.dya_listings(id) on delete cascade,
  token_id       text not null,
  token          jsonb not null,          -- snapshot at offer time, for the buyer to claim later
  list_price     int  not null,           -- listing price snapshot (AI reserve baseline)
  buyer_net_id   text not null,
  buyer_name     text not null default '',
  seller_net_id  text not null,
  seller_name    text not null default '',
  state          text not null default 'pending' check (state in ('pending','countered','accepted','ended','expired')),
  history        jsonb not null default '[]'::jsonb,
  respond_at     timestamptz,             -- when an AI side owes the next reply
  claimed        boolean not null default false,  -- buyer's device has taken the token + paid
  version        int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- accounts (a player's whole save, portable to any device) ----------
-- `data` holds the ENTIRE local account object (tokens, gold, level,
-- pouches, friends, notifications, settings, achievements, stats…) —
-- everything G.me carries locally. Login fetches this by email and
-- installs it into the local world, so every existing synchronous
-- game system keeps working unchanged.
create table if not exists public.dya_accounts (
  id         text primary key,
  email      text not null unique,
  pass_hash  text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- bans (public record, enforced on every device) ----------
create table if not exists public.dya_bans (
  account_id text primary key,
  reason     text not null,
  permanent  boolean not null default false,
  until      timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- admin config (Admin Panel live game edits) ----------
-- One row (key='mods') holds the creator's overrides: creature stats,
-- behaviors, sprites, text, balance, AI tuning. Every game client
-- polls it and applies the newest revision.
create table if not exists public.dya_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- row level security (open policies) ----------
alter table public.dya_players         enable row level security;
alter table public.dya_friend_requests enable row level security;
alter table public.dya_friends         enable row level security;
alter table public.dya_listings        enable row level security;
alter table public.dya_config          enable row level security;
alter table public.dya_accounts        enable row level security;
alter table public.dya_bans            enable row level security;
alter table public.dya_offers          enable row level security;

drop policy if exists "dya players open"  on public.dya_players;
drop policy if exists "dya requests open" on public.dya_friend_requests;
drop policy if exists "dya friends open"  on public.dya_friends;
drop policy if exists "dya listings open" on public.dya_listings;
drop policy if exists "dya config open"   on public.dya_config;
drop policy if exists "dya accounts open" on public.dya_accounts;
drop policy if exists "dya bans open"     on public.dya_bans;
drop policy if exists "dya offers open"   on public.dya_offers;

create policy "dya players open"  on public.dya_players         for all using (true) with check (true);
create policy "dya requests open" on public.dya_friend_requests for all using (true) with check (true);
create policy "dya friends open"  on public.dya_friends         for all using (true) with check (true);
create policy "dya listings open" on public.dya_listings        for all using (true) with check (true);
create policy "dya config open"   on public.dya_config          for all using (true) with check (true);
create policy "dya accounts open" on public.dya_accounts        for all using (true) with check (true);
create policy "dya bans open"     on public.dya_bans            for all using (true) with check (true);
create policy "dya offers open"   on public.dya_offers          for all using (true) with check (true);

-- helpful indexes for the polling queries
create index if not exists dya_requests_to   on public.dya_friend_requests (to_id, status);
create index if not exists dya_requests_from on public.dya_friend_requests (from_id, status);
create index if not exists dya_friends_a     on public.dya_friends (a_id);
create index if not exists dya_friends_b     on public.dya_friends (b_id);
create index if not exists dya_listings_active on public.dya_listings (status, created_at desc);
create index if not exists dya_listings_seller on public.dya_listings (seller_net_id, status, claimed);
create index if not exists dya_accounts_email  on public.dya_accounts (email);
create index if not exists dya_offers_buyer  on public.dya_offers (buyer_net_id, state);
create index if not exists dya_offers_seller on public.dya_offers (seller_net_id, state);
create index if not exists dya_offers_due    on public.dya_offers (respond_at) where state in ('pending','countered') and respond_at is not null;
create index if not exists dya_offers_claim  on public.dya_offers (buyer_net_id, claimed) where state = 'accepted';
