-- ════════════════════════════════════════════════════════════════
-- Club (inscription depuis le site) — à coller UNE FOIS dans Supabase → SQL Editor → Run.
-- Purement additif : ajoute des colonnes à la base clients, ne supprime rien.
-- ════════════════════════════════════════════════════════════════
alter table resa_clients add column if not exists club_member    boolean default false;
alter table resa_clients add column if not exists club_code      text;      -- ex. CLUB-4F7K
alter table resa_clients add column if not exists club_no        int;       -- n° de membre (1, 2, 3…)
alter table resa_clients add column if not exists club_joined_at timestamptz;
alter table resa_clients add column if not exists club_show      boolean default true; -- visible dans la liste des membres
alter table resa_clients add column if not exists coupe_used_at  timestamptz;          -- coupe offerte validée
alter table resa_clients add column if not exists source         text;                 -- canal / code d'arrivée (INSTA-BIO, CLUB-RUEBIOT…)

create unique index if not exists resa_clients_club_code on resa_clients (client_slug, club_code) where club_code is not null;
