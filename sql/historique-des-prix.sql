-- ════════════════════════════════════════════════════════════════════
-- Historique des prix et évolution de la carte
-- Un journal léger : une ligne par changement (prix, ajout, retrait, renommage), avec la date et qui l'a fait.
-- L'admin l'écrit tout seul à chaque enregistrement de la carte. Le passé est reconstruit une fois
-- à partir des copies déjà enregistrées (menu_data_history), à la première ouverture de « Évolution de la carte ».
-- À coller dans Supabase → SQL Editor → Run. Le relancer ne casse rien.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.price_history (
  id          bigserial primary key,
  client_slug text not null,
  at          timestamptz not null default now(),
  kind        text not null check (kind in ('prix', 'ajout', 'retrait', 'renom', 'base')),
  item_key    text not null default '',   -- identifiant stable du plat (_pid) ou « catégorie|nom » pour une boisson
  item_name   text not null default '',
  cat         text not null default '',   -- catégorie de la carte
  fmt         text not null default '',   -- format : « verre 12 cl », « les 6 »… (vide = prix unique)
  old_val     text not null default '',
  new_val     text not null default '',
  by_name     text not null default '',   -- prénom (ou email) de la personne
  via         text not null default ''    -- « voix » si le changement vient de la voix
);
create index if not exists price_history_slug_at on public.price_history (client_slug, at desc);
create index if not exists price_history_slug_item on public.price_history (client_slug, item_key, at desc);

alter table public.price_history enable row level security;
drop policy if exists price_history_admin on public.price_history;
create policy price_history_admin on public.price_history for all to authenticated
  using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = price_history.client_slug))
  with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = price_history.client_slug));
grant select, insert, delete on public.price_history to authenticated;
grant usage, select on sequence public.price_history_id_seq to authenticated;

-- Vérification : la table existe, et combien de copies de la carte peuvent servir à reconstruire le passé.
select (select count(*) from public.price_history) as lignes_journal,
       client_slug, count(*) as copies_enregistrees, min(created_at) as premiere_copie
from public.menu_data_history group by client_slug order by client_slug;
