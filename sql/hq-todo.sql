-- To-do de HQ (hq.beltab.app/todo) : listes et tâches, enregistrées en ligne.
-- À coller UNE FOIS dans Supabase → SQL Editor → Run. N'efface rien.
-- Chaque ligne appartient au compte connecté (owner) : seul ce compte la voit et la modifie,
-- comme la prospection. On se connecte avec son compte admin Beltab habituel.

create table if not exists public.todo_lists (
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id          text not null,                    -- « drev », « bel », « c1730… » ; « __all__ » = réglages de « Tout »
  name        text not null default '',
  mode        text not null default 'couleur',  -- couleur, icone, image, check
  icon        text,
  color       text,
  img         text,                              -- logo en data URL (SVG/PNG, 400 Ko max)
  sort        int  not null default 0,
  created_at  timestamptz not null default now(),
  primary key (owner, id)
);

create table if not exists public.todo_tasks (
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id           bigint not null,                  -- identifiant créé par la page
  list_id      text,
  title        text not null default '',
  notes        text,
  prio         text not null default 'n',        -- h, m, b, n (aucune)
  due          date,
  done         boolean not null default false,
  validate_by  text,                             -- « à valider par »
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (owner, id)
);
-- Checklist d'une tâche : [{"t":"texte","ok":false}, …] (ajouté le 01/11, relançable)
alter table public.todo_tasks add column if not exists items jsonb not null default '[]'::jsonb;
create index if not exists todo_tasks_owner_list on public.todo_tasks (owner, list_id);

alter table public.todo_lists enable row level security;
alter table public.todo_tasks enable row level security;
drop policy if exists todo_lists_owner on public.todo_lists;
create policy todo_lists_owner on public.todo_lists for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists todo_tasks_owner on public.todo_tasks;
create policy todo_tasks_owner on public.todo_tasks for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.todo_lists, public.todo_tasks to authenticated;

create or replace function public.todo_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists todo_touch on public.todo_tasks;
create trigger todo_touch before update on public.todo_tasks for each row execute function public.todo_touch();
notify pgrst, 'reload schema';
