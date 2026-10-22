-- Plat en test : le plat du moment (changé depuis le Studio), les commandes passées depuis la carte de table,
-- et les avis des clients. À coller UNE FOIS dans Supabase → SQL Editor → Run. Ne touche à rien d'existant.
-- Tout passe par le serveur resa.beltab.app (clé serveur) : aucune lecture directe depuis le public.

create table if not exists public.plat_test (
  id            bigserial primary key,
  client_slug   text not null,
  name          text not null,
  descr         text,
  photo         text,
  price_test    numeric,
  price_normal  numeric,
  share_text    text default '2 à 4 personnes',
  commission    numeric default 2,           -- € pour le serveur, par plat confirmé
  status        text not null default 'brouillon' check (status in ('brouillon','en_test','pause','carte','arrete')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists plat_test_slug on public.plat_test (client_slug, status);

create table if not exists public.plat_orders (
  id           bigserial primary key,
  client_slug  text not null,
  plat_id      bigint not null references public.plat_test(id) on delete cascade,
  src          text,                         -- QR de la carte (serveur) : PLAT-TEST-SERVEUR-ELODIE-1
  token        text not null unique,         -- gardé sur le téléphone du client (pour noter ensuite)
  code         text not null,                -- 3 chiffres à dire au serveur
  status       text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists plat_orders_slug on public.plat_orders (client_slug, created_at desc);

create table if not exists public.plat_reviews (
  id          bigserial primary key,
  client_slug text not null,
  plat_id     bigint not null references public.plat_test(id) on delete cascade,
  order_id    bigint unique references public.plat_orders(id) on delete cascade,   -- un seul avis par commande
  rating      smallint not null check (rating between 1 and 5),
  tags        text[],
  comment     text,
  first_name  text,
  email       text,
  optin       boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists plat_reviews_slug on public.plat_reviews (client_slug, created_at desc);

alter table public.plat_test    enable row level security;
alter table public.plat_orders  enable row level security;
alter table public.plat_reviews enable row level security;
grant select, insert, update, delete on public.plat_test, public.plat_orders, public.plat_reviews to service_role;
grant usage, select on sequence public.plat_test_id_seq, public.plat_orders_id_seq, public.plat_reviews_id_seq to service_role;

-- Le Studio (administrateurs du restaurant) : change le plat, confirme les commandes, lit les avis.
do $$
declare t text;
begin
  foreach t in array array['plat_test','plat_orders','plat_reviews'] loop
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated
      using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))
      with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = %1$s.client_slug))', t);
  end loop;
end $$;
grant select, insert, update, delete on public.plat_test, public.plat_orders, public.plat_reviews to authenticated;
grant usage, select on sequence public.plat_test_id_seq to authenticated;

-- Premier plat (exemple, à changer dans le Studio), pour la préview et pour le vrai restaurant
insert into public.plat_test (client_slug, name, descr, price_test, price_normal, status)
select s, 'Huîtres chaudes, beurre noisette & citron brûlé', 'Six huîtres de Surzur passées au four, beurre noisette, citron brûlé et herbes du moment.', 15, 18, 'en_test'
from (values ('drevici-test'), ('drevici-paris')) v(s)
where not exists (select 1 from public.plat_test p where p.client_slug = v.s);

-- Les QR des cartes serveurs (un par serveur, même campagne) : exemples, à compléter dans le Studio
insert into public.cabine_qr (client_slug, code, label, category, owner, destination, goal, commission, campaign, support, place, num, path, style)
values ('drevici','PLAT-TEST-SERVEUR-ELODIE-1','Carte plat en test · Élodie','Plat en test','Élodie','/plat-test','Plat en test commandé','2 € par plat','Plat en test','Serveur','elodie',1,'plat-test/serveur-elodie-1','losange'),
       ('drevici','PLAT-TEST-SERVEUR-VINCENT-1','Carte plat en test · Vincent','Plat en test','Vincent','/plat-test','Plat en test commandé','2 € par plat','Plat en test','Serveur','vincent',1,'plat-test/serveur-vincent-1','losange')
on conflict (code) do nothing;
notify pgrst, 'reload schema';
