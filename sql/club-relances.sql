-- Relances automatiques « votre coupe vous attend » (J-15 et J-7 avant la fin des 30 jours).
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. Purement additif.
alter table resa_clients add column if not exists coupe_rem15_at timestamptz;
alter table resa_clients add column if not exists coupe_rem7_at  timestamptz;
