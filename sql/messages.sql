-- ════════════════════════════════════════════════════════════════
-- MESSAGES DES CLIENTS (bouton « Message » du site)
-- À coller une fois dans Supabase → SQL Editor → Run. Sans risque à relancer.
--
-- Le site envoie le message à resa.beltab.app/message (Worker resa-notify) :
-- le Worker l'enregistre ici (clé serveur) puis l'envoie par email au restaurant
-- (notify_email) et à Will (ADMIN_EMAIL). Le public ne peut RIEN lire ni écrire
-- directement dans cette table : seuls les administrateurs du restaurant la voient
-- dans /admin → Messages.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  client_slug text not null,                   -- slug des réservations (ex. drevici-paris)
  name        text not null,
  email       text,
  phone       text,
  message     text not null,
  status      text not null default 'new',     -- new | read | done
  page        text,                            -- page d'où le message est parti
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists contact_messages_slug_at on public.contact_messages (client_slug, created_at desc);

alter table public.contact_messages enable row level security;
drop policy if exists contact_messages_admin on public.contact_messages;
create policy contact_messages_admin on public.contact_messages for all to authenticated
  using (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = contact_messages.client_slug))
  with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = contact_messages.client_slug));
grant select, update, delete on public.contact_messages to authenticated;
grant select, insert on public.contact_messages to service_role;

-- Vérification : doit afficher 0 la première fois.
select 'contact_messages' as ok, count(*) from public.contact_messages;
