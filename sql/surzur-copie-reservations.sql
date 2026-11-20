-- ════════════════════════════════════════════════════════════════════
-- Surzur : Floriane en copie des nouvelles réservations
-- À coller dans Supabase → SQL Editor → Run.
--
-- Qui reçoit l'email « Nouvelle réservation » : la colonne notify_email de resa_settings
-- (plusieurs adresses possibles, séparées par des virgules).
-- Ce script ajoute à Surzur les admins qui ne sont admins QUE de Surzur (donc Floriane, pas Will),
-- sans retirer les adresses déjà présentes. Le relancer ne crée pas de doublon.
-- ════════════════════════════════════════════════════════════════════

-- 1. Ajout (seulement si Surzur a déjà ses réglages de réservation)
update public.resa_settings s
set notify_email = (
  select string_agg(distinct e, ', ')
  from (
    select trim(x) as e from unnest(string_to_array(coalesce(s.notify_email, ''), ',')) x where trim(x) <> ''
    union
    select lower(u.email) from public.restaurant_admins a join auth.users u on u.id = a.user_id
    where a.client_slug = 'drevici-surzur'
      and not exists (select 1 from public.restaurant_admins p where p.user_id = a.user_id and p.client_slug in ('drevici', 'drevici-paris'))
  ) t
)
where s.client_slug = 'drevici-surzur';

-- 2. Vérification : qui reçoit les réservations à Surzur et à Paris.
--    Aucune ligne « drevici-surzur » = Surzur n'a pas de réglages : personne n'est prévenu, dites-le à Claude.
select client_slug, restaurant_name, notify_email, reply_to
from public.resa_settings
where client_slug in ('drevici-surzur', 'drevici-paris');
