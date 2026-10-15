-- Surzur : Floriane reçoit les réservations par email + accès à l'admin de Surzur.
-- AVANT l'étape 2 : Supabase → Authentication → Users → Add user → Send invitation
-- avec floriane@oceanprosarl.com (elle reçoit un email pour choisir son mot de passe).

-- 1. Emails de réception des réservations de Surzur
update resa_settings
set notify_email = 'floriane@oceanprosarl.com'
where client_slug = 'drevici-surzur';

-- 2. Accès à l'admin de Surzur uniquement (pas Paris)
insert into public.restaurant_admins (user_id, client_slug)
select u.id, 'drevici-surzur'
from auth.users u
where lower(u.email) = 'floriane@oceanprosarl.com'
  and not exists (
    select 1 from public.restaurant_admins x
    where x.user_id = u.id and x.client_slug = 'drevici-surzur'
  );

-- Vérification
select 'emails Paris' as quoi, (select notify_email from resa_settings where client_slug = 'drevici-paris') as resultat
union all select 'emails Surzur', (select notify_email from resa_settings where client_slug = 'drevici-surzur')
union all select 'accès Floriane', (
  select string_agg(a.client_slug, ', ')
  from public.restaurant_admins a join auth.users u on u.id = a.user_id
  where lower(u.email) = 'floriane@oceanprosarl.com'
);
