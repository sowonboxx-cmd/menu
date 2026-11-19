-- ════════════════════════════════════════════════════════════════════
-- Publication de la carte de Surzur : copie la carte préparée en test vers le VRAI site.
-- À lancer seulement après « publie ». Ne touche qu'aux onglets et aux incontournables
-- (le plan de salle, les horaires et le reste restent ceux du vrai site).
-- ════════════════════════════════════════════════════════════════════
update public.menu_data m
set data = jsonb_set(jsonb_set(m.data, '{tabs}', t.data->'tabs'), '{pinnedDishes}', t.data->'pinnedDishes'), updated_at = now()
from public.menu_data t
where m.client_slug = 'drevici-surzur' and t.client_slug = 'drevici-surzur-test';
select t->'label'->>'fr' as onglet from public.menu_data, jsonb_array_elements(data->'tabs') t where client_slug = 'drevici-surzur';
