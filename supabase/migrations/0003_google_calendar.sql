-- ============================================================================
-- Google Calendar integration: per-clinic OAuth tokens + target calendar.
-- Tokens are sensitive; they are only ever read server-side (service role or
-- the clinic admin via RLS). Never exposed to the browser.
-- ============================================================================

alter table clinics
  add column if not exists google_refresh_token text,
  add column if not exists google_calendar_id   text default 'primary',
  add column if not exists google_connected      boolean not null default false;
