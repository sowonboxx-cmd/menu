-- Prospection commerciale (HQ → Prospection) : la base des restaurants à démarcher.
-- À coller une fois dans Supabase → SQL Editor → Run.
--
-- prospects         : une ligne par restaurant repéré.
-- prospect_sources  : où on trouve les restaurants (New Table, influenceurs, captures…).
--
-- Chaque ligne appartient au compte qui l'a créée (owner) : seul ce compte la voit et la modifie.
-- On se connecte sur la page avec son compte admin Beltab habituel.

create table if not exists public.prospects (
  id              uuid primary key default gen_random_uuid(),
  owner           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key             text not null,                       -- identifiant lisible, unique par compte (ex. « sobo »)
  name            text not null,
  google_name     text,                                -- nom exact sur Google Maps
  status          text not null default 'a_contacter', -- repere, a_contacter, contacte, relance, encours, signe, perdu
  priority        text,                                -- haute, moyenne, basse
  kind            text default 'restaurant',           -- restaurant, fast-food, café, pâtisserie, traiteur, chef à domicile…
  cuisine         text,                                -- japonais, méditerranéen, africain…
  country         text,                                -- pays de la cuisine
  specialty       text,                                -- udon, huîtres, burger…
  address         text,
  postcode        text,
  arrondissement  text,                                -- « 17e », « 1er », ou la ville hors Paris
  city            text,
  lat             double precision,
  lng             double precision,
  phone           text,
  maps_url        text,
  instagram       text,
  website         text,
  booking_tool    text,                                -- Zenchef, TheFork, aucun…
  source          text,                                -- New Table, influenceur, capture, Notion…
  opened_on       text,                                -- date ou mois d'ouverture
  opening_soon    boolean not null default false,      -- annoncé, pas encore ouvert
  defects         text[] not null default '{}',        -- ce qui manque, en clair
  audit           jsonb not null default '{}'::jsonb,  -- audit carte + logiciel (oui / non / ?)
  notes           text,
  next_action     text,
  next_action_on  date,
  contacted_on    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner, key)
);
create index if not exists prospects_owner_status on public.prospects (owner, status);
create index if not exists prospects_owner_arr on public.prospects (owner, arrondissement);

create table if not exists public.prospect_sources (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  kind        text,          -- site, instagram, influenceur, presse, capture
  url         text,
  how         text,          -- quoi y chercher
  checked_on  date,          -- dernière visite
  created_at  timestamptz not null default now()
);

alter table public.prospects        enable row level security;
alter table public.prospect_sources enable row level security;

drop policy if exists prospects_owner on public.prospects;
create policy prospects_owner on public.prospects for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists prospect_sources_owner on public.prospect_sources;
create policy prospect_sources_owner on public.prospect_sources for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());

grant select, insert, update, delete on public.prospects, public.prospect_sources to authenticated;

-- updated_at à jour automatiquement
create or replace function public.prospects_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists prospects_touch on public.prospects;
create trigger prospects_touch before update on public.prospects for each row execute function public.prospects_touch();
