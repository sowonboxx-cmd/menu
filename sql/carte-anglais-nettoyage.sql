-- ════════════════════════════════════════════════════════════════
-- CARTE ANGLAISE — NETTOYAGE (aucune traduction imposée)
-- À coller dans Supabase → SQL Editor → Run. Relançable sans risque.
--
-- Pourquoi : le site retombe sur le français tout seul quand l'anglais
-- est vide (fonction t() : obj[lang] || obj.fr). Un champ anglais VIDE
-- affiche donc le français — le bon comportement pour « Sauvignon »,
-- « Pastis » ou « Spritz ». Le problème, ce sont les champs qui portent
-- une valeur FAUSSE et empêchent ce repli.
--
-- Ce script VIDE uniquement ces valeurs-là, dans le nom anglais :
--   • les placeholders « New dish » et « New drink »
--   • 4 noms hérités du gabarit, qui désignent autre chose :
--       Champagne la Maison Fricot  →  « Champagne brut »
--       Pétillant Saumur            →  « Crémant d Alsace »
--       Breizh Cola / Cola Zero     →  « Mineral water »
--       Jus de Pomme breton         →  « Coffee »
--
-- Il travaille sur la carte TELLE QU'ELLE EST en base au moment où on
-- le lance : les modifications faites dans /admin juste avant sont
-- conservées. Il ne touche ni au français, ni aux prix, ni aux images,
-- ni aux traductions anglaises correctes.
-- ════════════════════════════════════════════════════════════════

create or replace function pg_temp.nettoie_article(x jsonb) returns jsonb
language sql immutable as $f$
  select case
    when jsonb_typeof(x) = 'object'
     and jsonb_typeof(x->'name') = 'object'
     and (
          lower(btrim(coalesce(x->'name'->>'en',''))) in ('new dish','new drink')
       or (btrim(x->'name'->>'fr'), btrim(x->'name'->>'en')) in (
            ('Champagne la Maison Fricot', 'Champagne brut'),
            ('Pétillant Saumur',           'Crémant d''Alsace'),
            ('Breizh Cola / Cola Zero',    'Mineral water'),
            ('Jus de Pomme breton',        'Coffee'))
     )
    then jsonb_set(x, '{name,en}', '""'::jsonb)
    else x
  end
$f$;

create or replace function pg_temp.nettoie_liste(a jsonb) returns jsonb
language sql immutable as $f$
  select coalesce(jsonb_agg(pg_temp.nettoie_article(e) order by i), '[]'::jsonb)
    from jsonb_array_elements(a) with ordinality as t(e, i)
$f$;

create or replace function pg_temp.nettoie_carte(card jsonb) returns jsonb
language sql immutable as $f$
  select card
    || case when jsonb_typeof(card->'dishes') = 'array'
            then jsonb_build_object('dishes', pg_temp.nettoie_liste(card->'dishes')) else '{}'::jsonb end
    || case when jsonb_typeof(card->'items') = 'array'
            then jsonb_build_object('items',  pg_temp.nettoie_liste(card->'items'))  else '{}'::jsonb end
$f$;

create or replace function pg_temp.nettoie_onglet(tab jsonb) returns jsonb
language sql immutable as $f$
  select case when jsonb_typeof(tab->'cards') = 'array'
    then tab || jsonb_build_object('cards',
           (select coalesce(jsonb_agg(pg_temp.nettoie_carte(c) order by i), '[]'::jsonb)
              from jsonb_array_elements(tab->'cards') with ordinality as t(c, i)))
    else tab end
$f$;

update public.menu_data m
   set data = m.data || jsonb_build_object('tabs',
         (select jsonb_agg(pg_temp.nettoie_onglet(tb) order by i)
            from jsonb_array_elements(m.data->'tabs') with ordinality as t(tb, i))),
       updated_at = now()
 where m.client_slug in ('drevici', 'drevici-surzur')
   and jsonb_typeof(m.data->'tabs') = 'array';

-- Vérification : « placeholders » et « noms_faux » doivent valoir 0.
select client_slug,
       count(*) filter (where x->'name'->>'en' like 'New %') as placeholders,
       count(*) filter (where x->'name'->>'en' in ('Mineral water','Coffee','Champagne brut','Crémant d''Alsace')) as noms_faux,
       count(*) filter (where coalesce(x->'name'->>'en','') <> '') as noms_en_corrects
  from public.menu_data m,
       jsonb_array_elements(m.data->'tabs') t,
       jsonb_array_elements(coalesce(t->'cards','[]'::jsonb)) c,
       jsonb_array_elements(coalesce(c->'dishes','[]'::jsonb) || coalesce(c->'items','[]'::jsonb)) x
 where m.client_slug in ('drevici','drevici-surzur')
 group by client_slug order by client_slug;
