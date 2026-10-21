-- Jeu Free Oyster : la fonction de tirage + les droits (suite de jeu-free-oyster.sql).
-- À coller une fois dans Supabase → SQL Editor → Run. Sans risque si une partie a déjà été lancée.
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

-- Recharge la liste des fonctions pour le serveur
notify pgrst, 'reload schema';
