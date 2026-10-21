-- ════════════════════════════════════════════════════════════════
-- Jeu « Free Oyster · Ouvre ton huître » — à coller UNE FOIS dans Supabase → SQL Editor → Run.
-- Purement additif : crée 3 tables et 1 fonction, ne touche à rien d'existant.
--
-- Règles du jeu (modifiables par restaurant dans jeu_config) :
--   · une seule partie par personne (même email OU même téléphone = même personne) ;
--   · une partie de plus, une seule fois, quand un ami joue avec son lien de parrainage ;
--   · chances : huître offerte 1 sur 10, plateau de 6 huîtres 1 sur 50, T-shirt 1 sur 100 ;
--   · code gagnant PERLE-XXXX valable 7 jours, validé par l'équipe dans l'espace restaurateur.
-- Le tirage se fait ici, côté serveur : impossible de tricher depuis le téléphone.
-- Le site n'a aucun accès direct à ces tables : tout passe par resa.beltab.app (clé serveur).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.jeu_config (
  client_slug  text primary key,
  active       boolean not null default true,
  p_huitre     numeric not null default 0.10,   -- 1 sur 10
  p_plateau    numeric not null default 0.02,   -- 1 sur 50
  p_tshirt     numeric not null default 0.01,   -- 1 sur 100
  max_huitre   int,                              -- stock maximum de lots (vide = sans limite)
  max_plateau  int,
  max_tshirt   int,
  valid_days   int not null default 7,           -- validité du code gagnant
  ends_at      timestamptz,                      -- fin du jeu (vide = pas de date de fin)
  updated_at   timestamptz not null default now()
);
insert into public.jeu_config (client_slug) values ('drevici-test'), ('drevici-paris') on conflict do nothing;

create table if not exists public.jeu_players (
  id             bigserial primary key,
  client_slug    text not null,
  email          text not null,
  phone          text not null,
  first_name     text,
  last_name      text,
  token          text not null unique,          -- secret gardé sur le téléphone du joueur (rejouer sans ressaisir)
  ref_code       text not null,                  -- public : son lien de parrainage (?ami=XXXXXX)
  referred_by    bigint references public.jeu_players(id),
  plays_allowed  smallint not null default 1,
  plays_used     smallint not null default 0,
  ref_bonus_at   timestamptz,                    -- date où il a gagné sa partie bonus (une seule fois)
  optin          boolean not null default false, -- offres par email / SMS (case jamais pré-cochée)
  src            text,                           -- poster / canal (ex. POSTER-BIOT-1)
  created_at     timestamptz not null default now()
);
create unique index if not exists jeu_players_email on public.jeu_players (client_slug, email);
create unique index if not exists jeu_players_phone on public.jeu_players (client_slug, phone);
create unique index if not exists jeu_players_ref   on public.jeu_players (client_slug, ref_code);

create table if not exists public.jeu_plays (
  id           bigserial primary key,
  client_slug  text not null,
  player_id    bigint not null references public.jeu_players(id),
  n            smallint not null default 1,      -- 1re partie, ou 2e (bonus parrainage)
  result       text not null check (result in ('perdu','huitre','plateau','tshirt')),
  code         text unique,                      -- PERLE-XXXX si gagné
  expires_at   timestamptz,
  redeemed_at  timestamptz,
  redeemed_by  text,
  src          text,
  created_at   timestamptz not null default now()
);
create index if not exists jeu_plays_slug on public.jeu_plays (client_slug, created_at desc);

-- ── Tirage : verrouille le joueur, vérifie qu'il lui reste une partie, tire le lot, crée le code,
--    et donne sa partie bonus au parrain (une seule fois) quand un filleul joue pour la 1re fois.
create or replace function public.jeu_play(p_player bigint, p_src text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pl  public.jeu_players%rowtype;
  cfg public.jeu_config%rowtype;
  r   numeric := random();
  res text := 'perdu';
  c   text := null;
  exp timestamptz := null;
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  won int;
begin
  select * into pl from public.jeu_players where id = p_player for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'joueur inconnu'); end if;
  if pl.plays_used >= pl.plays_allowed then
    return jsonb_build_object('ok', false, 'done', true, 'ref_code', pl.ref_code, 'bonus_used', pl.ref_bonus_at is not null);
  end if;
  select * into cfg from public.jeu_config where client_slug = pl.client_slug;
  if not found or not cfg.active or (cfg.ends_at is not null and cfg.ends_at < now()) then
    return jsonb_build_object('ok', false, 'closed', true);
  end if;

  if r < cfg.p_tshirt then res := 'tshirt';
  elsif r < cfg.p_tshirt + cfg.p_plateau then res := 'plateau';
  elsif r < cfg.p_tshirt + cfg.p_plateau + cfg.p_huitre then res := 'huitre';
  end if;
  -- stock épuisé → ce lot devient « perdu »
  if res <> 'perdu' then
    select count(*) into won from public.jeu_plays where client_slug = pl.client_slug and result = res;
    if (res = 'tshirt'  and cfg.max_tshirt  is not null and won >= cfg.max_tshirt)
    or (res = 'plateau' and cfg.max_plateau is not null and won >= cfg.max_plateau)
    or (res = 'huitre'  and cfg.max_huitre  is not null and won >= cfg.max_huitre) then res := 'perdu'; end if;
  end if;

  if res <> 'perdu' then
    exp := now() + make_interval(days => cfg.valid_days);
    loop
      c := 'PERLE-' || (select string_agg(substr(chars, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 4));
      exit when not exists (select 1 from public.jeu_plays where code = c);
    end loop;
  end if;

  update public.jeu_players set plays_used = plays_used + 1 where id = pl.id;
  insert into public.jeu_plays (client_slug, player_id, n, result, code, expires_at, src)
    values (pl.client_slug, pl.id, pl.plays_used + 1, res, c, exp, coalesce(p_src, pl.src));

  -- Parrainage : 1re partie d'un filleul → le parrain gagne UNE partie de plus, une seule fois dans tout le jeu.
  if pl.plays_used = 0 and pl.referred_by is not null then
    update public.jeu_players set plays_allowed = plays_allowed + 1, ref_bonus_at = now()
      where id = pl.referred_by and ref_bonus_at is null;
  end if;

  return jsonb_build_object('ok', true, 'result', res, 'code', c, 'expires_at', exp,
    'plays_left', pl.plays_allowed - pl.plays_used - 1, 'ref_code', pl.ref_code, 'bonus_used', pl.ref_bonus_at is not null);
end $$;
revoke all on function public.jeu_play(bigint, text) from public, anon, authenticated;
grant execute on function public.jeu_play(bigint, text) to service_role;

-- ── Accès : aucun pour le public. Les admins du restaurant peuvent lire (statistiques) et régler leur jeu.
alter table public.jeu_config  enable row level security;
alter table public.jeu_players enable row level security;
alter table public.jeu_plays   enable row level security;
do $$
declare t text;
begin
  foreach t in array array['jeu_config','jeu_players','jeu_plays'] loop
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for select to authenticated
      using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))', t);
  end loop;
end $$;
drop policy if exists jeu_config_admin_upd on public.jeu_config;
create policy jeu_config_admin_upd on public.jeu_config for update to authenticated
  using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = jeu_config.client_slug))
  with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = jeu_config.client_slug));
grant select on public.jeu_config, public.jeu_players, public.jeu_plays to authenticated;
grant update on public.jeu_config to authenticated;
grant select, insert, update, delete on public.jeu_config, public.jeu_players, public.jeu_plays to service_role;
grant usage, select on sequence public.jeu_players_id_seq, public.jeu_plays_id_seq to service_role;
