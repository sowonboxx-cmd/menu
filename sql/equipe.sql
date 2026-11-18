-- ════════════════════════════════════════════════════════════════════
-- Équipe : comptes « staff » avec accès limité (page Équipe de l'admin)
-- À coller dans Supabase → SQL Editor → Run. Sans danger si relancé.
--
-- Principe (sécurité) :
--  • Les admins restent dans restaurant_admins : rien ne change pour eux.
--  • Les staffs sont dans une table À PART (restaurant_staff). Toutes les
--    règles existantes ne regardent que restaurant_admins : un staff n'a
--    donc accès à RIEN par défaut.
--  • On AJOUTE ensuite des règles qui ouvrent seulement les zones cochées
--    pour lui (perms) : resa, calendrier, campagnes, tshirts.
--    Les règles Postgres s'additionnent : celles des admins ne bougent pas.
--  • Les staffs sont créés / modifiés uniquement par le Worker
--    (resa.beltab.app, clé service) après vérification que l'appelant est
--    admin. Aucune écriture possible depuis le navigateur.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.restaurant_staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_slug text not null,                 -- établissement (ex. « drevici »)
  slugs       text[] not null default '{}',  -- slugs couverts (ex. drevici, drevici-paris, drevici-test)
  email       text,
  perms       text[] not null default '{}',  -- zones ouvertes : resa, calendrier, campagnes, tshirts
  created_at  timestamptz not null default now(),
  created_by  uuid,
  unique (user_id, client_slug)
);
alter table public.restaurant_staff enable row level security;
-- Droits de la table (les projets Supabase récents ne les donnent plus automatiquement)
grant select, insert, update, delete on public.restaurant_staff to service_role;
grant select on public.restaurant_staff to authenticated;
-- Le Worker ajoute / retire aussi des administrateurs depuis la page Équipe
grant select, insert, delete on public.restaurant_admins to service_role;
drop policy if exists restaurant_staff_self on public.restaurant_staff;
create policy restaurant_staff_self on public.restaurant_staff for select to authenticated
  using (user_id = auth.uid());

-- Le staff connecté a-t-il la zone p_area pour ce slug ?
-- (les jeux d'un moment ont un slug « drevici--halloween » : on garde la partie avant « -- »)
create or replace function public.staff_can(p_slug text, p_area text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurant_staff s
    where s.user_id = auth.uid()
      and p_area = any (s.perms)
      and split_part(p_slug, '--', 1) = any (s.slugs)
  );
$$;
revoke all on function public.staff_can(text, text) from public;
grant execute on function public.staff_can(text, text) to authenticated, service_role;

-- Règles ajoutées table par table (une table absente est simplement ignorée).
-- mode : r = lecture, ru = lecture + ajout + modification (pas de suppression), all = tout
do $$
declare
  t text; area text; mode text;
  rules text[][] := array[
    -- Réservations : liste, plan de salle (lecture), liste d'attente
    ['restaurant_reservations','resa','ru'],
    ['restaurant_waitlist','resa','ru'],
    ['restaurant_tables','resa','r'],
    ['restaurant_spaces','resa','r'],
    ['restaurant_services','resa','r'],
    ['blocked_dates','resa','r'],
    ['boost_offers','resa','r'],
    -- Calendrier et events du Studio
    ['cabine_events','calendrier','all'],
    ['cabine_tasks','calendrier','all'],
    -- Campagnes QR (Halloween, Free Oyster…) : consultation
    ['cabine_qr','campagnes','r'],
    ['qr_scans','campagnes','r'],
    ['qr_conversions','campagnes','r'],
    ['jeu_players','campagnes','r'],
    ['jeu_plays','campagnes','r'],
    ['jeu_draws','campagnes','r'],
    ['jeu_config','campagnes','r'],
    ['site_events','campagnes','r'],
    -- T-shirts : stock (lecture) et ventes / dons
    ['cabine_shop','tshirts','r'],
    ['cabine_shop_sales','tshirts','all']
  ];
  i int;
begin
  for i in 1 .. array_length(rules, 1) loop
    t := rules[i][1]; area := rules[i][2]; mode := rules[i][3];
    if to_regclass('public.' || t) is null then
      raise notice 'Table % absente : ignorée', t; continue;
    end if;
    execute format('drop policy if exists %I on public.%I', t || '_staff_r', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_i', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_u', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_all', t);
    if mode = 'all' then
      execute format('create policy %I on public.%I for all to authenticated using (public.staff_can(client_slug, %L)) with check (public.staff_can(client_slug, %L))', t || '_staff_all', t, area, area);
    else
      execute format('create policy %I on public.%I for select to authenticated using (public.staff_can(client_slug, %L))', t || '_staff_r', t, area);
      if mode = 'ru' then
        execute format('create policy %I on public.%I for insert to authenticated with check (public.staff_can(client_slug, %L))', t || '_staff_i', t, area);
        execute format('create policy %I on public.%I for update to authenticated using (public.staff_can(client_slug, %L)) with check (public.staff_can(client_slug, %L))', t || '_staff_u', t, area, area);
      end if;
    end if;
  end loop;
end $$;

-- Vérification : doit lister les règles « _staff_ » créées
select tablename, policyname, cmd from pg_policies where policyname like '%\_staff\_%' order by tablename, policyname;

-- ════════════════════════════════════════════════════════════════════
-- Administrateur protégé (super admin) : son accès ne peut être retiré
-- ni depuis la page Équipe, ni par une suppression dans la base.
-- Pour protéger un compte : décommentez la dernière ligne et mettez SON email.
-- ════════════════════════════════════════════════════════════════════
alter table public.restaurant_admins add column if not exists locked boolean not null default false;
create or replace function public.restaurant_admins_keep_locked()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.locked then raise exception 'Administrateur protégé : accès impossible à retirer'; end if;
  if tg_op = 'UPDATE' and old.locked and (not new.locked or new.user_id <> old.user_id or new.client_slug <> old.client_slug) then
    raise exception 'Administrateur protégé : modification impossible'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists restaurant_admins_keep_locked on public.restaurant_admins;
create trigger restaurant_admins_keep_locked before delete or update on public.restaurant_admins
  for each row execute function public.restaurant_admins_keep_locked();
-- update public.restaurant_admins set locked = true where user_id = (select id from auth.users where email = 'VOTRE-EMAIL@exemple.com');
