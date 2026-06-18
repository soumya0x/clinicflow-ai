# Installation Guide

## Prerequisites

- **Node.js 18+** (Node 20/22 recommended)
- A **Supabase** project (free tier is fine)
- API keys for **OpenAI** and **Vapi** (optional for UI-only local dev)
- A **Google Cloud** project with the Calendar API (optional)

## 1. Clone & install

```bash
git clone https://github.com/soumya0x/clinicflow-ai.git
cd clinicflow-ai
npm install
```

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in the values — see [ENVIRONMENT.md](ENVIRONMENT.md) for what each one means. At minimum
you need the three Supabase variables to run the dashboard locally.

## 3. Create the database

Open your Supabase project → **SQL Editor**, and run the migration files **in order**:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_google_calendar.sql`

Or, with the Supabase CLI linked to your project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## 4. (Optional) Seed demo data

The seed script creates 5 clinics, 50 patients, 50 appointments, 50 calls, 20 missed calls,
and an admin login per clinic. It uses the **service role key** and bypasses RLS, so only run
it against a development database.

```bash
npm run seed
```

Logins created: `admin@<clinicslug>.com` / `Password123!`
(e.g. `admin@smiledentalclinic.com`).

## 5. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
npm run lint
```

## 6. Connect the voice agent (optional)

See the [Vapi section in DEPLOYMENT.md](DEPLOYMENT.md#3-vapi-voice) to point a phone number at the
`/api/vapi/webhook` endpoint and configure the assistant.

## Troubleshooting

- **"clinic_not_found" from the webhook** — the called number doesn't match any `clinics.phone`.
  Set `DEFAULT_CLINIC_ID` for local testing, or set the clinic's phone to your Vapi number.
- **RLS errors / empty dashboard** — confirm migration `0002_rls.sql` ran and your `users` row
  has the correct `clinic_id`.
- **Google "no_refresh_token"** — revoke prior access and reconnect; we request `prompt=consent`
  to force a refresh token.
