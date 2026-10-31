-- Réservation d'un joueur : reconnue automatiquement, même sans code.
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. N'efface rien.
--
-- Quand quelqu'un réserve avec le même email OU le même téléphone qu'un joueur
-- (Free Oyster, Halloween, tout jeu du restaurant) qui a joué dans les 30 derniers jours :
--   · la réservation reprend le QR d'origine du joueur (affiche, carte d'un serveur, story…)
--     → elle compte dans les conversions du Studio, donc dans la commission ;
--   · si son lot est encore valable, son code est noté sur la réservation
--     (« Lot du jeu · code BOO-XXXX ») : le serveur le voit, le client n'a rien à retenir.
-- Si la réservation porte déjà un code (bouton du ticket, lien QR), on ne touche à rien.

alter table public.restaurant_reservations add column if not exists jeu_code text;

-- Téléphone au même format que les joueurs : chiffres seulement, 33… pour la France.
create or replace function public.norm_phone(p text)
returns text language sql immutable as $$
  select case when d is null or length(d) < 10 then null else d end from (
    select regexp_replace(
      case when s like '+%' then substr(s, 2)
           when s like '00%' then substr(s, 3)
           when s like '0%'  then '33' || substr(s, 2)
           else s end, '^330', '33') as d
    from (select regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g') as s) a
  ) b
$$;

create or replace function public.resa_reconnait_joueur()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ph  text := public.norm_phone(new.phone);
  em  text := lower(nullif(trim(coalesce(new.from_email, '')), ''));
  pl  record;
  py  record;
  jour date := coalesce(new.date_iso::date, current_date);
begin
  if em is null and ph is null then return new; end if;

  -- le joueur le plus récent de ce restaurant (tous ses jeux) qui a joué dans les 30 derniers jours
  select p.id, p.src into pl
    from public.jeu_players p
   where split_part(p.client_slug, '--', 1) = new.client_slug
     and (lower(p.email) = em or (ph is not null and p.phone = ph))
     and p.created_at > now() - interval '30 days'
   order by p.created_at desc limit 1;
  if pl.id is null then return new; end if;

  -- sa dernière partie avec un code
  select y.code, y.src, y.expires_at, y.redeemed_at into py
    from public.jeu_plays y
   where y.player_id = pl.id and y.code is not null
   order by y.created_at desc limit 1;

  -- 1 · d'où il vient (pour les conversions et la commission), si la réservation ne le dit pas déjà
  if coalesce(new.source_code, '') = '' then
    new.source_code := nullif(upper(coalesce(py.src, pl.src, '')), '');
  end if;

  -- 2 · son lot, s'il est encore valable le jour de la réservation
  if py.code is not null and py.redeemed_at is null
     and (py.expires_at is null or py.expires_at::date >= jour) then
    new.jeu_code := py.code;
    if position(py.code in coalesce(new.note, '')) = 0 then
      new.note := case when coalesce(new.note, '') in ('', 'Aucune')
                       then 'Lot du jeu · code ' || py.code || ' (reconnu automatiquement)'
                       else new.note || ' · Lot du jeu · code ' || py.code || ' (reconnu automatiquement)' end;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists resa_reconnait_joueur on public.restaurant_reservations;
create trigger resa_reconnait_joueur before insert on public.restaurant_reservations
  for each row execute function public.resa_reconnait_joueur();
-- (le déclencheur « qr_resa_conversion », qui tourne APRÈS l'insertion, crée ensuite la conversion
--  à partir du source_code ainsi rempli : rien d'autre à changer.)
