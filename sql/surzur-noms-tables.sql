-- ════════════════════════════════════════════════════════════════════
-- Surzur : remet les numéros 101…402 et empêche qu'ils repartent en « Table 1, 2… ».
-- Un ancien onglet de l'admin resté ouvert (téléphone, ordinateur) renommait les tables.
-- Le verrou ne touche que Surzur : un renommage en « Table N » y est ignoré,
-- tout autre nom (ex. 315) reste possible.
-- À coller dans Supabase → SQL Editor → Run. Sans danger si relancé.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.surzur_garde_numeros()
returns trigger language plpgsql as $$
begin
  if new.client_slug = 'drevici-surzur' and new.name ~ '^Table [0-9]+$' and coalesce(old.name, '') !~ '^Table [0-9]+$' then
    new.name := old.name;
  end if;
  return new;
end $$;
drop trigger if exists surzur_garde_numeros on public.restaurant_tables;
create trigger surzur_garde_numeros before update of name on public.restaurant_tables
  for each row execute function public.surzur_garde_numeros();

update public.restaurant_tables t set name = v.name
from (values
  ('229d043d-fa4b-59c4-8ee5-1adef919b62c'::uuid,'101'),
  ('03e0c79c-b88b-514e-be0d-3ca026f8514e'::uuid,'102'),
  ('cd84e98a-3672-5c8f-85ec-ed455fc77d42'::uuid,'103'),
  ('92b5297d-f9c4-5de2-a2b4-be39a6c98095'::uuid,'104'),
  ('599fe667-05d3-5745-9721-96553843fe1f'::uuid,'105'),
  ('07e8269e-ff9e-5866-ba7b-691d659c9ddf'::uuid,'106'),
  ('366c11d2-43de-50fc-99ce-66d9391c56b0'::uuid,'201'),
  ('6ea6253b-e7b3-5808-92d9-dc767b9564bd'::uuid,'202'),
  ('9047291b-0b08-51cc-8f8e-9f080dc222bd'::uuid,'203'),
  ('a0eb7b16-f436-52c6-a0c0-159442edb200'::uuid,'204'),
  ('74e823e3-cb38-510b-9967-f4f748453aa6'::uuid,'205'),
  ('61e2e48d-505a-57ae-b9d3-1a6ffb8291a5'::uuid,'206'),
  ('cdd296d0-ea3c-5b0d-b7df-713a1ff31348'::uuid,'301'),
  ('ae1d9cc2-d8a8-5a97-8975-8b2a0775f774'::uuid,'302'),
  ('0fed1bcf-5aff-5439-af57-c68296dfb314'::uuid,'303'),
  ('7ececfb3-b807-55cf-a165-415220360702'::uuid,'304'),
  ('47a188e2-078c-594a-ac27-38e294f14f0d'::uuid,'305'),
  ('6e94d95f-c8b6-5481-aac0-b6125235df99'::uuid,'306'),
  ('54e38d62-5a64-54d8-a21b-6dcc89733faa'::uuid,'307'),
  ('445b825a-93e1-563e-8935-b2f1d969815a'::uuid,'308'),
  ('c23adc01-d2c4-5a8a-b690-d6e831be526c'::uuid,'309'),
  ('d835af7b-8f9d-539d-baec-185758c5153f'::uuid,'310'),
  ('369bf48e-39d3-51c2-97a1-0087ceb98ffb'::uuid,'311'),
  ('1e707ead-7f82-53ab-84cf-aaf80f22e06b'::uuid,'312'),
  ('f4129a28-02b2-5dcc-b4f5-48f4f3a020f7'::uuid,'314'),
  ('8843e31a-ae3b-5787-a06f-d0d257d0091f'::uuid,'401'),
  ('bf073972-747f-5f2d-8f98-dcf7aa730fc9'::uuid,'402')
) v(id, name)
where t.id = v.id and t.client_slug = 'drevici-surzur';

-- Vérification : 27 tables, numéros 101…402
select count(*) as tables, string_agg(name, ' ' order by name) as numeros from public.restaurant_tables where client_slug = 'drevici-surzur';
