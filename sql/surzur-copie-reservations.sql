-- ════════════════════════════════════════════════════════════════════
-- Surzur : qui reçoit l'email « Nouvelle réservation »
-- Exactement deux adresses : Floriane + l'adresse Gmail déjà utilisée pour Drevici
-- (reprise des réglages de Surzur ou de Paris, sans la retaper).
-- À coller dans Supabase → SQL Editor → Run. Le relancer ne change rien de plus.
-- ════════════════════════════════════════════════════════════════════

with gmail as (
  select string_agg(distinct lower(trim(x)), ', ') as e
  from public.resa_settings s, unnest(string_to_array(coalesce(s.notify_email, '') || ',' || coalesce(s.reply_to, ''), ',')) x
  where s.client_slug in ('drevici-surzur', 'drevici-paris') and lower(trim(x)) like '%@gmail.com'
),
dest as (
  select 'floriane@oceanprosarl.com' || coalesce(', ' || (select e from gmail), '') as notify
)
-- Surzur a déjà ses réglages : on met les deux adresses.
-- Surzur n'en a pas : on crée la ligne à partir de Paris (nom de Surzur, réponses des clients chez Floriane).
insert into public.resa_settings (client_slug, restaurant_name, reply_to, notify_email, site_url)
select 'drevici-surzur', 'Drevici Oyster Surzur', 'floriane@oceanprosarl.com', (select notify from dest), p.site_url
from public.resa_settings p where p.client_slug = 'drevici-paris'
on conflict (client_slug) do update set notify_email = (select notify from dest);

-- Vérification : Surzur doit montrer floriane@oceanprosarl.com et l'adresse Gmail.
select client_slug, restaurant_name, notify_email, reply_to, address, phone
from public.resa_settings
where client_slug in ('drevici-surzur', 'drevici-paris');
