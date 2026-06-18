-- ============================================================================
-- ClinicFlow AI — Row-Level Security
-- Tenant isolation enforced in the database. The anon/auth client can only ever
-- read/write rows for the clinic the signed-in user belongs to.
-- ============================================================================

-- Helper: resolve the clinic_id of the currently authenticated user.
-- SECURITY DEFINER so it can read public.users without triggering users' own RLS
-- (which would cause infinite recursion).
create or replace function auth_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.users where id = auth.uid();
$$;

create or replace function auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS on all tenant tables
alter table clinics       enable row level security;
alter table users         enable row level security;
alter table patients      enable row level security;
alter table appointments  enable row level security;
alter table calls         enable row level security;
alter table missed_calls  enable row level security;
alter table callback_logs enable row level security;
alter table notifications enable row level security;

-- ── clinics ──────────────────────────────────────────────────
create policy "clinic_members_read" on clinics
  for select using (id = auth_clinic_id());
-- Only admins may update their clinic settings/branding.
create policy "clinic_admins_update" on clinics
  for update using (id = auth_clinic_id() and auth_is_admin())
  with check (id = auth_clinic_id() and auth_is_admin());

-- ── users ────────────────────────────────────────────────────
-- A user can read members of their own clinic.
create policy "users_read_same_clinic" on users
  for select using (clinic_id = auth_clinic_id());
-- A user can update only their own profile; admins manage roles.
create policy "users_update_self" on users
  for update using (id = auth.uid())
  with check (id = auth.uid());
create policy "users_admin_manage" on users
  for all using (clinic_id = auth_clinic_id() and auth_is_admin())
  with check (clinic_id = auth_clinic_id() and auth_is_admin());

-- ── Generic tenant tables: full CRUD scoped to the user's clinic ──
create policy "patients_tenant" on patients
  for all using (clinic_id = auth_clinic_id())
  with check (clinic_id = auth_clinic_id());

create policy "appointments_tenant" on appointments
  for all using (clinic_id = auth_clinic_id())
  with check (clinic_id = auth_clinic_id());

create policy "calls_tenant" on calls
  for all using (clinic_id = auth_clinic_id())
  with check (clinic_id = auth_clinic_id());

create policy "missed_calls_tenant" on missed_calls
  for all using (clinic_id = auth_clinic_id())
  with check (clinic_id = auth_clinic_id());

create policy "notifications_tenant" on notifications
  for all using (clinic_id = auth_clinic_id())
  with check (clinic_id = auth_clinic_id());

-- callback_logs are scoped via their parent missed_call's clinic.
create policy "callback_logs_tenant" on callback_logs
  for all using (
    exists (
      select 1 from missed_calls m
      where m.id = callback_logs.missed_call_id
        and m.clinic_id = auth_clinic_id()
    )
  )
  with check (
    exists (
      select 1 from missed_calls m
      where m.id = callback_logs.missed_call_id
        and m.clinic_id = auth_clinic_id()
    )
  );

-- NOTE: The Vapi webhook and missed-call recovery worker use the SUPABASE
-- SERVICE ROLE key, which bypasses RLS. Those code paths resolve clinic_id from
-- the inbound phone number — never from untrusted user input.
