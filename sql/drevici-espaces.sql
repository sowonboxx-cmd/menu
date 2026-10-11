-- Espaces et places de Drevici Oyster (vraie résa : drevici-paris). À coller une fois dans Supabase → SQL Editor → Run.
-- Une « table » par espace avec le nombre de places ; à découper ensuite dans /gestion si besoin.
-- ⚠️ La terrasse est à retirer après le 31 octobre (dans /gestion → Salle, espaces et tables).
with s as (
  insert into restaurant_spaces (client_slug, name, sort_order) values
    ('drevici-paris', 'Fenêtres', 10),
    ('drevici-paris', 'Murs', 11),
    ('drevici-paris', 'Salle (milieu)', 12),
    ('drevici-paris', 'Bar', 13),
    ('drevici-paris', 'Terrasse', 14)
  returning id, name
)
insert into restaurant_tables (client_slug, space_id, name, seats)
select 'drevici-paris', id, 'Places',
  case name when 'Fenêtres' then 4 when 'Murs' then 6 when 'Salle (milieu)' then 6 when 'Bar' then 5 when 'Terrasse' then 12 end
from s;
