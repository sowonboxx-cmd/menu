-- Jeu « on joue d'abord, on s'inscrit pour récupérer le lot » (Trick or Huître et jeux d'un moment).
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. Additif : Free Oyster ne change pas.
--
-- 1. jeu_draw   : le joueur toque à une porte → le serveur tire le lot et le garde de côté (pas encore de code).
-- 2. jeu_claim  : il donne ses coordonnées → le lot tiré devient sa partie, avec son code.
--
-- Protections contre ceux qui rejouent pour tomber sur le plateau :
--   · le tirage est attaché au téléphone : recharger la page redonne exactement le même lot ;
--   · même réseau (même adresse IP) : au-delà de 3 tirages en 24 h, les nouveaux tirages donnent le shot ;
--   · un tirage ne sert qu'une fois, et une seule partie par email / téléphone (comme avant) ;
--   · un tirage non réclamé expire au bout de 24 h ;
--   · les plateaux et T-shirts tirés mais pas encore réclamés comptent dans le stock (10 maximum).

create table if not exists public.jeu_draws (
  id           bigserial primary key,
  client_slug  text not null,
  token        text not null unique,          -- secret gardé sur le téléphone
  device       text not null,                 -- identifiant du téléphone (navigateur)
  ip_hash      text,                          -- empreinte de l'adresse IP (jamais l'IP en clair)
  result       text not null,
  src          text,
  play_id      bigint references public.jeu_plays(id),
  claimed_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists jeu_draws_dev on public.jeu_draws (client_slug, device);
create index if not exists jeu_draws_ip  on public.jeu_draws (client_slug, ip_hash, created_at desc);
alter table public.jeu_draws enable row level security;
drop policy if exists jeu_draws_admin on public.jeu_draws;
create policy jeu_draws_admin on public.jeu_draws for select to authenticated
  using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = split_part(jeu_draws.client_slug, '--', 1)));
grant select on public.jeu_draws to authenticated;
grant select, insert, update on public.jeu_draws to service_role;
grant usage, select on sequence public.jeu_draws_id_seq to service_role;

-- ── 1 · Tirage avant inscription ──
create or replace function public.jeu_draw(p_slug text, p_device text, p_ip text, p_src text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  cfg public.jeu_config%rowtype;
  d   public.jeu_draws%rowtype;
  r   numeric := random();
  res text := 'perdu';
  won int; n_ip int;
  tok text := md5(random()::text || clock_timestamp()::text) || substr(md5(random()::text), 1, 8);
begin
  select * into cfg from public.jeu_config where client_slug = p_slug;
  if not found or not cfg.active or (cfg.ends_at is not null and cfg.ends_at < now()) then
    return jsonb_build_object('ok', false, 'closed', true);
  end if;
  -- même téléphone : on redonne le même tirage (réclamé ou non)
  select * into d from public.jeu_draws where client_slug = p_slug and device = p_device order by id desc limit 1;
  if found then
    return jsonb_build_object('ok', true, 'draw', d.token, 'result', d.result, 'claimed', d.claimed_at is not null, 'again', true);
  end if;

  if r < cfg.p_tshirt then res := 'tshirt';
  elsif r < cfg.p_tshirt + cfg.p_plateau then res := 'plateau';
  elsif r < cfg.p_tshirt + cfg.p_plateau + cfg.p_huitre then res := cfg.lot_huitre;
  end if;
  -- stock : lots déjà gagnés + lots tirés et pas encore réclamés (24 h)
  if res in ('tshirt', 'plateau') or (res = cfg.lot_huitre and cfg.max_huitre is not null) then
    select (select count(*) from public.jeu_plays where client_slug = p_slug and result = res)
         + (select count(*) from public.jeu_draws where client_slug = p_slug and result = res and claimed_at is null and created_at > now() - interval '24 hours')
      into won;
    if (res = 'tshirt'  and cfg.max_tshirt  is not null and won >= cfg.max_tshirt)
    or (res = 'plateau' and cfg.max_plateau is not null and won >= cfg.max_plateau)
    or (res = cfg.lot_huitre and cfg.max_huitre is not null and won >= cfg.max_huitre) then res := 'perdu'; end if;
  end if;
  -- même réseau : au-delà de 3 tirages en 24 h, seulement le lot de consolation
  if p_ip is not null then
    select count(*) into n_ip from public.jeu_draws where client_slug = p_slug and ip_hash = p_ip and created_at > now() - interval '24 hours';
    if n_ip >= 3 then res := 'perdu'; end if;
  end if;
  if res = 'perdu' and cfg.consolation is not null then res := cfg.consolation; end if;

  insert into public.jeu_draws (client_slug, token, device, ip_hash, result, src)
    values (p_slug, tok, p_device, p_ip, res, nullif(upper(coalesce(p_src, '')), ''));
  return jsonb_build_object('ok', true, 'draw', tok, 'result', res, 'claimed', false);
end $$;
revoke all on function public.jeu_draw(text, text, text, text) from public, anon, authenticated;
grant execute on function public.jeu_draw(text, text, text, text) to service_role;

-- ── 2 · Inscription : le tirage devient la partie du joueur ──
create or replace function public.jeu_claim(p_player bigint, p_draw text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  pl  public.jeu_players%rowtype;
  cfg public.jeu_config%rowtype;
  d   public.jeu_draws%rowtype;
  c   text; exp timestamptz; pid bigint;
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  select * into pl from public.jeu_players where id = p_player for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'joueur inconnu'); end if;
  if pl.plays_used >= pl.plays_allowed then
    return jsonb_build_object('ok', false, 'done', true, 'ref_code', pl.ref_code, 'bonus_used', pl.ref_bonus_at is not null);
  end if;
  select * into d from public.jeu_draws where token = p_draw and client_slug = pl.client_slug for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Tirage introuvable, rejoue.', 'reset_draw', true); end if;
  if d.claimed_at is not null then return jsonb_build_object('ok', false, 'error', 'Ce lot a déjà été récupéré.', 'used', true); end if;
  if d.created_at < now() - interval '24 hours' then return jsonb_build_object('ok', false, 'error', 'Ce tirage a expiré, rejoue.', 'reset_draw', true); end if;
  select * into cfg from public.jeu_config where client_slug = pl.client_slug;
  exp := now() + make_interval(days => cfg.valid_days);
  loop
    c := cfg.code_prefix || '-' || (select string_agg(substr(chars, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 4));
    exit when not exists (select 1 from public.jeu_plays where code = c);
  end loop;
  update public.jeu_players set plays_used = plays_used + 1 where id = pl.id;
  insert into public.jeu_plays (client_slug, player_id, n, result, code, expires_at, src, mode)
    values (pl.client_slug, pl.id, pl.plays_used + 1, d.result, c, exp, coalesce(d.src, pl.src), 'rue') returning id into pid;
  update public.jeu_draws set claimed_at = now(), play_id = pid where id = d.id;
  return jsonb_build_object('ok', true, 'result', d.result, 'code', c, 'expires_at', exp, 'mode', 'rue',
    'plays_left', pl.plays_allowed - pl.plays_used - 1, 'ref_code', pl.ref_code, 'bonus_used', pl.ref_bonus_at is not null);
end $$;
revoke all on function public.jeu_claim(bigint, text) from public, anon, authenticated;
grant execute on function public.jeu_claim(bigint, text) to service_role;
notify pgrst, 'reload schema';
