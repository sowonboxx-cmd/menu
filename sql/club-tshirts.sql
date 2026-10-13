-- ════════════════════════════════════════════════════════════════
-- Club : taille de T-shirt des membres + T-shirt gagné (tirage au sort)
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. Purement additif, sans risque à relancer.
-- ════════════════════════════════════════════════════════════════
alter table resa_clients add column if not exists tshirt_size   text;        -- XS, S, M, L, XL, XXL (vide = ne participe pas)
alter table resa_clients add column if not exists tshirt_at     timestamptz; -- quand le membre a donné sa taille
alter table resa_clients add column if not exists tshirt_won_at timestamptz; -- T-shirt gagné (exclu des prochains tirages)

-- Vérification : les 3 colonnes doivent apparaître
select column_name from information_schema.columns
where table_name = 'resa_clients' and column_name like 'tshirt%' order by 1;
