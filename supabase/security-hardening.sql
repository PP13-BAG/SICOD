-- Durcissement sécurité SICOD
-- À exécuter dans Supabase SQL Editor sur une base existante.
-- Ce script :
-- 1. renforce les policies RLS,
-- 2. retire l'auto-bootstrap administrateur côté client,
-- 3. ajoute des contraintes de cohérence métier,
-- 4. réserve les écritures sensibles aux rôles adaptés.
--
-- Important :
-- - Après application, le premier administrateur doit être attribué explicitement
--   dans public.app_user_roles.
-- - Les comptes "lecture" deviennent réellement en lecture seule sur l'état applicatif.

create or replace function public.has_app_role(required_role text, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case lower(coalesce(required_role, ''))
    when 'lecture' then exists (
      select 1
      from public.app_user_roles
      where user_id = target_user_id
        and role_key in ('lecture', 'redacteur', 'admin')
    )
    when 'redacteur' then exists (
      select 1
      from public.app_user_roles
      where user_id = target_user_id
        and role_key in ('redacteur', 'admin')
    )
    when 'admin' then exists (
      select 1
      from public.app_user_roles
      where user_id = target_user_id
        and role_key = 'admin'
    )
    else false
  end;
$$;

create or replace function public.is_app_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_app_role('admin', target_user_id);
$$;

revoke all on function public.has_app_role(text, uuid) from public;
revoke all on function public.is_app_admin(uuid) from public;
grant execute on function public.has_app_role(text, uuid) to authenticated;
grant execute on function public.is_app_admin(uuid) to authenticated;

alter table public.app_settings drop constraint if exists app_settings_key_not_blank;
alter table public.app_config drop constraint if exists app_config_key_not_blank;
alter table public.document_templates drop constraint if exists document_templates_type_not_blank;
alter table public.document_templates drop constraint if exists document_templates_name_not_blank;
alter table public.document_templates drop constraint if exists document_templates_variant_not_blank;
alter table public.document_templates drop constraint if exists document_templates_version_positive;
alter table public.app_user_directory drop constraint if exists app_user_directory_email_not_blank;
alter table public.audit_log drop constraint if exists audit_log_entity_type_not_blank;
alter table public.audit_log drop constraint if exists audit_log_entity_id_not_blank;
alter table public.audit_log drop constraint if exists audit_log_action_not_blank;
alter table public.app_runtime_lock drop constraint if exists app_runtime_lock_name_not_blank;
alter table public.app_runtime_lock drop constraint if exists app_runtime_lock_expiry_after_lock;
alter table public.reference_event_types drop constraint if exists reference_event_types_label_not_blank;
alter table public.reference_command_types drop constraint if exists reference_command_types_label_not_blank;
alter table public.reference_directory_groups drop constraint if exists reference_directory_groups_label_not_blank;
alter table public.reference_directory_entities drop constraint if exists reference_directory_entities_label_not_blank;
alter table public.reference_plan_types drop constraint if exists reference_plan_types_label_not_blank;
alter table public.reference_plan_risk_types drop constraint if exists reference_plan_risk_types_label_not_blank;
alter table public.reference_plan_priorities drop constraint if exists reference_plan_priorities_label_not_blank;
alter table public.reference_plan_statuses drop constraint if exists reference_plan_statuses_label_not_blank;
alter table public.reference_duty_roles drop constraint if exists reference_duty_roles_label_not_blank;
alter table public.reference_duty_agents drop constraint if exists reference_duty_agents_label_not_blank;
alter table public.reference_reflex_families drop constraint if exists reference_reflex_families_label_not_blank;
alter table public.reference_event_types drop constraint if exists reference_event_types_sort_order_non_negative;
alter table public.reference_command_types drop constraint if exists reference_command_types_sort_order_non_negative;
alter table public.reference_directory_groups drop constraint if exists reference_directory_groups_sort_order_non_negative;
alter table public.reference_directory_entities drop constraint if exists reference_directory_entities_sort_order_non_negative;
alter table public.reference_plan_types drop constraint if exists reference_plan_types_sort_order_non_negative;
alter table public.reference_plan_risk_types drop constraint if exists reference_plan_risk_types_sort_order_non_negative;
alter table public.reference_plan_priorities drop constraint if exists reference_plan_priorities_sort_order_non_negative;
alter table public.reference_plan_statuses drop constraint if exists reference_plan_statuses_sort_order_non_negative;
alter table public.reference_duty_roles drop constraint if exists reference_duty_roles_sort_order_non_negative;
alter table public.reference_duty_agents drop constraint if exists reference_duty_agents_sort_order_non_negative;
alter table public.reference_reflex_families drop constraint if exists reference_reflex_families_sort_order_non_negative;

alter table public.app_settings
  alter column key set not null,
  add constraint app_settings_key_not_blank check (btrim(key) <> '');

alter table public.app_config
  alter column key set not null,
  add constraint app_config_key_not_blank check (btrim(key) <> '');

alter table public.document_templates
  add constraint document_templates_type_not_blank check (btrim(document_type) <> ''),
  add constraint document_templates_name_not_blank check (btrim(name) <> ''),
  add constraint document_templates_variant_not_blank check (btrim(variant) <> ''),
  add constraint document_templates_version_positive check (version > 0);

alter table public.app_user_directory
  add constraint app_user_directory_email_not_blank check (btrim(email) <> '');

create unique index if not exists app_user_directory_email_ci_idx
  on public.app_user_directory ((lower(btrim(email))));

alter table public.audit_log
  add constraint audit_log_entity_type_not_blank check (btrim(entity_type) <> ''),
  add constraint audit_log_entity_id_not_blank check (btrim(entity_id) <> ''),
  add constraint audit_log_action_not_blank check (btrim(action) <> '');

alter table public.app_runtime_lock
  add constraint app_runtime_lock_name_not_blank check (btrim(lock_name) <> ''),
  add constraint app_runtime_lock_expiry_after_lock check (expires_at > locked_at);

alter table public.reference_event_types add constraint reference_event_types_label_not_blank check (btrim(label) <> '');
alter table public.reference_command_types add constraint reference_command_types_label_not_blank check (btrim(label) <> '');
alter table public.reference_directory_groups add constraint reference_directory_groups_label_not_blank check (btrim(label) <> '');
alter table public.reference_directory_entities add constraint reference_directory_entities_label_not_blank check (btrim(label) <> '');
alter table public.reference_plan_types add constraint reference_plan_types_label_not_blank check (btrim(label) <> '');
alter table public.reference_plan_risk_types add constraint reference_plan_risk_types_label_not_blank check (btrim(label) <> '');
alter table public.reference_plan_priorities add constraint reference_plan_priorities_label_not_blank check (btrim(label) <> '');
alter table public.reference_plan_statuses add constraint reference_plan_statuses_label_not_blank check (btrim(label) <> '');
alter table public.reference_duty_roles add constraint reference_duty_roles_label_not_blank check (btrim(label) <> '');
alter table public.reference_duty_agents add constraint reference_duty_agents_label_not_blank check (btrim(label) <> '');
alter table public.reference_reflex_families add constraint reference_reflex_families_label_not_blank check (btrim(label) <> '');

alter table public.reference_event_types add constraint reference_event_types_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_command_types add constraint reference_command_types_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_directory_groups add constraint reference_directory_groups_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_directory_entities add constraint reference_directory_entities_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_plan_types add constraint reference_plan_types_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_plan_risk_types add constraint reference_plan_risk_types_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_plan_priorities add constraint reference_plan_priorities_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_plan_statuses add constraint reference_plan_statuses_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_duty_roles add constraint reference_duty_roles_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_duty_agents add constraint reference_duty_agents_sort_order_non_negative check (sort_order >= 0);
alter table public.reference_reflex_families add constraint reference_reflex_families_sort_order_non_negative check (sort_order >= 0);

revoke insert, update, delete on table public.document_templates from authenticated;
grant select, insert, update, delete on table public.document_templates to authenticated;

revoke update, delete on table public.app_user_roles from authenticated;
grant select, insert, delete on table public.app_user_roles to authenticated;

grant select, insert, update, delete on table public.app_user_directory to authenticated;

revoke delete on table public.app_settings from authenticated;
revoke delete on table public.app_config from authenticated;
revoke delete on table public.audit_log from authenticated;

drop policy if exists "app_settings_authenticated_rw" on public.app_settings;
drop policy if exists "app_config_authenticated_rw" on public.app_config;
drop policy if exists "document_templates_authenticated_read" on public.document_templates;
drop policy if exists "app_runtime_lock_authenticated_rw" on public.app_runtime_lock;
drop policy if exists "app_user_roles_authenticated_read" on public.app_user_roles;
drop policy if exists "app_user_roles_bootstrap_admin" on public.app_user_roles;
drop policy if exists "app_user_roles_admin_manage" on public.app_user_roles;
drop policy if exists "app_user_directory_self_rw" on public.app_user_directory;
drop policy if exists "app_user_directory_admin_manage" on public.app_user_directory;
drop policy if exists "audit_log_authenticated_insert" on public.audit_log;
drop policy if exists "audit_log_authenticated_read" on public.audit_log;
drop policy if exists "reference_event_types_authenticated_rw" on public.reference_event_types;
drop policy if exists "reference_command_types_authenticated_rw" on public.reference_command_types;
drop policy if exists "reference_directory_groups_authenticated_rw" on public.reference_directory_groups;
drop policy if exists "reference_directory_entities_authenticated_rw" on public.reference_directory_entities;
drop policy if exists "reference_plan_types_authenticated_rw" on public.reference_plan_types;
drop policy if exists "reference_plan_risk_types_authenticated_rw" on public.reference_plan_risk_types;
drop policy if exists "reference_plan_priorities_authenticated_rw" on public.reference_plan_priorities;
drop policy if exists "reference_plan_statuses_authenticated_rw" on public.reference_plan_statuses;
drop policy if exists "reference_duty_roles_authenticated_rw" on public.reference_duty_roles;
drop policy if exists "reference_duty_agents_authenticated_rw" on public.reference_duty_agents;
drop policy if exists "reference_reflex_families_authenticated_rw" on public.reference_reflex_families;

create policy "app_settings_read_authenticated"
on public.app_settings
for select
to authenticated
using (true);

create policy "app_settings_write_redacteur"
on public.app_settings
for insert
to authenticated
with check (public.has_app_role('redacteur', auth.uid()));

create policy "app_settings_update_redacteur"
on public.app_settings
for update
to authenticated
using (public.has_app_role('redacteur', auth.uid()))
with check (public.has_app_role('redacteur', auth.uid()));

create policy "app_config_read_authenticated"
on public.app_config
for select
to authenticated
using (true);

create policy "app_config_manage_admin"
on public.app_config
for insert
to authenticated
with check (public.has_app_role('admin', auth.uid()));

create policy "app_config_update_admin"
on public.app_config
for update
to authenticated
using (public.has_app_role('admin', auth.uid()))
with check (public.has_app_role('admin', auth.uid()));

create policy "document_templates_read_authenticated"
on public.document_templates
for select
to authenticated
using (is_active = true or public.has_app_role('admin', auth.uid()));

create policy "document_templates_manage_admin"
on public.document_templates
for all
to authenticated
using (public.has_app_role('admin', auth.uid()))
with check (public.has_app_role('admin', auth.uid()));

create policy "app_runtime_lock_read_authenticated"
on public.app_runtime_lock
for select
to authenticated
using (true);

create policy "app_runtime_lock_write_redacteur"
on public.app_runtime_lock
for all
to authenticated
using (public.has_app_role('redacteur', auth.uid()))
with check (public.has_app_role('redacteur', auth.uid()));

create policy "app_user_roles_read_self_or_admin"
on public.app_user_roles
for select
to authenticated
using (auth.uid() = user_id or public.has_app_role('admin', auth.uid()));

create policy "app_user_roles_manage_admin"
on public.app_user_roles
for insert
to authenticated
with check (public.has_app_role('admin', auth.uid()));

create policy "app_user_roles_delete_admin"
on public.app_user_roles
for delete
to authenticated
using (public.has_app_role('admin', auth.uid()));

create policy "app_user_directory_read_self_or_admin"
on public.app_user_directory
for select
to authenticated
using (auth.uid() = user_id or public.has_app_role('admin', auth.uid()));

create policy "app_user_directory_insert_self_or_admin"
on public.app_user_directory
for insert
to authenticated
with check (auth.uid() = user_id or public.has_app_role('admin', auth.uid()));

create policy "app_user_directory_update_self_or_admin"
on public.app_user_directory
for update
to authenticated
using (auth.uid() = user_id or public.has_app_role('admin', auth.uid()))
with check (auth.uid() = user_id or public.has_app_role('admin', auth.uid()));

create policy "app_user_directory_delete_admin"
on public.app_user_directory
for delete
to authenticated
using (public.has_app_role('admin', auth.uid()));

create policy "audit_log_insert_authenticated"
on public.audit_log
for insert
to authenticated
with check (actor_user_id is null or actor_user_id = auth.uid());

create policy "audit_log_read_admin"
on public.audit_log
for select
to authenticated
using (public.has_app_role('admin', auth.uid()));

create policy "reference_event_types_read_authenticated" on public.reference_event_types for select to authenticated using (true);
create policy "reference_event_types_write_admin" on public.reference_event_types for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_command_types_read_authenticated" on public.reference_command_types for select to authenticated using (true);
create policy "reference_command_types_write_admin" on public.reference_command_types for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_directory_groups_read_authenticated" on public.reference_directory_groups for select to authenticated using (true);
create policy "reference_directory_groups_write_admin" on public.reference_directory_groups for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_directory_entities_read_authenticated" on public.reference_directory_entities for select to authenticated using (true);
create policy "reference_directory_entities_write_admin" on public.reference_directory_entities for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_plan_types_read_authenticated" on public.reference_plan_types for select to authenticated using (true);
create policy "reference_plan_types_write_admin" on public.reference_plan_types for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_plan_risk_types_read_authenticated" on public.reference_plan_risk_types for select to authenticated using (true);
create policy "reference_plan_risk_types_write_admin" on public.reference_plan_risk_types for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_plan_priorities_read_authenticated" on public.reference_plan_priorities for select to authenticated using (true);
create policy "reference_plan_priorities_write_admin" on public.reference_plan_priorities for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_plan_statuses_read_authenticated" on public.reference_plan_statuses for select to authenticated using (true);
create policy "reference_plan_statuses_write_admin" on public.reference_plan_statuses for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_duty_roles_read_authenticated" on public.reference_duty_roles for select to authenticated using (true);
create policy "reference_duty_roles_write_admin" on public.reference_duty_roles for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_duty_agents_read_authenticated" on public.reference_duty_agents for select to authenticated using (true);
create policy "reference_duty_agents_write_admin" on public.reference_duty_agents for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));
create policy "reference_reflex_families_read_authenticated" on public.reference_reflex_families for select to authenticated using (true);
create policy "reference_reflex_families_write_admin" on public.reference_reflex_families for all to authenticated using (public.has_app_role('admin', auth.uid())) with check (public.has_app_role('admin', auth.uid()));

comment on function public.has_app_role(text, uuid) is 'Test hiérarchique de rôle applicatif sans récursion RLS.';
