-- /gestion : copie de test de la carte Drevici.
-- À coller une fois dans Supabase → SQL Editor → Run.
--
-- La nouvelle page drevici-preview.beltab.app/gestion travaille sur la ligne
-- « drevici-test » : tout ce qui y est modifié (menu du jour, formules, couleurs,
-- horaires…) reste sur cette copie. Le vrai site Drevici n'est jamais touché.
--
-- Relancer ce fichier plus tard remet la copie à zéro (elle reprend la carte en
-- ligne du moment). Les administrateurs de Drevici reçoivent les mêmes droits
-- sur la copie.

-- 1. La copie de la carte (écrase l'ancienne copie s'il y en a une)
insert into public.menu_data (client_slug, data, updated_at)
select 'drevici-test', data, now()
from public.menu_data
where client_slug = 'drevici'
on conflict (client_slug) do update
  set data = excluded.data, updated_at = now();

-- 2. Les mêmes administrateurs que Drevici
insert into public.restaurant_admins (user_id, client_slug)
select ra.user_id, 'drevici-test'
from public.restaurant_admins ra
where ra.client_slug = 'drevici'
  and not exists (
    select 1 from public.restaurant_admins x
    where x.user_id = ra.user_id and x.client_slug = 'drevici-test'
  );

-- Vérification : doit afficher une ligne « drevici-test »
select client_slug, updated_at from public.menu_data where client_slug = 'drevici-test';
