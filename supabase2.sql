-- Étape 2 : équipes + matchs (à coller dans Supabase > SQL Editor > Run, sans risque si relancé)
create table if not exists teams(
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references players(id) on delete cascade,
  name text not null, name_lc text not null unique,
  c1 text not null default '#1e7bff', c2 text not null default '#f2f5fa',
  crest text, roster jsonb not null default '[]',
  pts int not null default 0, played int not null default 0, w int not null default 0, d int not null default 0, l int not null default 0,
  gf int not null default 0, ga int not null default 0, form text not null default '',
  created_at timestamptz not null default now());
create table if not exists matches(
  id uuid primary key default gen_random_uuid(),
  home uuid references teams(id) on delete set null, away uuid references teams(id) on delete set null,
  hs int not null, as_ int not null, by uuid, created_at timestamptz not null default now());
alter table teams enable row level security;
alter table matches enable row level security;
