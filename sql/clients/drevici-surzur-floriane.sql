-- Surzur : les nouvelles réservations arrivent par email chez Floriane et Benji + copie Beltab.
-- Pour ajouter quelqu'un plus tard : rajouter son adresse dans la liste, séparée par une virgule.
-- (Pas d'accès admin pour Floriane pour l'instant : profil utilisateur à créer plus tard.)

-- 1. Emails de réception des réservations de Surzur
update resa_settings
set notify_email = 'floriane@oceanprosarl.com, benji@oceanprosarl.com, beltab.app@gmail.com'
where client_slug = 'drevici-surzur';

-- 2. Beltab garde l'accès admin de Surzur (ne fait rien si c'est déjà le cas)
insert into public.restaurant_admins (user_id, client_slug)
select u.id, 'drevici-surzur'
from auth.users u
where lower(u.email) in ('beltab.app@gmail.com', 'sowonboxx@gmail.com')
  and not exists (
    select 1 from public.restaurant_admins x
    where x.user_id = u.id and x.client_slug = 'drevici-surzur'
  );

-- Vérification
select 'emails Paris' as quoi, (select notify_email from resa_settings where client_slug = 'drevici-paris') as resultat
union all select 'emails Surzur', (select notify_email from resa_settings where client_slug = 'drevici-surzur')
union all select 'accès admin Surzur', (
  select string_agg(u.email, ', ')
  from public.restaurant_admins a join auth.users u on u.id = a.user_id
  where a.client_slug = 'drevici-surzur'
);
