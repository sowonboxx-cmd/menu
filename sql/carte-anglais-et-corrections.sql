-- ════════════════════════════════════════════════════════════════
-- CARTE DREVICI — TRADUCTION ANGLAISE + CORRECTIONS DU FRANÇAIS
-- À coller dans Supabase → SQL Editor → Run. Relançable sans risque.
-- Paris et Surzur. Travaille sur la carte telle qu'elle est en base
-- au moment du lancement : rien d'autre n'est touché (prix, photos,
-- ordre, plats ajoutés depuis).
--
-- Français corrigé :
--   Planche de charcuterie : « filet mignon fumée » → fumé
--   Gambas : « 6 gambas accompagnés » → accompagnées
--   Caviar de nori : « imcomparable » → incomparable, « breton! » → « breton ! »
--   Côte du Rhône → Côtes-du-Rhône
-- Anglais : noms, descriptions, titres d'onglets et de sections.
-- Noms propres et vins laissés vides en anglais : le site affiche
-- alors le français (Capitaine, Matelot, Sauvignon, Pastis…).
-- Le site reste en français : l'anglais attend la bascule automatique.
-- ════════════════════════════════════════════════════════════════

create or replace function pg_temp.m() returns jsonb language sql immutable as $f$
  select $m${"items": {"Huîtres natures n°4": {"en": "Raw oysters n°4 (S)", "den": "Served with bread, butter, lemon and/or shallot vinegar"}, "Huîtres natures n°3": {"en": "Raw oysters n°3 (M)", "den": "Served with bread, butter, lemon and/or shallot vinegar"}, "Huîtres natures n°2": {"en": "Raw oysters n°2 (L)", "den": "Served with bread, butter, lemon and/or shallot vinegar"}, "Huîtres gratinées": {"en": "Golden gratin oysters", "den": "Baked with herb butter and a crispy breadcrumb topping, served hot"}, "Planche de charcuterie bretonne": {"en": "Breton charcuterie platter", "den": "Ham saucisson, Breton andouille, smoked pork tenderloin", "dfr": "Saucisson de jambon, andouille bretonne, filet mignon fumé"}, "Gambas de Madagascar": {"en": "King prawns from Madagascar", "den": "6 king prawns with homemade seaweed mayonnaise", "dfr": "6 gambas accompagnées d'une “mayonnalgue” maison"}, "Bulots": {"en": "Whelks", "den": "200g of whelks with homemade seaweed mayonnaise"}, "Soupe de Poisson": {"en": "Fish soup", "den": "Rich and full of flavour, served with homemade croutons and grated cheese"}, "Hampe de bœuf": {"en": "Beef skirt steak", "den": "With shallot sauce and fries"}, "Capitaine": {"en": "", "den": "12 n°3 oysters, 200g of whelks, 6 king prawns from Madagascar"}, "Duo champagne": {"en": "Champagne duo", "den": "12 n°3 oysters, 2 glasses of champagne"}, "Drevici": {"en": "", "den": "12 n°3 oysters, Breton charcuterie, king prawns, whelks and a spread"}, "Solo champagne": {"en": "Champagne solo", "den": "6 n°3 oysters, 1 glass of champagne"}, "Mousaillon": {"en": "", "den": "6 n°3 oysters, 4 king prawns from Madagascar"}, "Matelot": {"en": "", "den": "3 n°3 oysters, 50g of whelks, 3 king prawns from Madagascar"}, "Truite de Bretagne": {"en": "Breton trout", "den": "Made from trout raised, filleted and smoked in Brittany"}, "Saint-Jacques à la bretonne": {"en": "Breton-style scallops", "den": "Delicate scallop rillettes, cooked the Breton way"}, "Homard Bleu": {"en": "Blue lobster", "den": "The tender, refined meat of blue lobster (30%), a treat for food lovers"}, "Maquereau au Poivre de Sichuan": {"en": "Mackerel with Sichuan pepper", "den": "Highly aromatic, a recipe that takes you travelling over an aperitif"}, "Sardines au Piment d'Espelette": {"en": "Sardines with Espelette pepper", "den": "Rich in sardine fillets (62%), ring-net caught in Brittany"}, "Ormeaux de l'île de Groix": {"en": "Abalone from Île de Groix", "den": "A subtle, unique recipe with the incomparable flavour of abalone"}, "Dorade Combava & Gingembre": {"en": "Sea bream, kaffir lime & ginger", "den": "Rich in sea bream (35%) from Breton fisheries"}, "Soleil": {"en": "Roasted peppers & paprika", "den": "Seaweed tartare (4 seaweeds) with roasted peppers and paprika"}, "Nature": {"en": "Plain", "den": "Excellent with cheese, or straight on an oyster"}, "Pomme et Miel": {"en": "Apple & honey", "den": "Perfect on warm goat's cheese toast, or with sheep's milk tomme"}, "Caviar de nori": {"en": "Nori caviar", "den": "Nori is Brittany's black gold! A seaweed of unrivalled delicacy, hard to harvest and dry", "dfr": "La Nori est l'or noir breton ! C'est une algue d'une finesse incomparable, difficile à récolter et à sécher"}, "Sauvignon": {"en": ""}, "Chardonnay": {"en": ""}, "Viognier": {"en": ""}, "Chablis": {"en": ""}, "Côte du Rhône": {"en": "Côtes du Rhône", "fr": "Côtes-du-Rhône"}, "Côtes-du-Rhône": {"en": "Côtes du Rhône"}, "Pinot Noir": {"en": ""}, "Rosé": {"en": ""}, "Liqueur de Citron ou de Menthe": {"en": "Lemon or mint liqueur"}, "Gin, Rhum, Esprit Malt": {"en": "Gin, rum, malt spirit"}, "Pastis": {"en": ""}, "Champagne la Maison Fricot": {"en": "Champagne Maison Fricot"}, "Pétillant Saumur": {"en": "Saumur sparkling wine"}, "La Blonde 5,5°": {"en": "Blonde beer 5.5%"}, "La IPA 6°": {"en": "IPA 6%"}, "Spritz": {"en": ""}, "Breizh Cola / Cola Zero": {"en": ""}, "Jus de Pomme breton": {"en": "Breton apple juice"}, "Ginger Beer": {"en": "Ginger beer"}, "Tonic": {"en": ""}}, "tabs": {"Huîtres": "Oysters", "Terre & mer": "Land & Sea", "Plateaux": "Platters", "Tartinades": "Spreads", "Boissons": "Drinks"}, "cards": {"": "", "À partager": "To share", "Plaisir solitaire": "Just for you", "Rillettes de poissons": "Seafood rillettes", "Tartare d'algues": "Seaweed tartare", "Vins blancs": "White wines", "Vins rouges et rosé": "Red & rosé wines", "Les spiritueux artisanaux": "Craft spirits", "Bulles": "Sparkling", "Les bières": "Beers", "Cocktails": "Cocktails", "Softs": "Soft drinks"}}$m$::jsonb
$f$;

create or replace function pg_temp.lab(l jsonb, en text) returns jsonb language sql immutable as $f$
  select case when en is null then l
              when jsonb_typeof(l)='object' then jsonb_set(l,'{en}',to_jsonb(en))
              else jsonb_build_object('fr',coalesce(l#>>'{}',''),'en',en) end
$f$;

create or replace function pg_temp.article(x jsonb) returns jsonb language plpgsql immutable as $f$
declare k text; r jsonb;
begin
  if jsonb_typeof(x)<>'object' or jsonb_typeof(x->'name')<>'object' then return x; end if;
  k := btrim(x->'name'->>'fr');
  r := pg_temp.m()->'items'->k;
  if r is null then return x; end if;
  if r ? 'fr'  then x := jsonb_set(x,'{name,fr}',r->'fr'); end if;
  if r ? 'en'  then x := jsonb_set(x,'{name,en}',r->'en'); end if;
  if r ? 'dfr' and jsonb_typeof(x->'desc')='object' then x := jsonb_set(x,'{desc,fr}',r->'dfr'); end if;
  if r ? 'den' and coalesce(btrim(x->'desc'->>'fr'),'')<>'' then
    x := jsonb_set(case when jsonb_typeof(x->'desc')='object' then x else x||jsonb_build_object('desc',jsonb_build_object('fr',x->>'desc')) end,
                   '{desc,en}',r->'den');
  end if;
  return x;
end $f$;

create or replace function pg_temp.liste(a jsonb) returns jsonb language sql immutable as $f$
  select coalesce(jsonb_agg(pg_temp.article(e) order by i),'[]'::jsonb) from jsonb_array_elements(a) with ordinality t(e,i)
$f$;

create or replace function pg_temp.carte(c jsonb) returns jsonb language sql immutable as $f$
  select c
    || case when jsonb_typeof(c->'dishes')='array' then jsonb_build_object('dishes',pg_temp.liste(c->'dishes')) else '{}'::jsonb end
    || case when jsonb_typeof(c->'items')='array'  then jsonb_build_object('items', pg_temp.liste(c->'items'))  else '{}'::jsonb end
    || case when c ? 'label' then jsonb_build_object('label',pg_temp.lab(c->'label',pg_temp.m()->'cards'->>btrim(coalesce(c->'label'->>'fr',c->>'label','')))) else '{}'::jsonb end
$f$;

create or replace function pg_temp.onglet(t jsonb) returns jsonb language sql immutable as $f$
  select t
    || case when jsonb_typeof(t->'cards')='array' then jsonb_build_object('cards',
         (select coalesce(jsonb_agg(pg_temp.carte(c) order by i),'[]'::jsonb) from jsonb_array_elements(t->'cards') with ordinality s(c,i))) else '{}'::jsonb end
    || case when t ? 'label' and t->>'visible' is distinct from 'false'
            then jsonb_build_object('label',pg_temp.lab(t->'label',pg_temp.m()->'tabs'->>btrim(coalesce(t->'label'->>'fr','')))) else '{}'::jsonb end
$f$;

update public.menu_data m
   set data = m.data || jsonb_build_object('tabs',
         (select jsonb_agg(pg_temp.onglet(tb) order by i) from jsonb_array_elements(m.data->'tabs') with ordinality t(tb,i))),
       updated_at = now()
 where m.client_slug in ('drevici','drevici-surzur') and jsonb_typeof(m.data->'tabs')='array';

-- Vérification : une ligne par carte, « fautes » doit valoir 0.
select client_slug,
       count(*) filter (where x->'desc'->>'fr' ~ 'imcomparable|mignon fumée|gambas accompagnés' or x->'name'->>'fr'='Côte du Rhône') as fautes,
       count(*) filter (where coalesce(x->'name'->>'en','')<>'') as noms_anglais,
       count(*) filter (where coalesce(x->'desc'->>'en','')<>'') as descriptions_anglaises
  from public.menu_data m, jsonb_array_elements(m.data->'tabs') t,
       jsonb_array_elements(coalesce(t->'cards','[]'::jsonb)) c,
       jsonb_array_elements(coalesce(c->'dishes','[]'::jsonb)||coalesce(c->'items','[]'::jsonb)) x
 where m.client_slug in ('drevici','drevici-surzur') and coalesce(x->>'hidden','false')<>'true'
 group by client_slug order by 1;
