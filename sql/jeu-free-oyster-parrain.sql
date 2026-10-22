-- Jeu Free Oyster : plus de partie bonus pour un parrain qui a déjà gagné un lot.
-- À coller une fois dans Supabase → SQL Editor → Run (remplace la fonction de tirage, ne touche à aucune donnée).
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

  -- Parrainage : 1re partie d'un filleul → le parrain gagne UNE partie de plus, une seule fois dans tout le jeu,
  -- et seulement s'il n'a encore rien gagné (un gagnant a déjà son lot).
  if pl.plays_used = 0 and pl.referred_by is not null then
    update public.jeu_players set plays_allowed = plays_allowed + 1, ref_bonus_at = now()
      where id = pl.referred_by and ref_bonus_at is null
        and not exists (select 1 from public.jeu_plays w where w.player_id = pl.referred_by and w.result <> 'perdu');
  end if;

  return jsonb_build_object('ok', true, 'result', res, 'code', c, 'expires_at', exp,
    'plays_left', pl.plays_allowed - pl.plays_used - 1, 'ref_code', pl.ref_code, 'bonus_used', pl.ref_bonus_at is not null);
end $$;
revoke all on function public.jeu_play(bigint, text) from public, anon, authenticated;
grant execute on function public.jeu_play(bigint, text) to service_role;
notify pgrst, 'reload schema';
