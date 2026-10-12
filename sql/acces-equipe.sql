-- ════════════════════════════════════════════════════════════════
-- Donner l'accès /admin à une personne d'un restaurant
-- ════════════════════════════════════════════════════════════════
-- ÉTAPE 1 (Supabase, sans SQL) : Authentication → Users → « Add user » → « Send invitation »
--          avec l'email de la personne. Elle reçoit un lien et choisit son mot de passe.
-- ÉTAPE 2 : remplacer l'EMAIL et le SLUG ci-dessous, puis Run.
--          Un resto a 2 slugs : celui du menu (ex. « kimchi ») et celui des résas/clients
--          (ex. « kimchi-paris »). La personne doit avoir les deux.
-- Sans risque à relancer. Une personne = un compte : chacun a ses propres identifiants.

insert into public.restaurant_admins (user_id, client_slug)
select u.id, s.slug
from auth.users u
cross join (values ('SLUG-MENU'), ('SLUG-RESA')) as s(slug)
where u.email = lower('EMAIL@EXEMPLE.FR')
  and not exists (select 1 from public.restaurant_admins x where x.user_id = u.id and x.client_slug = s.slug);

-- Vérification : la personne et ses restaurants
select u.email, a.client_slug from public.restaurant_admins a join auth.users u on u.id = a.user_id
where u.email = lower('EMAIL@EXEMPLE.FR');

-- RETIRER l'accès (départ d'un employé) : décommenter et Run.
-- delete from public.restaurant_admins
-- where user_id = (select id from auth.users where email = lower('EMAIL@EXEMPLE.FR'))
--   and client_slug in ('SLUG-MENU', 'SLUG-RESA');
