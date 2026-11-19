-- ════════════════════════════════════════════════════════════════════
-- Préview de l'admin de Surzur : drevici-preview.beltab.app/paris/admin?resto=surzur
-- Crée « drevici-surzur-test », une copie de la carte de Surzur (comme « drevici-test » pour Paris) :
-- ce qu'on modifie dans la carte en préview ne touche pas le vrai site.
-- Les tables, espaces et réservations restent ceux de Surzur (drevici-surzur), comme pour Paris.
-- À coller dans Supabase → SQL Editor → Run. Le relancer remet la copie à jour depuis le vrai site.
-- ════════════════════════════════════════════════════════════════════

-- 1. Copie de la carte (avec le plan de salle)
insert into public.menu_data (client_slug, data, updated_at)
select 'drevici-surzur-test', data, now() from public.menu_data where client_slug = 'drevici-surzur'
on conflict (client_slug) do update set data = excluded.data, updated_at = now();

-- 2. Les admins de Surzur sont aussi admins de la copie de test
insert into public.restaurant_admins (user_id, client_slug)
select distinct a.user_id, 'drevici-surzur-test' from public.restaurant_admins a
where a.client_slug = 'drevici-surzur'
  and not exists (select 1 from public.restaurant_admins b where b.user_id = a.user_id and b.client_slug = 'drevici-surzur-test');

-- Vérification : 1 carte copiée, et le nombre d'admins de la copie
select (select count(*) from public.menu_data where client_slug = 'drevici-surzur-test') as carte_copiee,
       (select count(*) from public.restaurant_admins where client_slug = 'drevici-surzur-test') as admins_copie;
