-- Jeu Free Oyster : droits du serveur (resa.beltab.app) sur les tables du jeu.
-- À coller une fois dans Supabase → SQL Editor → Run (après jeu-free-oyster.sql).
grant select, insert, update, delete on public.jeu_config, public.jeu_players, public.jeu_plays to service_role;
grant usage, select on sequence public.jeu_players_id_seq, public.jeu_plays_id_seq to service_role;
