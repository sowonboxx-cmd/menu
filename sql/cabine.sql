-- La Cabine : Events (calendrier) et tâches.
-- À coller une fois dans Supabase → SQL Editor → Run.
-- Lecture et écriture réservées aux administrateurs du restaurant
-- (table restaurant_admins), comme le reste de l'administration.

create table if not exists public.cabine_events (
  id          uuid primary key default gen_random_uuid(),
  client_slug text not null,
  title       text not null,
  type        text not null default 'Soirée',      -- Soirée, Atelier, Girls' Night, Campagne, Post réseaux…
  date_start  date not null,
  date_end    date,
  time_start  text,                                -- '19:00'
  time_end    text,                                -- '23:30'
  all_day     boolean not null default false,
  recurrence  jsonb,                               -- null, ou {"freq":"monthly","weekday":4,"n":3} (3e jeudi), n=-1 : dernier
  place       text,
  seats       int,
  owner       text,
  description text,
  social      jsonb not null default '{}'::jsonb,  -- {"Instagram":"ok","TikTok":"todo",…}
  todo        jsonb not null default '[]'::jsonb,  -- [{"t":"Visuels prêts","d":true}]
  comments    jsonb not null default '[]'::jsonb,  -- [{"who":"Will","text":"…","at":"2026-10-08T14:02:00Z"}]
  occ         jsonb not null default '{}'::jsonb,  -- par date d'occurrence (Events récurrents) : {"2026-10-15":{"social":{…},"todo":[…]}}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cabine_events_slug_date on public.cabine_events (client_slug, date_start);

create table if not exists public.cabine_tasks (
  id          uuid primary key default gen_random_uuid(),
  client_slug text not null,
  title       text not null,
  due         date,
  tag         text,
  description text,
  done        boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cabine_tasks_slug on public.cabine_tasks (client_slug, done, due);

alter table public.cabine_events enable row level security;
alter table public.cabine_tasks  enable row level security;

drop policy if exists cabine_events_admin on public.cabine_events;
create policy cabine_events_admin on public.cabine_events
  for all to authenticated
  using      (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = cabine_events.client_slug))
  with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = cabine_events.client_slug));

drop policy if exists cabine_tasks_admin on public.cabine_tasks;
create policy cabine_tasks_admin on public.cabine_tasks
  for all to authenticated
  using      (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = cabine_tasks.client_slug))
  with check (exists (select 1 from public.restaurant_admins a where a.user_id = auth.uid() and a.client_slug = cabine_tasks.client_slug));

grant select, insert, update, delete on public.cabine_events, public.cabine_tasks to authenticated;
