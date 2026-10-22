-- QR codes du Studio : tables, scans, conversions + campagnes. À coller UNE FOIS dans Supabase → SQL Editor → Run.
-- Reprend sql/qr.sql (sans ses anciens codes d'exemple) et ajoute la nomenclature par campagne.
-- Fonctionnement :
--   1. Chaque QR imprimé pointe vers https://go.beltab.app/<CODE>.
--   2. Le Worker « qr-go » appelle qr_hit(<CODE>) : le scan est enregistré
--      (heure, appareil) et la fonction renvoie l'adresse de destination.
--   3. Le visiteur est redirigé vers cette destination, avec ?src=<CODE>.
--   4. Une réservation faite ensuite garde ce code (colonne source_code) :
--      un déclencheur crée aussitôt la conversion, visible dans La Cabine.
--   5. Les ventes hors carte et les plateaux sont ajoutés dans La Cabine
--      (« + vente ») puis validés : la commission suit la validation.

create table if not exists public.cabine_qr (
  id          uuid primary key default gen_random_uuid(),
  client_slug text not null,
  code        text not null unique,          -- ELODIE-HORSCARTE (majuscules, tirets)
  label       text,                          -- « Carte hors menu · Élodie »
  category    text not null default 'Autre', -- Hors carte, Plateaux Noël, Affiches rue, Avis Google, Réseaux, Events
  owner       text,                          -- porteur (commissions)
  destination text not null,                 -- où mène le QR (modifiable sans réimprimer)
  goal        text,                          -- ce qui compte comme conversion
  commission  text,                          -- « 10 % du plat »
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.qr_scans (
  id          bigserial primary key,
  client_slug text not null,
  code        text not null,
  at          timestamptz not null default now(),
  ua          text
);
create index if not exists qr_scans_code_at on public.qr_scans (client_slug, code, at desc);

create table if not exists public.qr_conversions (
  id           uuid primary key default gen_random_uuid(),
  client_slug  text not null,
  code         text not null,
  kind         text not null default 'vente', -- resa, vente, avis, autre
  label        text,
  amount       numeric,
  status       text not null default 'pending', -- pending, validated, refused
  ref          text,                            -- référence de réservation
  created_at   timestamptz not null default now(),
  validated_at timestamptz
);
create index if not exists qr_conv_code on public.qr_conversions (client_slug, code, created_at desc);

-- Accès : administrateurs du restaurant uniquement.
alter table public.cabine_qr      enable row level security;
alter table public.qr_scans       enable row level security;
alter table public.qr_conversions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['cabine_qr','qr_scans','qr_conversions'] loop
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated
      using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))
      with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))', t);
  end loop;
end $$;
grant select, insert, update, delete on public.cabine_qr, public.qr_scans, public.qr_conversions to authenticated;
grant usage on sequence public.qr_scans_id_seq to authenticated;

-- Le scan public : enregistre et renvoie la destination. Rien d'autre n'est lisible.
create or replace function public.qr_hit(p_code text, p_ua text default null)
returns text language plpgsql security definer set search_path = public as $$
declare d text; s text;
begin
  select destination, client_slug into d, s from public.cabine_qr where code = upper(p_code) and active;
  if d is null then return null; end if;
  insert into public.qr_scans (client_slug, code, ua) values (s, upper(p_code), left(p_ua, 300));
  return d;
end $$;
revoke all on function public.qr_hit(text, text) from public;
grant execute on function public.qr_hit(text, text) to anon, authenticated;

-- Réservations : on garde le code d'origine, et la conversion est créée aussitôt.
alter table public.restaurant_reservations add column if not exists source_code text;

create or replace function public.qr_resa_conversion()
returns trigger language plpgsql security definer set search_path = public as $$
declare s text;
begin
  if new.source_code is null or new.source_code = '' then return new; end if;
  select client_slug into s from public.cabine_qr where code = upper(new.source_code);
  if s is null then return new; end if;
  insert into public.qr_conversions (client_slug, code, kind, label, status, ref, validated_at)
  values (s, upper(new.source_code), 'resa', coalesce(new.covers::text, '?') || ' couverts · ' || coalesce(new.date_label, new.date_iso::text, ''), 'validated', new.ref, now());
  return new;
end $$;
drop trigger if exists qr_resa_conversion on public.restaurant_reservations;
create trigger qr_resa_conversion after insert on public.restaurant_reservations
  for each row execute function public.qr_resa_conversion();


-- ════════════════ Campagnes (nomenclature /qr/<campagne>/<support>-<lieu>-<numéro>) ════════════════
alter table public.cabine_qr add column if not exists campaign text;   -- « Free Oyster »
alter table public.cabine_qr add column if not exists support  text;   -- Affiche, Flyer, Carte table…
alter table public.cabine_qr add column if not exists place    text;   -- biot, clichy, ou le nom de famille
alter table public.cabine_qr add column if not exists num      int;
alter table public.cabine_qr add column if not exists path     text;   -- free-oyster/affiche-biot-1
alter table public.cabine_qr add column if not exists style    text default 'losange';
alter table public.cabine_qr add column if not exists note     text;   -- A0, vitrine de droite…
alter table public.cabine_qr add column if not exists is_test  boolean not null default false;
-- Le service des sites (clé serveur) peut aussi enregistrer les scans.
grant execute on function public.qr_hit(text, text) to service_role;

-- Le vrai QR de l'affiche Free Oyster, rue Biot (destination relative : le site qui reçoit le scan garde son domaine).
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, campaign, support, place, num, path, style, note)
values ('drevici','FREE-OYSTER-AFFICHE-BIOT-1','Affiche A0 · 8 rue Biot','Affiches rue','Will','/free-oyster','Partie jouée','Free Oyster','Affiche','biot',1,'free-oyster/affiche-biot-1','losange','Affiche A0 « FREE OYSTER · DON''T SCAN ! »')
on conflict (code) do nothing;
-- Quelques QR de test (pour voir le Studio rempli) : marqués « (test) ».
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, campaign, support, place, num, path, style, is_test) values
  ('drevici','MENU-CARTE-TABLE-1','Carte de table n° 1 (test)','Autre','Restaurant','/','Réservation','Menu','Carte table','salle',1,'menu/carte-table-1','rond',true),
  ('drevici','CLUB-CHEVALET-CAISSE-1','Chevalet caisse · club (test)','Autre','Restaurant','/?carte=1','Inscription au club','Club','Chevalet','caisse',1,'club/chevalet-caisse-1','liquide',true),
  ('drevici','HALLOWEEN-FLYER-BIOT-1','Flyer Halloween (test)','Events','Will','/book','Réservation Halloween','Halloween','Flyer','biot',1,'halloween/flyer-biot-1','etoile',true),
  ('drevici','MENU-SERVEUR-MARTIN-1','Carte hors menu · serveur (test)','Hors carte','Martin','/','Commande hors carte','Menu','Serveur','martin',1,'menu/serveur-martin-1','croix',true)
on conflict (code) do nothing;
notify pgrst, 'reload schema';
