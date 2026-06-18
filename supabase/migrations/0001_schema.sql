-- ============================================================================
-- ClinicFlow AI — Core schema
-- Multi-tenant: every tenant-owned row carries clinic_id.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
create type user_role as enum ('admin', 'receptionist');

create type appointment_status as enum (
  'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
);

create type booking_source as enum (
  'ai_voice', 'missed_call_recovery', 'human_callback', 'manual'
);

create type call_outcome as enum (
  'appointment_booked', 'information_requested', 'human_transfer',
  'missed_call', 'callback_completed'
);

create type callback_status as enum (
  'pending', 'in_progress', 'recovered', 'failed'
);

create type callback_result as enum (
  'appointment_booked', 'human_callback_requested', 'information_requested',
  'no_answer', 'invalid_number'
);

create type revenue_source as enum (
  'direct_call', 'missed_call_recovery', 'human_callback', 'manual'
);

create type after_hours_behavior as enum ('callback', 'voicemail', 'transfer');

create type notification_type as enum (
  'callback_failed', 'human_callback_requested', 'appointment_booked', 'missed_call'
);

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

-- Clinics (tenants). Holds branding + per-tenant settings.
create table clinics (
  id                        uuid primary key default uuid_generate_v4(),
  name                      text not null,
  phone                     text not null,
  email                     text,
  address                   text,
  logo_url                  text,
  timezone                  text not null default 'Asia/Kolkata',
  -- Voice / branding
  greeting_message          text not null default 'Hi! Thanks for calling. How can I help you today?',
  emergency_number          text default '+91-9999999999',
  -- Business hours stored as JSONB: { "mon": ["09:00","19:00"], ... , "sun": null }
  business_hours            jsonb not null default '{
    "mon": ["09:00","19:00"], "tue": ["09:00","19:00"], "wed": ["09:00","19:00"],
    "thu": ["09:00","19:00"], "fri": ["09:00","19:00"], "sat": ["09:00","19:00"], "sun": null
  }'::jsonb,
  -- Revenue settings (all amounts in minor-unit-free integers, e.g. INR)
  consultation_fee          numeric(10,2) not null default 500,
  average_appointment_value numeric(10,2) not null default 1500,
  average_treatment_value   numeric(10,2) not null default 2000,
  revenue_calculation_method text not null default 'average_appointment_value',
  -- Missed-call recovery settings
  callback_delay_seconds    integer not null default 120,
  callback_retry_count      integer not null default 3,
  after_hours_action        after_hours_behavior not null default 'callback',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Application users (1:1 with auth.users). Maps a user to a clinic + role.
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  clinic_id   uuid not null references clinics(id) on delete cascade,
  role        user_role not null default 'receptionist',
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

create table patients (
  id               uuid primary key default uuid_generate_v4(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  name             text not null,
  phone            text not null,
  email            text,
  notes            text,
  last_appointment timestamptz,
  total_calls      integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (clinic_id, phone)
);

create table appointments (
  id               uuid primary key default uuid_generate_v4(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  patient_id       uuid references patients(id) on delete set null,
  appointment_date date not null,
  appointment_time time not null,
  reason           text,
  status           appointment_status not null default 'scheduled',
  booking_source   booking_source not null default 'ai_voice',
  estimated_value  numeric(10,2) not null default 0,
  google_event_id  text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Prevent double-booking the same slot within a clinic. Partial index so a
-- cancelled/no-show slot can be rebooked.
create unique index uq_clinic_active_slot
  on appointments (clinic_id, appointment_date, appointment_time)
  where status not in ('cancelled', 'no_show');

create table calls (
  id            uuid primary key default uuid_generate_v4(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  patient_id    uuid references patients(id) on delete set null,
  caller_phone  text not null,
  transcript    text,
  duration      integer not null default 0, -- seconds
  outcome       call_outcome,
  vapi_call_id  text,
  recording_url text,
  created_at    timestamptz not null default now()
);

create table missed_calls (
  id                uuid primary key default uuid_generate_v4(),
  clinic_id         uuid not null references clinics(id) on delete cascade,
  caller_phone      text not null,
  missed_at         timestamptz not null default now(),
  callback_attempts integer not null default 0,
  callback_status   callback_status not null default 'pending',
  final_outcome     callback_result,
  appointment_id    uuid references appointments(id) on delete set null,
  estimated_revenue numeric(10,2) not null default 0,
  revenue_source    revenue_source default 'missed_call_recovery',
  next_attempt_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table callback_logs (
  id             uuid primary key default uuid_generate_v4(),
  missed_call_id uuid not null references missed_calls(id) on delete cascade,
  callback_time  timestamptz not null default now(),
  duration       integer not null default 0,
  result         callback_result,
  transcript     text,
  created_at     timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  message     text,
  related_id  uuid,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Indexes (foreign keys + common filter/sort columns)
-- ─────────────────────────────────────────────────────────────
create index idx_users_clinic            on users(clinic_id);
create index idx_patients_clinic         on patients(clinic_id);
create index idx_patients_phone          on patients(clinic_id, phone);
create index idx_patients_name           on patients using gin (to_tsvector('simple', name));
create index idx_appointments_clinic     on appointments(clinic_id);
create index idx_appointments_patient    on appointments(patient_id);
create index idx_appointments_date       on appointments(clinic_id, appointment_date);
create index idx_appointments_status     on appointments(clinic_id, status);
create index idx_calls_clinic            on calls(clinic_id);
create index idx_calls_created           on calls(clinic_id, created_at desc);
create index idx_calls_outcome           on calls(clinic_id, outcome);
create index idx_missed_clinic           on missed_calls(clinic_id);
create index idx_missed_status           on missed_calls(clinic_id, callback_status);
create index idx_missed_next_attempt     on missed_calls(next_attempt_at) where callback_status in ('pending','in_progress');
create index idx_callback_logs_missed    on callback_logs(missed_call_id);
create index idx_notifications_clinic    on notifications(clinic_id, read, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_clinics_updated     before update on clinics      for each row execute function set_updated_at();
create trigger trg_patients_updated    before update on patients     for each row execute function set_updated_at();
create trigger trg_appointments_updated before update on appointments for each row execute function set_updated_at();
create trigger trg_missed_updated      before update on missed_calls for each row execute function set_updated_at();
