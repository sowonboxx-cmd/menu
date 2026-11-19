-- ════════════════════════════════════════════════════════════════════
-- Surzur : horaires de la saison (organisation de l'an dernier, donnée par Lauriane)
--   Fermé lundi et mardi · du mercredi au dimanche, le soir seulement, 18h–22h
--   Réservation en ligne jusqu'à 21h30 (créneaux de 18h à 21h30, toutes les 30 min)
-- Met à jour, ensemble, les horaires affichés sur le site (et les jours réservables)
-- et le service de réservation, pour qu'ils restent toujours alignés.
-- Touche le vrai site de Surzur ET sa copie de test.
-- À coller dans Supabase → SQL Editor → Run. Sans danger si relancé.
-- ════════════════════════════════════════════════════════════════════
begin;
update public.menu_data set data = jsonb_set(data, '{schedule}', '[
  {"day": "Lundi",    "services": []},
  {"day": "Mardi",    "services": []},
  {"day": "Mercredi", "services": [{"open": 18, "close": 22, "label": "Soir"}]},
  {"day": "Jeudi",    "services": [{"open": 18, "close": 22, "label": "Soir"}]},
  {"day": "Vendredi", "services": [{"open": 18, "close": 22, "label": "Soir"}]},
  {"day": "Samedi",   "services": [{"open": 18, "close": 22, "label": "Soir"}]},
  {"day": "Dimanche", "services": [{"open": 18, "close": 22, "label": "Soir"}]}
]'::jsonb), updated_at = now()
where client_slug in ('drevici-surzur', 'drevici-surzur-test');

delete from public.restaurant_services where client_slug = 'drevici-surzur';
insert into public.restaurant_services (client_slug, name, start_time, end_time, sort_order)
values ('drevici-surzur', 'Soir', '18:00', '22:00', 0);
commit;

-- Vérification : 1 service « Soir 18:00–22:00 », lundi et mardi sans service
select name, start_time, end_time from public.restaurant_services where client_slug = 'drevici-surzur';
select d->>'day' as jour, d->'services' as services from public.menu_data, jsonb_array_elements(data->'schedule') d where client_slug = 'drevici-surzur';
