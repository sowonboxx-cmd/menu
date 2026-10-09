-- Envoi d'images (/gestion → upload.beltab.app) : le Worker vérifie que la personne
-- connectée est bien administratrice du restaurant en lisant SA ligne dans
-- restaurant_admins. Cette règle lui permet de lire uniquement ses propres lignes.
-- À coller une fois dans Supabase → SQL Editor → Run. Sans risque à relancer.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'restaurant_admins' and policyname = 'admins_lisent_leurs_lignes'
  ) then
    create policy admins_lisent_leurs_lignes on public.restaurant_admins
      for select using (user_id = auth.uid());
  end if;
end $$;
