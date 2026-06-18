# Deployment Guide — Vercel + Supabase

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run migrations in order: `0001_schema.sql`, `0002_rls.sql`,
   `0003_google_calendar.sql`.
3. **Project Settings → API**: copy the Project URL, the `anon` key, and the `service_role` key.
4. **Authentication → URL Configuration**: set the Site URL to your production domain and add
   `<APP_URL>/auth/callback` and `<APP_URL>/reset-password` to the redirect allow-list.
5. (Optional) Disable "Confirm email" under Auth → Providers → Email for a frictionless demo.

## 2. Vercel

1. Import the repo at [vercel.com](https://vercel.com).
2. Framework preset: **Next.js** (auto-detected). No build overrides needed.
3. Add all environment variables from [ENVIRONMENT.md](ENVIRONMENT.md) under
   **Settings → Environment Variables** (Production + Preview).
   - Set `NEXT_PUBLIC_APP_URL` to your Vercel domain.
   - Set `GOOGLE_REDIRECT_URI` to `<APP_URL>/api/google/callback`.
4. Deploy.

### Cron (missed-call recovery)

`vercel.json` already defines a cron that hits `/api/cron/process-callbacks` every minute. Vercel
automatically attaches `Authorization: Bearer $CRON_SECRET`, so just ensure `CRON_SECRET` is set
as a project env var. (Cron requires a Pro plan for sub-daily schedules; on Hobby, change the
schedule to a supported interval or trigger the endpoint from an external scheduler.)

## 3. Vapi (voice)

1. Create an assistant in the [Vapi dashboard](https://vapi.ai). Set its **Server URL** to
   `<APP_URL>/api/vapi/webhook` and the **Server URL Secret** to your `VAPI_WEBHOOK_SECRET`.
   (You can also build the assistant config programmatically — see `buildAssistantConfig()` in
   `src/lib/vapi.ts`.)
2. Buy/import a phone number and attach the assistant. Set the clinic's `phone` field (in
   Settings) to that number so the webhook can resolve the tenant by the called number.
3. For outbound recovery callbacks, set `VAPI_PHONE_NUMBER_ID` and `VAPI_ASSISTANT_ID`.

## 4. Google Calendar (optional)

1. In Google Cloud Console, enable the **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add `<APP_URL>/api/google/callback` as an authorized redirect URI.
4. Put the client id/secret in env vars.
5. In the app: **Settings → Google Calendar → Connect** (admin only).

## 5. Post-deploy checks

- Sign up → confirm a clinic + admin user are created.
- Create an appointment → verify double-booking is rejected on the same slot.
- POST a test payload to `/api/vapi/webhook` (with the secret header) → verify a call is logged.
- Hit `/api/cron/process-callbacks` with the Bearer token → verify it returns `{ processed: ... }`.

## Production hardening checklist

- [ ] Swap the in-memory rate limiter (`src/lib/rate-limit.ts`) for Upstash Redis.
- [ ] Enable email confirmation in Supabase Auth.
- [ ] Restrict the service role key to server env only (never `NEXT_PUBLIC_`).
- [ ] Add monitoring/alerting on the cron worker.
- [ ] Review RLS policies against your tenancy requirements.
