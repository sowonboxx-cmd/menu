-- ════════════════════════════════════════════════════════════════
-- TABLE BOOST — offres traçables
-- À coller une fois dans Supabase → SQL Editor → Run. Sans risque à relancer.
--
-- Fonctionnement :
--   1. Chaque offre a un code court (ex. K7Q2) : c'est son « UTM ».
--   2. Le lien de la story mène à …/book?o=K7Q2 ; la page de réservation
--      lit l'offre (boost_offer) et l'affiche : appliquée, mauvais jour,
--      expirée ou complète.
--   3. À l'enregistrement de la réservation, la base revérifie tout avec
--      SON heure (pas celle du téléphone) : date limite, jour et service,
--      nombre de personnes minimum, nombre de tables prévu.
--      ✓ valide  → offer_code + offer_label sont gardés sur la réservation
--      ✗ refusée → la réservation passe quand même, sans l'offre
--                  (le code tenté est noté dans offer_missed).
--   4. /admin compte les réservations portant le code : résas, couverts,
--      chiffre d'affaires (couverts × ticket moyen).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.boost_offers (
  id           uuid primary key default gen_random_uuid(),
  client_slug  text not null,                 -- slug des réservations (ex. drevici-paris)
  code         text not null unique,          -- K7Q2 (majuscules, sans caractères ambigus)
  title        text not null,                 -- « Deux coupes de champagne offertes »
  detail       text,                          -- « Dès 2 personnes »
  emoji        text,
  kind         text not null default 'rapide',-- rapide | plat | perso
  date_iso     date not null,                 -- le jour à remplir
  service      text,                          -- « Soir »
  slot_from    text,                          -- 'HH:MM' début du service (inclus)
  slot_to      text,                          -- 'HH:MM' fin du service (exclue)
  min_covers   int  not null default 1,
  max_tables   int,                           -- null = pas de limite
  deadline     timestamptz not null,          -- réserver avant
  photo        text,
  caption      text,
  status       text not null default 'draft', -- draft | published | cancelled
  published_at timestamptz,
  clicks       int  not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists boost_offers_slug_date on public.boost_offers (client_slug, date_iso desc);

alter table public.boost_offers enable row level security;
drop policy if exists boost_offers_admin on public.boost_offers;
create policy boost_offers_admin on public.boost_offers for all to authenticated
  using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = boost_offers.client_slug))
  with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = boost_offers.client_slug));
grant select, insert, update, delete on public.boost_offers to authenticated;

-- Les réservations gardent l'offre (validée par la base).
alter table public.restaurant_reservations add column if not exists offer_code   text;
alter table public.restaurant_reservations add column if not exists offer_label  text;
alter table public.restaurant_reservations add column if not exists offer_missed text;  -- code tenté mais refusé (trop tard, mauvais jour…)
create index if not exists resa_offer_code on public.restaurant_reservations (offer_code) where offer_code is not null;

-- Vérification à l'enregistrement d'une réservation publique.
create or replace function public.boost_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare o public.boost_offers; n int; ok boolean;
begin
  new.offer_label := null;
  if new.offer_code is null or btrim(new.offer_code) = '' then new.offer_code := null; return new; end if;
  select * into o from public.boost_offers
   where code = upper(btrim(new.offer_code))
     -- même restaurant (la page de test de la préview écrit dans sa copie « -test »)
     and (client_slug = new.client_slug or new.client_slug like '%-test')
     and status <> 'cancelled';
  if not found then new.offer_missed := upper(btrim(new.offer_code)); new.offer_code := null; return new; end if;
  ok := now() <= o.deadline
        and new.date_iso::date = o.date_iso
        and (o.slot_from is null or new.slot >= o.slot_from)
        and (o.slot_to   is null or new.slot <  o.slot_to)
        and coalesce(new.covers, 0) >= coalesce(o.min_covers, 1);
  if ok and o.max_tables is not null then
    select count(*) into n from public.restaurant_reservations
     where offer_code = o.code and coalesce(status, 'confirmed') = 'confirmed';
    ok := n < o.max_tables;
  end if;
  if ok then new.offer_code := o.code; new.offer_label := o.title; new.offer_missed := null;
  else new.offer_missed := o.code; new.offer_code := null; end if;
  return new;
end $$;
drop trigger if exists boost_check on public.restaurant_reservations;
create trigger boost_check before insert on public.restaurant_reservations
  for each row execute function public.boost_check();

-- Lecture publique d'UNE offre par son code (page de réservation). Rien d'autre n'est lisible.
-- p_click = true : compte un clic sur le lien.
create or replace function public.boost_offer(p_code text, p_click boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare o public.boost_offers; n int; st text;
begin
  select * into o from public.boost_offers where code = upper(btrim(p_code));
  if not found then return null; end if;
  select count(*) into n from public.restaurant_reservations
   where offer_code = o.code and coalesce(status, 'confirmed') = 'confirmed';
  st := case when o.status = 'cancelled' then 'off'
             when now() > o.deadline then 'expired'
             when o.max_tables is not null and n >= o.max_tables then 'full'
             else 'ok' end;
  if p_click then update public.boost_offers set clicks = clicks + 1 where id = o.id; end if;
  return json_build_object('code', o.code, 'title', o.title, 'detail', o.detail, 'emoji', o.emoji,
    'date_iso', o.date_iso, 'service', o.service, 'slot_from', o.slot_from, 'slot_to', o.slot_to,
    'min_covers', o.min_covers, 'deadline', o.deadline, 'state', st, 'now', now());
end $$;
revoke all on function public.boost_offer(text, boolean) from public;
grant execute on function public.boost_offer(text, boolean) to anon, authenticated;

-- Vérification : doit afficher la table et les 3 colonnes.
select 'boost_offers' as ok, count(*) from public.boost_offers
union all
select column_name::text, null from information_schema.columns
 where table_name = 'restaurant_reservations' and column_name in ('offer_code','offer_label','offer_missed');
