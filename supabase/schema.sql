create extension if not exists pgcrypto;

create table if not exists public.app_settings (
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

alter table public.app_settings enable row level security;
alter table public.document_templates enable row level security;
alter table public.app_runtime_lock enable row level security;

revoke all on table public.app_settings from anon, authenticated;
revoke all on table public.document_templates from anon, authenticated;
revoke all on table public.app_runtime_lock from anon, authenticated;

grant select, insert, update on table public.app_settings to authenticated;
grant select on table public.document_templates to authenticated;
grant select, insert, update, delete on table public.app_runtime_lock to authenticated;

drop policy if exists "app_settings_authenticated_rw" on public.app_settings;
create policy "app_settings_authenticated_rw"
on public.app_settings
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

comment on table public.app_settings is 'Etat global de l application SICOD synchronise depuis le frontend statique.';
comment on table public.document_templates is 'Modeles de documents PDF modifiables a chaud.';
comment on table public.app_runtime_lock is 'Reserve pour un verrou exclusif applicatif si necessaire plus tard.';
