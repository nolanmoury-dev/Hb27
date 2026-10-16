-- Étape 3 : salles de matchmaking en ligne (à coller dans Supabase > SQL Editor > Run, sans risque si relancé)
create table if not exists rooms(
  id uuid primary key default gen_random_uuid(),
  host uuid not null, host_team uuid not null,
  guest uuid, guest_team uuid,
  status text not null default 'wait',
  offer text, answer text,
  ice_h jsonb not null default '[]', ice_g jsonb not null default '[]',
  ping timestamptz not null default now(),
  created_at timestamptz not null default now());
alter table rooms enable row level security;
