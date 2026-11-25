-- Réservations : Beltab ne reçoit plus les emails des restaurants (Will, 25/11/2026).
-- Le worker ignore déjà beltab.app@gmail.com et sowonboxx@gmail.com ; ce script nettoie aussi la liste « notify_email ».

-- 1) Avant : qui reçoit quoi (adresse du resto + comptes admin)
select s.client_slug, s.notify_email from resa_settings s order by 1;
select a.client_slug, u.email from restaurant_admins a join auth.users u on u.id = a.user_id
where a.client_slug like 'drevici%' order by 1, 2;

-- 2) Retirer beltab.app@gmail.com et sowonboxx@gmail.com de toutes les listes notify_email
update resa_settings
set notify_email = nullif(array_to_string(array(
  select trim(x) from unnest(regexp_split_to_array(coalesce(notify_email, ''), '[,;[:space:]]+')) x
  where trim(x) <> '' and lower(trim(x)) not in ('beltab.app@gmail.com', 'sowonboxx@gmail.com')
), ', '), '')
where notify_email ilike '%beltab.app@gmail.com%' or notify_email ilike '%sowonboxx@gmail.com%';

-- 3) Après
select client_slug, notify_email from resa_settings order by 1;
