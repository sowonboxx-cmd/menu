-- ════════════════════════════════════════════════════════════════
-- Drevici en ligne : réservations Brevo, club et /gestion sur le VRAI resto
-- À coller UNE FOIS dans Supabase → SQL Editor → Run.
-- Purement additif : ne supprime ni ne modifie aucune donnée existante.
-- ════════════════════════════════════════════════════════════════

-- 1) Réglages Brevo du vrai restaurant (« drevici-paris ») : repris de la copie de test,
--    avec la même adresse qui reçoit les nouvelles réservations (notify_email).
insert into resa_settings (client_slug, restaurant_name, reply_to, notify_email, address, phone, site_url,
                           sms_reminders, sms_reminder_limit, sms_marketing_included, sms_marketing_credits, active)
select 'drevici-paris', restaurant_name, reply_to, notify_email, address, phone, 'https://drevici.beltab.app',
       sms_reminders, sms_reminder_limit, sms_marketing_included, 0, true
from resa_settings where client_slug = 'drevici-test'
on conflict (client_slug) do nothing;

-- 2) Les administrateurs de Drevici gèrent aussi les clients et le club (« drevici-paris »)
insert into public.restaurant_admins (user_id, client_slug)
select ra.user_id, 'drevici-paris'
from public.restaurant_admins ra
where ra.client_slug = 'drevici'
  and not exists (select 1 from public.restaurant_admins x where x.user_id = ra.user_id and x.client_slug = 'drevici-paris');

-- Vérification : une ligne « drevici-paris » avec la bonne adresse de réception
select client_slug, restaurant_name, notify_email, reply_to, site_url from resa_settings where client_slug in ('drevici-test','drevici-paris');
