# Architecture

## Overview

ClinicFlow AI is a multi-tenant Next.js 15 application backed by Supabase Postgres. Tenant
isolation is enforced **in the database** via Row-Level Security, so a bug in application code
cannot leak one clinic's data to another.

```
                              ┌──────────────────────────────┐
        Phone call            │            Vapi              │
   ───────────────────────▶   │  (telephony + STT/TTS + LLM) │
                              └───────────────┬──────────────┘
                                              │ webhook (tool calls,
                                              │ end-of-call report)
                                              ▼
┌──────────────┐   HTTPS    ┌────────────────────────────────────────────┐
│   Browser    │ ─────────▶ │                Next.js (Vercel)             │
│  (dashboard) │ ◀───────── │                                            │
└──────────────┘            │  App Router (RSC pages, server actions)     │
                            │  /api REST routes  ──┐                       │
                            │  /api/vapi/webhook   │ service-role client   │
                            │  /api/cron/*         │ (bypasses RLS)        │
                            │  /api/google/*       │                       │
                            │  middleware (session + route guard)         │
                            └───────┬───────────────────────┬─────────────┘
                          anon key  │                        │  service role
                        (RLS-scoped)│                        │ (trusted, sessionless)
                                    ▼                        ▼
                            ┌────────────────────────────────────────────┐
                            │            Supabase Postgres                │
                            │  clinics · users · patients · appointments  │
                            │  calls · missed_calls · callback_logs · …   │
                            │  Row-Level Security (auth_clinic_id())       │
                            └────────────────────────────────────────────┘
   External services: OpenAI (reasoning) · Google Calendar (events) · Resend (email)
```

## Key decisions

### 1. Multi-tenancy via RLS
Every tenant table has `clinic_id`. Policies key off `auth_clinic_id()` — a `SECURITY DEFINER`
function that returns the signed-in user's clinic. The user-facing path uses the **anon key**, so
the database itself refuses cross-tenant access. Trusted sessionless paths (webhook, cron,
OAuth callback) use the **service-role key** and resolve `clinic_id` from the inbound phone
number or a signed `state`/`metadata`, never from untrusted request input.

### 2. Two Supabase clients
- `lib/supabase/server.ts` & `client.ts` — anon key, RLS enforced. Default for everything.
- `lib/supabase/service.ts` — service role, RLS bypassed. Webhook, cron, Google callback, seed.

### 3. Voice = Vapi orchestrates, OpenAI reasons, our webhook executes
The assistant is configured with OpenAI **function tools**. Vapi calls our single webhook with
structured tool calls; the server validates them (same Zod schemas as the REST API) and executes
against the DB. The AI never touches the database directly — keeping writes auditable and
consistent. Per-clinic greeting + knowledge base build the system prompt (`lib/knowledge-base.ts`).

### 4. Shared service layer
`lib/services/*` (appointments, patients, analytics, revenue, missed-calls, clinics) holds the
business logic. Both REST routes and the voice webhook call the same functions, so booking rules,
double-booking checks, and revenue math are defined once.

### 5. Missed-call recovery as a state machine
`pending → in_progress → recovered | failed`. The cron worker (`/api/cron/process-callbacks`)
finds due callbacks and runs one attempt each: place an outbound Vapi call, log the attempt,
schedule the next retry, or escalate (notify staff) after the configured retry count. Outbound
call outcomes are reconciled back via the webhook using `metadata.missed_call_id`.

### 6. Revenue is always estimated
`lib/revenue.ts` derives projected revenue from appointment counts × a configurable average
value. The summary object carries a literal `label: "Estimated Revenue"`, and every UI surface
labels it as such. Nothing is presented as collected payment.

### 7. Serverless-friendly
No long-running processes. Background work runs on Vercel Cron. Rate limiting is in-memory by
default (swap for Upstash Redis in multi-instance production).

## Data model (relationships)

```
clinics 1───* users           (clinic_id)
clinics 1───* patients         (clinic_id)
clinics 1───* appointments     (clinic_id, patient_id → patients)
clinics 1───* calls            (clinic_id, patient_id → patients)
clinics 1───* missed_calls     (clinic_id, appointment_id → appointments)
missed_calls 1───* callback_logs (missed_call_id)
clinics 1───* notifications    (clinic_id)
```

- Double-booking is prevented by a **partial unique index** on
  `(clinic_id, appointment_date, appointment_time)` excluding `cancelled`/`no_show`.
- Indexes cover all foreign keys plus common filter/sort columns.

## Request lifecycle (dashboard read)

1. `middleware.ts` refreshes the Supabase session cookie and guards protected routes.
2. A server component calls `getAuthContext()` → resolves `{ profile, clinic }`.
3. It queries Supabase with the anon client; **RLS** scopes rows to the clinic automatically.
4. Data renders server-side; client components handle interactivity (dialogs, charts, filters).

## Security summary

- Input validation (Zod) shared across REST, voice tools, and forms.
- RLS tenant isolation + admin-only settings.
- Webhook signature verification; cron Bearer-token auth.
- Service-role key strictly server-side; secrets via environment variables.
- Consistent error envelope; rate limiting on write-heavy endpoints.
