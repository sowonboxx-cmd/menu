-- Jeu « Trick or Huître » · Halloween 2026 (page halloween-2026.html).
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. Purement additif, ne supprime aucune donnée,
-- et ne change rien pour Free Oyster (les nouvelles colonnes ont les valeurs de Free Oyster par défaut).
--
-- Le jeu a son propre slug : « <restaurant>--halloween-2026 ». Ses joueurs sont à part :
-- on peut jouer à Halloween même si on a déjà joué à Free Oyster. Une partie par personne.
-- Tout le monde gagne :
--   · 3 huîtres         : 1 chance sur 10
--   · plateau de 6      : 1 chance sur 50
--   · T-shirt Drevici   : 1 chance sur 100
--   · tous les autres   : un shot offert
-- Code BOO-XXXX valable 7 jours, validé dans l'espace restaurateur comme les codes PERLE.

alter table public.jeu_config add column if not exists code_prefix  text not null default 'PERLE';  -- PERLE-XXXX, BOO-XXXX…
alter table public.jeu_config add column if not exists lot_huitre   text not null default 'huitre'; -- lot de la chance « huître » (huitre ou trio)
alter table public.jeu_config add column if not exists consolation  text;                           -- lot de ceux qui n'ont rien gagné (vide = perdu)
alter table public.jeu_plays drop constraint if exists jeu_plays_result_check;
alter table public.jeu_plays add constraint jeu_plays_result_check check (result in ('perdu','huitre','plateau','tshirt','bonus','trio','shot'));

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
  src text := upper(coalesce(p_src, ''));
  md  text;
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
  if src = '' then src := upper(coalesce(pl.src, '')); end if;
  md := case when src like '%CARTE-TABLE%' then 'table' else 'rue' end;

  if md = 'table' then
    if r < cfg.t_tshirt then res := 'tshirt';
    elsif r < cfg.t_tshirt + cfg.t_trio then res := 'trio';
    elsif r < cfg.t_tshirt + cfg.t_trio + cfg.t_bonus then res := 'bonus';
    end if;
    if res = 'tshirt' then
      select count(*) into won from public.jeu_plays where client_slug = pl.client_slug and mode = 'table' and result = 'tshirt' and created_at > now() - interval '7 days';
      if won >= cfg.t_tshirt_7j then res := 'trio'; end if;
    end if;
  else
    if r < cfg.p_tshirt then res := 'tshirt';
    elsif r < cfg.p_tshirt + cfg.p_plateau then res := 'plateau';
    elsif r < cfg.p_tshirt + cfg.p_plateau + cfg.p_huitre then res := cfg.lot_huitre;
    end if;
    if res <> 'perdu' then
      select count(*) into won from public.jeu_plays where client_slug = pl.client_slug and result = res;
      if (res = 'tshirt'  and cfg.max_tshirt  is not null and won >= cfg.max_tshirt)
      or (res = 'plateau' and cfg.max_plateau is not null and won >= cfg.max_plateau)
      or (res = cfg.lot_huitre and cfg.max_huitre is not null and won >= cfg.max_huitre) then res := 'perdu'; end if;
    end if;
  end if;
  -- tout le monde gagne (Halloween : le shot)
  if res = 'perdu' and cfg.consolation is not null then res := cfg.consolation; end if;

  if res <> 'perdu' then
    exp := case when md = 'table' then now() + make_interval(hours => cfg.t_valid_h) else now() + make_interval(days => cfg.valid_days) end;
    loop
      c := cfg.code_prefix || '-' || (select string_agg(substr(chars, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 4));
      exit when not exists (select 1 from public.jeu_plays where code = c);
    end loop;
  end if;

  update public.jeu_players set plays_used = plays_used + 1 where id = pl.id;
  insert into public.jeu_plays (client_slug, player_id, n, result, code, expires_at, src, mode)
    values (pl.client_slug, pl.id, pl.plays_used + 1, res, c, exp, nullif(src, ''), md);

  -- Parrainage : 1re partie d'un filleul → le parrain gagne UNE partie de plus, une seule fois,
  -- et seulement s'il n'a encore rien gagné.
  if pl.plays_used = 0 and pl.referred_by is not null then
    update public.jeu_players set plays_allowed = plays_allowed + 1, ref_bonus_at = now()
      where id = pl.referred_by and ref_bonus_at is null
        and not exists (select 1 from public.jeu_plays w where w.player_id = pl.referred_by and w.result <> 'perdu');
  end if;

  return jsonb_build_object('ok', true, 'result', res, 'code', c, 'expires_at', exp, 'mode', md,
    'plays_left', pl.plays_allowed - pl.plays_used - 1, 'ref_code', pl.ref_code, 'bonus_used', pl.ref_bonus_at is not null);
end $$;
revoke all on function public.jeu_play(bigint, text) from public, anon, authenticated;
grant execute on function public.jeu_play(bigint, text) to service_role;

-- Les deux jeux : copie de test (préview) et vrai jeu. Fin du vrai jeu : samedi 7 novembre 2026 à minuit.
-- Stock : 10 plateaux et 10 T-shirts au maximum (une fois atteint, le lot devient le shot) ; 3 huîtres et shot sans limite.
insert into public.jeu_config (client_slug, p_huitre, p_plateau, p_tshirt, max_plateau, max_tshirt, valid_days, ends_at, code_prefix, lot_huitre, consolation) values
  ('drevici-test--halloween-2026',  0.10, 0.02, 0.01, 10, 10, 7, null,                          'BOO', 'trio', 'shot'),
  ('drevici-paris--halloween-2026', 0.10, 0.02, 0.01, 10, 10, 7, '2026-11-08 00:00:00+01',      'BOO', 'trio', 'shot')
on conflict (client_slug) do update set p_huitre = excluded.p_huitre, p_plateau = excluded.p_plateau, p_tshirt = excluded.p_tshirt, max_plateau = excluded.max_plateau, max_tshirt = excluded.max_tshirt,
  valid_days = excluded.valid_days, ends_at = excluded.ends_at, code_prefix = excluded.code_prefix, lot_huitre = excluded.lot_huitre, consolation = excluded.consolation;

-- L'équipe du restaurant voit aussi les joueurs et les parties de ses jeux d'un moment (statistiques).
do $$
declare t text;
begin
  foreach t in array array['jeu_config','jeu_players','jeu_plays'] loop
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for select to authenticated
      using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = split_part(%1$s.client_slug, ''--'', 1)))', t);
  end loop;
end $$;

-- Le QR de l'affiche A0 (go.beltab.app/HALLOWEEN-AFFICHE-1 → page du jeu, scans comptés dans Studio → Scans QR)
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, campaign, support, place, num, path, style, note)
values ('drevici','HALLOWEEN-AFFICHE-1','Affiche A0 · Trick or Huître','Affiches rue','Will','/halloween-2026','Partie jouée','Halloween 2026','Affiche','biot',1,'halloween-2026/affiche-1','losange','Affiche A0 « TRICK OR HUÎTRE »')
on conflict (code) do nothing;
notify pgrst, 'reload schema';
