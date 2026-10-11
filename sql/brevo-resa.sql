-- ════════════════════════════════════════════════════════════════
-- Réservations → emails et SMS Brevo (Worker resa-notify)
-- À coller UNE FOIS dans Supabase → SQL Editor → Run.
-- Purement additif : ne supprime ni ne modifie aucune donnée existante.
-- ════════════════════════════════════════════════════════════════

-- 1) Colonnes de suivi sur les réservations existantes
alter table restaurant_reservations add column if not exists created_at       timestamptz default now();
alter table restaurant_reservations add column if not exists confirm_sent_at  timestamptz;
alter table restaurant_reservations add column if not exists reminder_sent_at timestamptz;
alter table restaurant_reservations add column if not exists reminder_channel text;      -- 'sms' | 'email' | 'none'
alter table restaurant_reservations add column if not exists marketing_optin  boolean default false;

-- 2) Réglages par restaurant (un par client_slug de réservation)
create table if not exists resa_settings (
  client_slug            text primary key,
  restaurant_name        text not null,
  reply_to               text,            -- adresse du resto : les réponses des clients arrivent ici
  notify_email           text,            -- reçoit l'alerte « nouvelle réservation »
  address                text,
  phone                  text,
  site_url               text,
  sms_reminders          boolean default true,
  sms_reminder_limit     int     default 500,   -- rappels SMS inclus / mois (à la charge de Beltab)
  sms_marketing_included int     default 200,   -- SMS marketing inclus / mois (Master)
  sms_marketing_credits  int     default 0,     -- packs achetés (n'expirent pas)
  active                 boolean default true
);

-- 3) Base clients (alimentée automatiquement à chaque réservation)
create table if not exists resa_clients (
  id              bigserial primary key,
  client_slug     text not null,
  email           text not null,
  phone           text,
  name            text,
  visits          int default 1,
  first_seen      timestamptz default now(),
  last_seen       timestamptz default now(),
  marketing_optin boolean default false,
  unique (client_slug, email)
);

-- 4) Compteur SMS par resto et par mois (« 2026-10 »)
create table if not exists sms_usage (
  client_slug text not null,
  month       text not null,
  reminders   int default 0,
  marketing   int default 0,
  alert_sent  boolean default false,
  primary key (client_slug, month)
);

-- Ces trois tables ne sont lisibles / modifiables que par le Worker (clé service).
alter table resa_settings enable row level security;
alter table resa_clients  enable row level security;
alter table sms_usage     enable row level security;

-- 5) Ajout / mise à jour d'un client (une visite de plus)
create or replace function resa_upsert_client(p_slug text, p_email text, p_phone text, p_name text, p_optin boolean)
returns void language sql security definer as $$
  insert into resa_clients (client_slug, email, phone, name, marketing_optin)
  values (p_slug, lower(trim(p_email)), nullif(p_phone,''), p_name, coalesce(p_optin,false))
  on conflict (client_slug, email) do update set
    visits = resa_clients.visits + 1,
    last_seen = now(),
    phone = coalesce(excluded.phone, resa_clients.phone),
    name = coalesce(excluded.name, resa_clients.name),
    marketing_optin = resa_clients.marketing_optin or excluded.marketing_optin;
$$;

-- 6) Prend 1 SMS dans le quota du mois. Renvoie false si la limite est atteinte.
create or replace function sms_take(p_slug text, p_kind text, p_limit int)
returns boolean language plpgsql security definer as $$
declare m text := to_char(now() at time zone 'Europe/Paris','YYYY-MM'); n int;
begin
  insert into sms_usage (client_slug, month) values (p_slug, m) on conflict do nothing;
  if p_kind = 'reminders' then
    update sms_usage set reminders = reminders + 1
      where client_slug = p_slug and month = m and reminders < p_limit returning reminders into n;
  else
    update sms_usage set marketing = marketing + 1
      where client_slug = p_slug and month = m and marketing < p_limit returning marketing into n;
  end if;
  return n is not null;
end $$;

revoke all on function resa_upsert_client(text,text,text,text,boolean) from public, anon, authenticated;
revoke all on function sms_take(text,text,int) from public, anon, authenticated;

-- Droits du Worker (clé service) : sur les projets Supabase récents, ils ne sont pas donnés automatiquement.
grant select, insert, update on resa_settings, resa_clients, sms_usage to service_role;
grant usage, select on sequence resa_clients_id_seq to service_role;
grant select, update on restaurant_reservations to service_role;
grant execute on function resa_upsert_client(text,text,text,text,boolean) to service_role;
grant execute on function sms_take(text,text,int) to service_role;
grant select on restaurant_admins to service_role;

-- 7) Restaurant de TEST (la résa de la préview écrit sous « drevici-test »).
--    ⚠️ Remplace les deux adresses par la tienne avant de lancer.
insert into resa_settings (client_slug, restaurant_name, reply_to, notify_email, address, phone, site_url)
values ('drevici-test', 'Drevici Oyster', 'REMPLACE_PAR_TON_EMAIL', 'REMPLACE_PAR_TON_EMAIL',
        '8 rue Biot, 75017 Paris', '09 74 64 05 87', 'https://drevicioyster.com')
on conflict (client_slug) do nothing;
