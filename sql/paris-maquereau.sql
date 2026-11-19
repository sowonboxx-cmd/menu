-- ════════════════════════════════════════════════════════════════════
-- Paris : les rillettes de maquereau servies sont celles « au poivre de Sichuan »
-- (la photo était déjà la bonne, le nom et la description étaient ceux du maquereau fumé).
-- Change seulement le nom et la description de ce plat sur le vrai site de Paris.
-- À coller dans Supabase → SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════════
update public.menu_data
set data = jsonb_set(jsonb_set(data,
      '{tabs,3,cards,0,dishes,4,name}', '{"fr": "Maquereau au poivre de Sichuan", "en": "Mackerel with Sichuan pepper"}'::jsonb),
      '{tabs,3,cards,0,dishes,4,desc}', '{"fr": "Associée au poivre de Sichuan, un poivre très aromatique, cette recette riche en filets de maquereau (56 %) vous fera voyager le temps d’un apéritif.", "en": "Paired with Sichuan pepper, a highly aromatic pepper, this recipe rich in mackerel fillets (56%) will take you on a journey over an aperitif."}'::jsonb),
    updated_at = now()
where client_slug = 'drevici'
  and data #>> '{tabs,3,cards,0,dishes,4,_pid}' = 'd_mr42kcb2onaq1g';

-- Vérification : doit afficher « Maquereau au poivre de Sichuan »
select data #>> '{tabs,3,cards,0,dishes,4,name,fr}' as plat from public.menu_data where client_slug = 'drevici';
