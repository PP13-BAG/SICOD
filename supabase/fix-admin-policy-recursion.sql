-- Correctif ciblé : supprime la récursion RLS sur public.app_user_roles.
-- À exécuter dans Supabase SQL Editor avec un compte propriétaire du projet.

create or replace function public.is_app_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_user_roles
    where user_id = target_user_id
      and role_key = 'admin'
  );
$$;

create or replace function public.has_app_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_user_roles
    where role_key = 'admin'
  );
$$;

revoke all on function public.is_app_admin(uuid) from public;
revoke all on function public.has_app_admin() from public;
grant execute on function public.is_app_admin(uuid) to authenticated;
grant execute on function public.has_app_admin() to authenticated;

drop policy if exists "app_user_roles_bootstrap_admin" on public.app_user_roles;
create policy "app_user_roles_bootstrap_admin"
on public.app_user_roles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role_key = 'admin'
  and not public.has_app_admin()
);

drop policy if exists "app_user_roles_admin_manage" on public.app_user_roles;
create policy "app_user_roles_admin_manage"
on public.app_user_roles
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

drop policy if exists "app_user_directory_admin_manage" on public.app_user_directory;
create policy "app_user_directory_admin_manage"
on public.app_user_directory
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));
