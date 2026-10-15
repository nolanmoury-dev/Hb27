-- À coller dans Supabase > SQL Editor > Run
create table if not exists players(
  id uuid primary key default gen_random_uuid(),
  pseudo text not null, pseudo_lc text not null unique,
  pass_hash text not null, salt text not null,
  role text not null default 'player',          -- 'player' ou 'admin'
  banned_until timestamptz, fails int not null default 0, locked_until timestamptz,
  points int not null default 0, played int not null default 0,
  created_at timestamptz not null default now());
alter table players enable row level security;   -- aucune policy = personne ne lit depuis le navigateur, seul le serveur (clé service) accède
