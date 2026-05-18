create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.app_config (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.document_templates (
  id text primary key,
  document_type text not null,
  name text not null,
  version integer not null default 1,
  variant text not null default 'default',
  schema_json jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.app_runtime_lock (
  lock_name text primary key,
  session_id uuid not null default gen_random_uuid(),
  locked_by text,
  locked_at timestamptz not null default timezone('utc'::text, now()),
  expires_at timestamptz not null default timezone('utc'::text, now()) + interval '2 minutes',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.app_user_roles (
  user_id uuid not null,
  role_key text not null check (role_key in ('admin', 'redacteur', 'lecture')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, role_key)
);

create table if not exists public.app_user_directory (
  user_id uuid primary key,
  email text not null,
  display_name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_user_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_event_types (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_command_types (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_directory_groups (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_directory_entities (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_plan_types (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_plan_risk_types (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_plan_priorities (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_plan_statuses (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_duty_roles (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_duty_agents (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.reference_reflex_families (
  id text primary key,
  label text not null,
  code text,
  slug text,
  status text not null default 'active',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  deleted_at timestamptz,
  replaced_by_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.app_settings enable row level security;
alter table public.app_config enable row level security;
alter table public.document_templates enable row level security;
alter table public.app_runtime_lock enable row level security;
alter table public.app_user_roles enable row level security;
alter table public.app_user_directory enable row level security;
alter table public.audit_log enable row level security;
alter table public.reference_event_types enable row level security;
alter table public.reference_command_types enable row level security;
alter table public.reference_directory_groups enable row level security;
alter table public.reference_directory_entities enable row level security;
alter table public.reference_plan_types enable row level security;
alter table public.reference_plan_risk_types enable row level security;
alter table public.reference_plan_priorities enable row level security;
alter table public.reference_plan_statuses enable row level security;
alter table public.reference_duty_roles enable row level security;
alter table public.reference_duty_agents enable row level security;
alter table public.reference_reflex_families enable row level security;

revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.app_config from anon, authenticated;
revoke all on table public.document_templates from anon, authenticated;
revoke all on table public.app_runtime_lock from anon, authenticated;
revoke all on table public.app_user_roles from anon, authenticated;
revoke all on table public.app_user_directory from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.reference_event_types from anon, authenticated;
revoke all on table public.reference_command_types from anon, authenticated;
revoke all on table public.reference_directory_groups from anon, authenticated;
revoke all on table public.reference_directory_entities from anon, authenticated;
revoke all on table public.reference_plan_types from anon, authenticated;
revoke all on table public.reference_plan_risk_types from anon, authenticated;
revoke all on table public.reference_plan_priorities from anon, authenticated;
revoke all on table public.reference_plan_statuses from anon, authenticated;
revoke all on table public.reference_duty_roles from anon, authenticated;
revoke all on table public.reference_duty_agents from anon, authenticated;
revoke all on table public.reference_reflex_families from anon, authenticated;

grant select, insert, update on table public.app_settings to authenticated;
grant select, insert, update on table public.app_config to authenticated;
grant select on table public.document_templates to authenticated;
grant select, insert, update, delete on table public.app_runtime_lock to authenticated;
grant select, insert, update, delete on table public.app_user_roles to authenticated;
grant select, insert, update on table public.app_user_directory to authenticated;
grant select, insert on table public.audit_log to authenticated;
grant select, insert, update on table public.reference_event_types to authenticated;
grant select, insert, update on table public.reference_command_types to authenticated;
grant select, insert, update on table public.reference_directory_groups to authenticated;
grant select, insert, update on table public.reference_directory_entities to authenticated;
grant select, insert, update on table public.reference_plan_types to authenticated;
grant select, insert, update on table public.reference_plan_risk_types to authenticated;
grant select, insert, update on table public.reference_plan_priorities to authenticated;
grant select, insert, update on table public.reference_plan_statuses to authenticated;
grant select, insert, update on table public.reference_duty_roles to authenticated;
grant select, insert, update on table public.reference_duty_agents to authenticated;
grant select, insert, update on table public.reference_reflex_families to authenticated;

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

create or replace function public.admin_find_auth_user_by_email(target_email text)
returns table (
  user_id uuid,
  email text,
  display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Accès réservé aux administrateurs.';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'display_name', u.email::text) as display_name
  from auth.users u
  where lower(u.email::text) = lower(trim(target_email))
  limit 1;
end;
$$;

create or replace function public.admin_set_auth_user_password(target_user_id uuid, new_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_password text := trim(coalesce(new_password, ''));
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Accès réservé aux administrateurs.';
  end if;
  if target_user_id is null then
    raise exception 'Utilisateur cible manquant.';
  end if;
  if normalized_password = '' then
    raise exception 'Mot de passe manquant.';
  end if;

  update auth.users
  set
    encrypted_password = crypt(normalized_password, gen_salt('bf')),
    updated_at = timezone('utc'::text, now()),
    recovery_token = '',
    recovery_sent_at = null,
    reauthentication_token = '',
    reauthentication_sent_at = null
  where id = target_user_id;

  if not found then
    raise exception 'Utilisateur introuvable dans auth.users.';
  end if;

  return jsonb_build_object('success', true, 'user_id', target_user_id);
end;
$$;

create or replace function public.admin_delete_auth_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin(auth.uid()) then
    raise exception 'Accès réservé aux administrateurs.';
  end if;
  if target_user_id is null then
    raise exception 'Utilisateur cible manquant.';
  end if;
  if auth.uid() = target_user_id then
    raise exception 'Le compte connecté ne peut pas être supprimé ici.';
  end if;

  delete from public.app_user_roles where user_id = target_user_id;
  delete from public.app_user_directory where user_id = target_user_id;
  delete from auth.users where id = target_user_id;

  if not found then
    raise exception 'Utilisateur introuvable dans auth.users.';
  end if;

  return jsonb_build_object('success', true, 'user_id', target_user_id);
end;
$$;

revoke all on function public.is_app_admin(uuid) from public;
revoke all on function public.has_app_admin() from public;
revoke all on function public.admin_find_auth_user_by_email(text) from public;
revoke all on function public.admin_set_auth_user_password(uuid, text) from public;
revoke all on function public.admin_delete_auth_user(uuid) from public;
grant execute on function public.is_app_admin(uuid) to authenticated;
grant execute on function public.has_app_admin() to authenticated;
grant execute on function public.admin_find_auth_user_by_email(text) to authenticated;
grant execute on function public.admin_set_auth_user_password(uuid, text) to authenticated;
grant execute on function public.admin_delete_auth_user(uuid) to authenticated;

drop policy if exists "app_settings_authenticated_rw" on public.app_settings;
create policy "app_settings_authenticated_rw"
on public.app_settings
for all
to authenticated
using (true)
with check (true);

drop policy if exists "app_config_authenticated_rw" on public.app_config;
create policy "app_config_authenticated_rw"
on public.app_config
for all
to authenticated
using (true)
with check (true);

drop policy if exists "document_templates_authenticated_read" on public.document_templates;
create policy "document_templates_authenticated_read"
on public.document_templates
for select
to authenticated
using (is_active = true);

drop policy if exists "app_runtime_lock_authenticated_rw" on public.app_runtime_lock;
create policy "app_runtime_lock_authenticated_rw"
on public.app_runtime_lock
for all
to authenticated
using (true)
with check (true);

drop policy if exists "app_user_roles_authenticated_read" on public.app_user_roles;
create policy "app_user_roles_authenticated_read"
on public.app_user_roles
for select
to authenticated
using (auth.uid() = user_id);

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

drop policy if exists "app_user_directory_self_rw" on public.app_user_directory;
create policy "app_user_directory_self_rw"
on public.app_user_directory
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "app_user_directory_admin_manage" on public.app_user_directory;
create policy "app_user_directory_admin_manage"
on public.app_user_directory
for all
to authenticated
using (public.is_app_admin(auth.uid()))
with check (public.is_app_admin(auth.uid()));

drop policy if exists "audit_log_authenticated_insert" on public.audit_log;
create policy "audit_log_authenticated_insert"
on public.audit_log
for insert
to authenticated
with check (true);

drop policy if exists "audit_log_authenticated_read" on public.audit_log;
create policy "audit_log_authenticated_read"
on public.audit_log
for select
to authenticated
using (true);

drop policy if exists "reference_event_types_authenticated_rw" on public.reference_event_types;
create policy "reference_event_types_authenticated_rw" on public.reference_event_types for all to authenticated using (true) with check (true);
drop policy if exists "reference_command_types_authenticated_rw" on public.reference_command_types;
create policy "reference_command_types_authenticated_rw" on public.reference_command_types for all to authenticated using (true) with check (true);
drop policy if exists "reference_directory_groups_authenticated_rw" on public.reference_directory_groups;
create policy "reference_directory_groups_authenticated_rw" on public.reference_directory_groups for all to authenticated using (true) with check (true);
drop policy if exists "reference_directory_entities_authenticated_rw" on public.reference_directory_entities;
create policy "reference_directory_entities_authenticated_rw" on public.reference_directory_entities for all to authenticated using (true) with check (true);
drop policy if exists "reference_plan_types_authenticated_rw" on public.reference_plan_types;
create policy "reference_plan_types_authenticated_rw" on public.reference_plan_types for all to authenticated using (true) with check (true);
drop policy if exists "reference_plan_risk_types_authenticated_rw" on public.reference_plan_risk_types;
create policy "reference_plan_risk_types_authenticated_rw" on public.reference_plan_risk_types for all to authenticated using (true) with check (true);
drop policy if exists "reference_plan_priorities_authenticated_rw" on public.reference_plan_priorities;
create policy "reference_plan_priorities_authenticated_rw" on public.reference_plan_priorities for all to authenticated using (true) with check (true);
drop policy if exists "reference_plan_statuses_authenticated_rw" on public.reference_plan_statuses;
create policy "reference_plan_statuses_authenticated_rw" on public.reference_plan_statuses for all to authenticated using (true) with check (true);
drop policy if exists "reference_duty_roles_authenticated_rw" on public.reference_duty_roles;
create policy "reference_duty_roles_authenticated_rw" on public.reference_duty_roles for all to authenticated using (true) with check (true);
drop policy if exists "reference_duty_agents_authenticated_rw" on public.reference_duty_agents;
create policy "reference_duty_agents_authenticated_rw" on public.reference_duty_agents for all to authenticated using (true) with check (true);
drop policy if exists "reference_reflex_families_authenticated_rw" on public.reference_reflex_families;
create policy "reference_reflex_families_authenticated_rw" on public.reference_reflex_families for all to authenticated using (true) with check (true);

comment on table public.app_settings is 'Etat global transitoire de l application SICOD, maintenu pour compatibilite.';
comment on table public.app_config is 'Configuration applicative globale dissociee des donnees metier.';
comment on table public.document_templates is 'Modeles de documents PDF versionnes et modifiables a chaud.';
comment on table public.app_runtime_lock is 'Reserve pour un verrou exclusif applicatif si necessaire.';
comment on table public.app_user_roles is 'Roles applicatifs associes aux utilisateurs Supabase Auth.';
comment on table public.app_user_directory is 'Annuaire minimal des utilisateurs connus de l application, alimente a la connexion.';
comment on table public.audit_log is 'Journal d audit minimal des operations importantes.';
