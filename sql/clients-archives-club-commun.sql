-- Page Clients : archives, désinscrits datés, club commun Paris / Surzur.
-- À lancer au moment de « publie » (pas avant : l'admin en ligne ne connaît pas encore ces nouveautés).

-- 1. Date d'archivage (client retiré de la liste, gardé dans la base) et date de désinscription (« ne pas contacter »)
alter table public.resa_clients add column if not exists archived_at timestamptz;
alter table public.resa_clients add column if not exists unsub_at timestamptz;

-- Les désinscrits d'avant (case décochée via le lien de désinscription) : on ne connaît pas la date exacte,
-- on ne les invente pas. Seules les prochaines désinscriptions seront datées.

-- 2. Club commun : Surzur utilise le club de Paris (même carte, même statut staff, même coupe)
alter table public.resa_settings add column if not exists club_slug text;
update public.resa_settings set club_slug = 'drevici-paris' where client_slug = 'drevici-surzur';

-- Vérification
select client_slug, club_slug from public.resa_settings where client_slug in ('drevici-paris', 'drevici-surzur');
select count(*) filter (where archived_at is not null) as archives, count(*) filter (where unsub_at is not null) as desinscrits_dates
from public.resa_clients;
