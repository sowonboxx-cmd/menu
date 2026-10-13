-- ════════════════════════════════════════════════════════════════
-- STATISTIQUES DU SITE (compteur Beltab, sans cookie, sans Google)
-- À coller une fois dans Supabase → SQL Editor → Run. Sans risque à relancer.
--
-- Fonctionnement :
--   1. Le site (accueil + page de réservation) envoie un petit signal à
--      resa.beltab.app/t : une « visite » par onglet ouvert, puis un « clic »
--      par bouton suivi (reserver, carte, appeler, message, club,
--      prank_msg, prank_club…). Liste complète : notice « codes-de-suivi ».
--   2. Le Worker range le signal ici (clé serveur). Le public ne peut rien
--      lire ni écrire directement.
--   3. Chaque visite garde sa source : QR:TABLE, OFFRE:K7Q2, INSTAGRAM,
--      GOOGLE, DIRECT… La réservation faite ensuite garde la même source
--      (colonne source_code) : on sait quelle source a rempli des tables.
--   4. /admin → Statistiques appelle site_stats() qui renvoie les totaux.
--   Personne n'est identifié : un numéro d'onglet au hasard, effacé à la
--   fermeture de l'onglet. Pas de cookie, pas d'adresse IP gardée.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.site_events (
  id          bigserial primary key,
  client_slug text not null,              -- slug des réservations (drevici-paris ; labo : drevici-test)
  sid         text not null,              -- numéro d'onglet au hasard (compte les visites uniques)
  kind        text not null,              -- view | click
  name        text,                       -- page vue (accueil, book) ou bouton cliqué (reserver, prank_msg…)
  src         text,                       -- source de la visite (QR:TABLE, OFFRE:K7Q2, INSTAGRAM, DIRECT…)
  path        text,
  at          timestamptz not null default now()
);
create index if not exists site_events_slug_at on public.site_events (client_slug, at desc);

alter table public.site_events enable row level security;
drop policy if exists site_events_admin on public.site_events;
create policy site_events_admin on public.site_events for select to authenticated
  using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = site_events.client_slug));
grant select on public.site_events to authenticated;
grant select, insert on public.site_events to service_role;
grant usage on sequence public.site_events_id_seq to service_role;

-- La réservation garde la source de la visite (même colonne que le futur suivi QR du studio).
alter table public.restaurant_reservations add column if not exists source_code text;

-- Totaux pour /admin → Statistiques (administrateurs du restaurant uniquement).
create or replace function public.site_stats(p_slug text, p_from timestamptz, p_to timestamptz default now())
returns json language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = p_slug) then
    raise exception 'Accès refusé';
  end if;
  with ev as (
    select * from public.site_events where client_slug = p_slug and at >= p_from and at < p_to
  ), vis as (                                -- une visite = un onglet ; sa source = celle de son arrivée
    select sid, min(at) as at, (array_agg(coalesce(src, 'DIRECT') order by at))[1] as src
      from ev where kind = 'view' group by sid
  ), rs as (
    select * from public.restaurant_reservations
     where client_slug = p_slug and created_at >= p_from and created_at < p_to
       and coalesce(status, 'confirmed') <> 'cancelled'
  )
  select json_build_object(
    'visits',   (select count(*) from vis),
    'by_day',   (select coalesce(json_agg(json_build_object('d', d, 'v', v) order by d), '[]'::json)
                   from (select (at at time zone 'Europe/Paris')::date as d, count(*) as v from vis group by 1) x),
    'resa',     (select count(*) from rs),
    'covers',   (select coalesce(sum(covers), 0) from rs),
    'resa_day', (select coalesce(json_agg(json_build_object('d', d, 'n', n) order by d), '[]'::json)
                   from (select (created_at at time zone 'Europe/Paris')::date as d, count(*) as n from rs group by 1) x),
    'clicks',   (select coalesce(json_object_agg(name, n), '{}'::json)
                   from (select name, count(*) as n from ev where kind = 'click' and name is not null group by name) x),
    'people',   (select coalesce(json_object_agg(name, n), '{}'::json)      -- nombre de visiteurs différents par bouton
                   from (select name, count(distinct sid) as n from ev where kind = 'click' and name is not null group by name) x),
    'sources',  (select coalesce(json_agg(json_build_object('src', src, 'v', v) order by v desc), '[]'::json)
                   from (select src, count(*) as v from vis group by src) x),
    'resa_src', (select coalesce(json_agg(json_build_object('src', s, 'n', n, 'c', c)), '[]'::json)
                   from (select coalesce(nullif(source_code, ''), case when offer_code is not null then 'OFFRE:' || offer_code end, 'DIRECT') as s,
                                count(*) as n, coalesce(sum(covers), 0) as c
                           from rs group by 1) x)
  ) into r;
  return r;
end $$;
revoke all on function public.site_stats(text, timestamptz, timestamptz) from public;
grant execute on function public.site_stats(text, timestamptz, timestamptz) to authenticated;

-- Vérification : doit afficher 0 la première fois, puis la colonne source_code.
select 'site_events' as ok, count(*)::text from public.site_events
union all
select column_name::text, 'ok' from information_schema.columns
 where table_name = 'restaurant_reservations' and column_name = 'source_code';
