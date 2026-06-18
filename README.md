# ClinicFlow AI

> **Never Miss a Patient Again.**

A 24/7 AI-powered voice receptionist platform for healthcare clinics. ClinicFlow AI answers
every call, books appointments automatically, recovers missed calls, and shows the estimated
revenue impact — all multi-tenant, so one deployment serves many clinics with isolated data.

Built for: Dental · Physiotherapy · Skin · Eye · General Medical clinics.

---

## Features

- **AI Voice Receptionist** — answers calls, books/reschedules/cancels appointments, answers
  FAQs from a per-clinic knowledge base, and transfers to a human when needed (Vapi + OpenAI).
- **Appointment Management** — validation, double-booking prevention, full status lifecycle.
- **Google Calendar Integration** — auto create/update/delete events per booking.
- **Patient CRM** — searchable records, call activity, appointment history.
- **Call Logging** — transcripts, duration, outcomes, recordings.
- **Missed-Call Recovery** — automatic callbacks (retry up to N times), escalation & notifications.
- **Analytics Dashboard** — calls, appointments, conversion, trends (daily/weekly/monthly).
- **Revenue & ROI Dashboard** — clearly-labeled **estimated** revenue, recovery rate, reports.
- **Multi-Tenant SaaS** — per-clinic data, users, settings, and branding via Postgres RLS.
- **Auth & Roles** — Supabase Auth, Admin / Receptionist roles, protected routes.

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend   | Next.js API Routes (TypeScript) |
| Database  | Supabase PostgreSQL + Row-Level Security |
| Auth      | Supabase Auth |
| AI        | OpenAI |
| Voice     | Vapi |
| Calendar  | Google Calendar API |
| Charts    | Recharts |
| Deploy    | Vercel + Supabase |

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in your keys

# 3. Apply the database schema (Supabase SQL editor or CLI)
#    Run the files in supabase/migrations in order: 0001, 0002, 0003

# 4. (Optional) seed demo data
npm run seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000. Sign up to create your clinic (you become the admin), or — if you
seeded — log in with `admin@<clinic>.com` / `Password123!`.

## Documentation

- [Installation guide](docs/INSTALLATION.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Deployment guide (Vercel + Supabase)](docs/DEPLOYMENT.md)
- [API reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)

## Project structure

```
clinicflow-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/            # sign-in, sign-up, forgot/reset password
│   │   ├── (dashboard)/       # protected dashboard + 8 pages
│   │   ├── api/               # REST + Vapi webhook + cron + Google OAuth
│   │   ├── auth/callback/     # Supabase auth code exchange
│   │   ├── layout.tsx · page.tsx · globals.css
│   ├── components/{ui,dashboard,charts,forms}/
│   ├── lib/                   # supabase clients, services, validations, integrations
│   ├── types/                 # database + app types
│   └── middleware.ts          # session refresh + route protection
├── supabase/migrations/       # 0001 schema · 0002 RLS · 0003 google calendar
├── scripts/seed.ts
├── docs/
└── vercel.json                # cron: missed-call recovery worker
```

## Important: revenue is always *estimated*

Every revenue figure in ClinicFlow AI is a **projection** derived from appointment counts and a
configurable average appointment value. It is **never** presented as collected payment. All UI
surfaces are labeled "Estimated Revenue."

## License

Provided as-is for your use. Add a license of your choice.
