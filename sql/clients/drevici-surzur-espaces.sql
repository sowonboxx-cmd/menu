-- Surzur : deux espaces seulement, Intérieur et Extérieur, sans tables pour l'instant
-- (pas encore de chiffres). Sans tables, la réservation ne bloque aucun créneau pour la capacité.
-- Paris n'est pas touché.

delete from restaurant_tables where client_slug = 'drevici-surzur';
delete from restaurant_spaces where client_slug = 'drevici-surzur';

insert into restaurant_spaces (client_slug, name, sort_order) values
  ('drevici-surzur', 'Intérieur', 0),
  ('drevici-surzur', 'Extérieur', 1);

-- Vérification
select 'espaces Surzur' as quoi, (select string_agg(name, ', ' order by sort_order) from restaurant_spaces where client_slug = 'drevici-surzur') as resultat
union all select 'tables Surzur', (select count(*) from restaurant_tables where client_slug = 'drevici-surzur')::text
union all select 'espaces Paris', (select count(*) from restaurant_spaces where client_slug = 'drevici-paris')::text
union all select 'tables Paris', (select count(*) from restaurant_tables where client_slug = 'drevici-paris')::text;
