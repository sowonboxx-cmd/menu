-- ════════════════════════════════════════════════════════════════
-- AUDIT : chaque restaurant ne voit que SES données
-- Lecture seule : ne modifie rien. Supabase → SQL Editor → Run.
-- Lancer une fois maintenant, puis après chaque nouveau client.
-- ════════════════════════════════════════════════════════════════

-- 1) Tables SANS protection (RLS désactivée). Résultat attendu : AUCUNE ligne.
--    Une ligne ici = n'importe qui avec la clé publique peut lire la table.
select tablename as table_sans_protection
from pg_tables
where schemaname = 'public' and rowsecurity = false
order by 1;

-- 2) Toutes les règles d'accès, table par table.
--    À lire : pour les données privées (réservations, clients, réglages, studio, QR…),
--    la règle doit mentionner restaurant_admins + client_slug.
--    Seules les données publiques du site (menu_data, tables, services, espaces,
--    dates bloquées) peuvent être lisibles par « anon ».
select tablename, policyname, cmd as action, roles,
       left(coalesce(qual, ''), 160)       as condition_lecture,
       left(coalesce(with_check, ''), 160) as condition_ecriture
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3) ALERTE : règles qui laissent le public LIRE une table privée.
--    Résultat attendu : AUCUNE ligne.
select tablename, policyname, roles, qual
from pg_policies
where schemaname = 'public'
  and cmd in ('SELECT', 'ALL')
  and ('anon' = any(roles) or 'public' = any(roles))
  and tablename in ('restaurant_reservations', 'restaurant_waitlist', 'resa_clients', 'resa_settings',
                    'sms_usage', 'restaurant_admins', 'cabine_events', 'cabine_tasks',
                    'qr_scans', 'qr_conversions', 'cabine_shop_sales', 'menu_data_history');

-- 4) Tables qui n'ont PAS de colonne client_slug (donc pas rangées par restaurant).
--    Normal pour restaurant_admins (rangée par user_id + client_slug, elle en a une)
--    et pour quelques tables techniques. Tout le reste doit en avoir une.
select t.tablename
from pg_tables t
where t.schemaname = 'public'
  and not exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = t.tablename and c.column_name = 'client_slug')
order by 1;

-- 5) Qui a accès à quoi : une ligne par personne et par restaurant.
select u.email, a.client_slug, u.last_sign_in_at
from public.restaurant_admins a
join auth.users u on u.id = a.user_id
order by a.client_slug, u.email;
