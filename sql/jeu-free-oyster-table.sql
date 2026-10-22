-- Jeu Free Oyster · version « à table » (petite carte de table, QR …/carte-table-…).
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. Ne supprime aucune donnée.
--
-- À table, les lots se mangent pendant le repas :
--   · 1 huître bonus : 1 chance sur 3
--   · 3 huîtres      : 1 chance sur 15
--   · 1 T-shirt      : environ 1 par semaine (chance 1 sur 150, et jamais plus d'1 T-shirt gagné à table sur 7 jours)
--   · code valable pour ce repas seulement (4 heures)
-- La partie est « à table » quand le QR scanné contient CARTE-TABLE (ex. FREE-OYSTER-CARTE-TABLE-1).

alter table public.jeu_config add column if not exists t_bonus      numeric not null default 0.333333;
alter table public.jeu_config add column if not exists t_trio       numeric not null default 0.066667;
alter table public.jeu_config add column if not exists t_tshirt     numeric not null default 0.006667;
alter table public.jeu_config add column if not exists t_tshirt_7j  int     not null default 1;
alter table public.jeu_config add column if not exists t_valid_h    int     not null default 4;
alter table public.jeu_plays  add column if not exists mode text not null default 'rue';   -- rue | table
alter table public.jeu_plays drop constraint if exists jeu_plays_result_check;
alter table public.jeu_plays add constraint jeu_plays_result_check check (result in ('perdu','huitre','plateau','tshirt','bonus','trio'));

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
    -- T-shirt à table : au plus t_tshirt_7j sur 7 jours glissants, sinon on passe au lot suivant
    if res = 'tshirt' then
      select count(*) into won from public.jeu_plays where client_slug = pl.client_slug and mode = 'table' and result = 'tshirt' and created_at > now() - interval '7 days';
      if won >= cfg.t_tshirt_7j then res := 'trio'; end if;
    end if;
  else
    if r < cfg.p_tshirt then res := 'tshirt';
    elsif r < cfg.p_tshirt + cfg.p_plateau then res := 'plateau';
    elsif r < cfg.p_tshirt + cfg.p_plateau + cfg.p_huitre then res := 'huitre';
    end if;
    if res <> 'perdu' then
      select count(*) into won from public.jeu_plays where client_slug = pl.client_slug and result = res;
      if (res = 'tshirt'  and cfg.max_tshirt  is not null and won >= cfg.max_tshirt)
      or (res = 'plateau' and cfg.max_plateau is not null and won >= cfg.max_plateau)
      or (res = 'huitre'  and cfg.max_huitre  is not null and won >= cfg.max_huitre) then res := 'perdu'; end if;
    end if;
  end if;

  if res <> 'perdu' then
    exp := case when md = 'table' then now() + make_interval(hours => cfg.t_valid_h) else now() + make_interval(days => cfg.valid_days) end;
    loop
      c := 'PERLE-' || (select string_agg(substr(chars, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 4));
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

-- Le QR de la petite carte de table (Studio → Scans QR)
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, campaign, support, place, num, path, style, note)
values ('drevici','FREE-OYSTER-CARTE-TABLE-1','Carte de table · jeu à table','Affiches rue','Will','/free-oyster','Partie jouée à table','Free Oyster','Carte table','table',1,'free-oyster/carte-table-1','losange','Petite carte posée avec le menu')
on conflict (code) do nothing;
notify pgrst, 'reload schema';
