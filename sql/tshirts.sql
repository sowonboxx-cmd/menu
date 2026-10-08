-- T-shirts Drevici : quantités commandées et ventes (La Cabine → T-shirts).
-- À coller une fois dans Supabase → SQL Editor → Run (après cabine.sql).
--
-- cabine_shop       : une ligne par restaurant — prix de vente par couleur, quantités
--                     commandées par couleur et taille, statut de la commande.
-- cabine_shop_sales : une ligne par vente — acheteur, couleur, taille,
--                     quantité, montant, vendeur, payé, remis.

create table if not exists public.cabine_shop (
  client_slug  text primary key,
  prices       jsonb not null default '{"Bleu":35,"Blanc":30}'::jsonb, -- prix de vente par couleur
  stock        jsonb not null default '{}'::jsonb,   -- {"Bleu":{"S":6,"M":12,...},"Blanc":{...}}
  order_status text not null default 'brouillon',    -- brouillon, commandee, recue
  updated_at   timestamptz not null default now()
);

-- Si la table existait déjà avec l'ancien champ « price » :
alter table public.cabine_shop add column if not exists prices jsonb not null default '{"Bleu":35,"Blanc":30}'::jsonb;

create table if not exists public.cabine_shop_sales (
  id          uuid primary key default gen_random_uuid(),
  client_slug text not null,
  buyer       text not null,
  contact     text,
  color       text not null default 'Bleu',   -- Bleu, Blanc
  size        text not null default 'M',      -- S, M, L, XL
  qty         int  not null default 1,
  amount      numeric,
  seller      text,
  paid        boolean not null default false,
  given       boolean not null default false,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cabine_shop_sales_slug on public.cabine_shop_sales (client_slug, created_at desc);

alter table public.cabine_shop       enable row level security;
alter table public.cabine_shop_sales enable row level security;

do $$
declare t text;
begin
  foreach t in array array['cabine_shop','cabine_shop_sales'] loop
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated
      using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))
      with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))', t);
  end loop;
end $$;
grant select, insert, update, delete on public.cabine_shop, public.cabine_shop_sales to authenticated;
