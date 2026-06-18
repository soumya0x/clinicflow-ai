# Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Never commit `.env.local`.

## App

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | yes | Base URL of the app (e.g. `http://localhost:3000` or your Vercel URL). Used for OAuth redirects and the Vapi server URL. |

## Supabase

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL. Safe for the browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon/publishable key. Respects RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (server) | **Bypasses RLS. Server-only.** Used by the Vapi webhook, cron worker, Google callback, and seed script. Never expose to the client. |
| `SUPABASE_PROJECT_ID` | optional | Project ref, used by `npm run db:types`. |

## OpenAI

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | for voice | OpenAI API key. |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini`. |

## Vapi (voice)

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPI_API_KEY` | for voice | Private key. Used to place outbound recovery calls. |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | optional | Public key (for any client-side web calling). |
| `VAPI_WEBHOOK_SECRET` | for voice | Shared secret to verify inbound webhooks (`x-vapi-secret`). |
| `VAPI_PHONE_NUMBER_ID` | for callbacks | Vapi phone number id used for outbound recovery calls. |
| `VAPI_ASSISTANT_ID` | for callbacks | Vapi assistant id used for outbound recovery calls. |

## Google Calendar

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | for calendar | OAuth client id. |
| `GOOGLE_CLIENT_SECRET` | for calendar | OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | for calendar | Must equal `<APP_URL>/api/google/callback` and match the Google console. |

## Cron / worker

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | for recovery | Bearer token protecting `/api/cron/process-callbacks`. Vercel Cron sends this automatically when set as a project env var. |

## Email notifications (optional)

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | optional | Enables email alerts via Resend. |
| `NOTIFICATIONS_FROM_EMAIL` | optional | From address for alert emails. |

## Local testing helpers

| Variable | Required | Description |
|----------|----------|-------------|
| `DEFAULT_CLINIC_ID` | optional | Fallback clinic for the Vapi webhook when the called number doesn't match a clinic. Handy for local testing. |
