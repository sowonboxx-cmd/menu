-- Carte « Plat en test » sans prénom (Will, Benji, les associés) : mêmes commandes et avis, aucune commission.
-- À coller une fois dans Supabase → SQL Editor → Run.
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, commission, campaign, support, place, num, path, style, note)
values ('drevici','PLAT-TEST-CARTE-TABLE-1','Carte plat en test · maison','Plat en test',null,'/plat-test','Plat en test commandé',null,'Plat en test','Carte table','table',1,'plat-test/carte-table-1','losange','Carte sans prénom : pas de commission')
on conflict (code) do nothing;
notify pgrst, 'reload schema';
