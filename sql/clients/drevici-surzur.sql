-- ════════════════════════════════════════════════════════════════
-- Drevici Oyster SURZUR : création à partir de Paris
-- Supabase → SQL Editor → coller tout → Run. Une seule fois (sans risque à relancer).
--
-- AUCUNE ligne de Paris n'est modifiée ni supprimée : ce script ne fait que COPIER
-- vers le nouvel établissement « drevici-surzur », et seulement si Surzur n'a encore rien.
-- Le club reste commun (« drevici-paris ») : rien à faire pour lui.
-- ════════════════════════════════════════════════════════════════

-- 0) Copie de secours du menu de Paris (au cas où), dans l'historique des versions
insert into menu_data_history (client_slug, data)
select client_slug, data from menu_data where client_slug = 'drevici';

-- 1) La carte : copie de celle de Paris, avec l'adresse, le téléphone et les horaires de Surzur
--    (lundi → vendredi 9h–12h et 14h–17h, fermé le week-end, comme sur Google)
insert into menu_data (client_slug, data)
select 'drevici-surzur',
       jsonb_set(jsonb_set(jsonb_set(data,
         '{address}', coalesce(data->'address','{}'::jsonb) || jsonb_build_object(
            'street','Pentes','zip','56450','city','Surzur','phone','0602634929',
            'mapsUrl','https://maps.app.goo.gl/CYCVbQsA2EW2hoSa9')),
         '{restaurantName}', to_jsonb(coalesce(data->>'restaurantName','DREVICI OYSTER'))),
         '{schedule}', '[{"day":"Lundi","services":[{"label":"Matin","open":9,"close":12},{"label":"Après-midi","open":14,"close":17}]},{"day":"Mardi","services":[{"label":"Matin","open":9,"close":12},{"label":"Après-midi","open":14,"close":17}]},{"day":"Mercredi","services":[{"label":"Matin","open":9,"close":12},{"label":"Après-midi","open":14,"close":17}]},{"day":"Jeudi","services":[{"label":"Matin","open":9,"close":12},{"label":"Après-midi","open":14,"close":17}]},{"day":"Vendredi","services":[{"label":"Matin","open":9,"close":12},{"label":"Après-midi","open":14,"close":17}]},{"day":"Samedi","services":[]},{"day":"Dimanche","services":[]}]'::jsonb)
from menu_data
where client_slug = 'drevici'
  and not exists (select 1 from menu_data where client_slug = 'drevici-surzur');

-- 2) Réglages des emails de réservation : copie de Paris (mêmes destinataires), adresse de Surzur
do $$
declare cols text;
begin
  if not exists (select 1 from resa_settings where client_slug = 'drevici-surzur') then
    select string_agg(quote_ident(column_name), ',') into cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'resa_settings' and column_name <> 'client_slug';
    execute format('insert into resa_settings (client_slug,%s) select %L,%s from resa_settings where client_slug = %L',
                   cols, 'drevici-surzur', cols, 'drevici-paris');
    update resa_settings
       set restaurant_name = 'Drevici Oyster Surzur',
           address = 'Pentes, 56450 Surzur',
           phone = '06 02 63 49 29',
           site_url = 'https://drevici-surzur.beltab.app'
     where client_slug = 'drevici-surzur';
  end if;
end $$;

-- 3) Salle et tables : copie de Paris (à adapter ensuite dans /admin de Surzur). Services : matin et après-midi.
do $$
declare sp record; nid uuid;
begin
  if not exists (select 1 from restaurant_spaces where client_slug = 'drevici-surzur') then
    for sp in select * from restaurant_spaces where client_slug = 'drevici-paris' order by sort_order loop
      insert into restaurant_spaces (client_slug, name, sort_order)
      values ('drevici-surzur', sp.name, sp.sort_order) returning id into nid;
      insert into restaurant_tables (client_slug, space_id, name, seats)
      select 'drevici-surzur', nid, t.name, t.seats
      from restaurant_tables t where t.client_slug = 'drevici-paris' and t.space_id = sp.id;
    end loop;
  end if;
  if not exists (select 1 from restaurant_services where client_slug = 'drevici-surzur') then
    insert into restaurant_services (client_slug, name, start_time, end_time, sort_order) values
      ('drevici-surzur', 'Matin', '09:00', '12:00', 0),
      ('drevici-surzur', 'Après-midi', '14:00', '17:00', 1);
  end if;
end $$;

-- 4) Accès /admin : les mêmes personnes que pour Paris
insert into public.restaurant_admins (user_id, client_slug)
select distinct a.user_id, 'drevici-surzur'
from public.restaurant_admins a
where a.client_slug in ('drevici', 'drevici-paris')
  and not exists (select 1 from public.restaurant_admins x where x.user_id = a.user_id and x.client_slug = 'drevici-surzur');

-- Vérification : tout doit être à « true », et Paris n'a pas bougé
select 'carte Surzur' as quoi, exists(select 1 from menu_data where client_slug = 'drevici-surzur')::text as resultat
union all select 'emails Surzur', exists(select 1 from resa_settings where client_slug = 'drevici-surzur')::text
union all select 'tables Surzur', (select count(*) from restaurant_tables where client_slug = 'drevici-surzur')::text
union all select 'services Surzur', (select count(*) from restaurant_services where client_slug = 'drevici-surzur')::text
union all select 'accès admin Surzur', (select count(*) from restaurant_admins where client_slug = 'drevici-surzur')::text
union all select 'carte Paris toujours là', exists(select 1 from menu_data where client_slug = 'drevici')::text
union all select 'réservations Paris', (select count(*) from restaurant_reservations where client_slug = 'drevici-paris')::text;
