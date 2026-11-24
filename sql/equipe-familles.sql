-- ════════════════════════════════════════════════════════════════
-- Équipe : réparer les accès « Pas d'accès » (24/11/2026)
-- ════════════════════════════════════════════════════════════════
-- Un même établissement a plusieurs slugs : le site en ligne, les réservations et la préview.
--   Drevici Paris  : drevici, drevici-paris, drevici-test
--   Drevici Surzur : drevici-surzur, drevici-surzur-test
-- Un administrateur ajouté depuis la page Équipe ne recevait que les slugs de la personne qui l'invitait :
-- s'il en manquait un (souvent la préview, « drevici-test »), il voyait « Pas d'accès ».
-- Ce script donne à chaque administrateur TOUS les slugs de son établissement. Sans risque à relancer.

insert into public.restaurant_admins (user_id, client_slug)
select distinct a.user_id, f.slug
from public.restaurant_admins a
join (values
  ('drevici','drevici'),('drevici','drevici-paris'),('drevici','drevici-test'),
  ('drevici-paris','drevici'),('drevici-paris','drevici-paris'),('drevici-paris','drevici-test'),
  ('drevici-test','drevici'),('drevici-test','drevici-paris'),('drevici-test','drevici-test'),
  ('drevici-surzur','drevici-surzur'),('drevici-surzur','drevici-surzur-test'),
  ('drevici-surzur-test','drevici-surzur'),('drevici-surzur-test','drevici-surzur-test')
) as f(has, slug) on f.has = a.client_slug
where not exists (select 1 from public.restaurant_admins x where x.user_id = a.user_id and x.client_slug = f.slug);

-- Vérification : chaque compte et ses slugs
select u.email, string_agg(a.client_slug, ', ' order by a.client_slug) as slugs
from public.restaurant_admins a join auth.users u on u.id = a.user_id
where a.client_slug like 'drevici%'
group by u.email order by u.email;
