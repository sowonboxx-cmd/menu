-- QR codes traçables : codes, scans, conversions.
-- À coller une fois dans Supabase → SQL Editor → Run (après cabine.sql).
--
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

-- Premiers codes (modifiables ensuite dans La Cabine → Scans QR).
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, commission) values
  ('drevici','RESA-INSTAGRAM','Instagram · lien en bio et stories','Réseaux','Will','https://drevici.beltab.app/resa','Réservation',null),
  ('drevici','RESA-TIKTOK','TikTok · lien en bio','Réseaux','Will','https://drevici.beltab.app/resa','Réservation',null),
  ('drevici','ELODIE-HORSCARTE','Menu hors carte · Élodie','Hors carte','Élodie','https://drevici.beltab.app/','Commande hors carte','10 % du plat'),
  ('drevici','VINCE-HORSCARTE','Menu hors carte · Vince','Hors carte','Vince','https://drevici.beltab.app/','Commande hors carte','10 % du plat'),
  ('drevici','BENJI-HORSCARTE','Menu hors carte · Benji','Hors carte','Benji','https://drevici.beltab.app/','Commande hors carte','10 % du plat'),
  ('drevici','ETIENNE-HORSCARTE','Menu hors carte · Étienne','Hors carte','Étienne','https://drevici.beltab.app/','Commande hors carte','10 % du plat'),
  ('drevici','AVIS-CAISSE','Chevalet près de la caisse','Avis Google','Restaurant','https://maps.app.goo.gl/gfcvWMf6WfKAcEh96','Avis Google',null),
  ('drevici','AFFICHE-RESERVEZ','Affiche de rue « Venez réserver »','Affiches rue','Will','https://drevici.beltab.app/resa','Réservation',null),
  ('drevici','EVENT-HALLOWEEN','Affiche Halloween (31 oct.)','Events','Will','https://drevici.beltab.app/resa','Réservation Halloween',null)
on conflict (code) do nothing;
