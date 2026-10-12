-- Niveaux du club (membre / VIP / staff) et carte choisie par le staff.
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. Purement additif.
alter table resa_clients add column if not exists club_tier text default 'membre'; -- membre | vip | staff
alter table resa_clients add column if not exists club_card text;                   -- navy | gold | noir (choix du staff)
