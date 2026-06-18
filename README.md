<div align="center">

# 🏥 ClinicFlow AI

### ☎️ The 24/7 AI Voice Receptionist for Healthcare Clinics

**_"Never Miss a Patient Again."_**

ClinicFlow AI answers every call, books appointments automatically, recovers missed calls, and shows the **estimated revenue impact** — multi-tenant, so one deployment powers many clinics with fully isolated data. 🚀

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Vapi](https://img.shields.io/badge/Vapi-Voice-5C2D91?style=for-the-badge)](https://vapi.ai/)

[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![CI](https://github.com/soumya0x/clinicflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/soumya0x/clinicflow-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](#-contributing)
![Status](https://img.shields.io/badge/status-production--ready-success?style=flat-square)

<br/>

[✨ Features](#-features) · [🧰 Tech Stack](#-tech-stack) · [⚡ Quick Start](#-quick-start) · [🏛️ Architecture](#️-architecture) · [📚 Docs](#-documentation) · [🚢 Deploy](#-deployment)

</div>

---

## 💡 Why ClinicFlow AI?

Front desks miss calls. Missed calls are missed patients — and missed revenue. ClinicFlow AI is an always-on voice receptionist that turns every ring into a booked appointment.

| Problem 😟 | ClinicFlow AI ✅ |
|------------|------------------|
| Calls go unanswered after hours | 📞 Answers **24/7**, day or night |
| Manual, error-prone booking | 🗓️ **Auto-books** straight into the calendar |
| Missed calls are lost forever | 🔁 **Auto-recovers** with smart callbacks |
| No idea what calls are worth | 💰 **Estimated revenue & ROI** dashboard |
| One system per clinic | 🏢 **Multi-tenant** with isolated data |

> 🎯 **Built for:** Dental · Physiotherapy · Skin · Eye · General Medical clinics.

---

## 📸 Preview

> 💡 _Drop your screenshots into `docs/screenshots/` and they'll render here. Suggested captures below._

<div align="center">

| 📊 Dashboard | 🗓️ Appointments |
|:---:|:---:|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Appointments](docs/screenshots/appointments.png) |
| **💰 Revenue & ROI** | **🔁 Missed-Call Recovery** |
| ![Revenue](docs/screenshots/revenue.png) | ![Missed Calls](docs/screenshots/missed-calls.png) |

🎥 _Tip: record a 20–30s Loom/GIF of a live call booking an appointment and embed it here for maximum wow._

</div>

---

## ✨ Features

- 🤖 **AI Voice Receptionist** — answers calls, books / reschedules / cancels appointments, answers FAQs from a per-clinic knowledge base, and transfers to a human when needed _(Vapi + OpenAI tool-calling)_.
- 🗓️ **Smart Appointments** — validation, **double-booking prevention**, and a full status lifecycle (scheduled → confirmed → completed / cancelled / no-show).
- 📆 **Google Calendar Sync** — automatically creates, updates, and deletes calendar events per booking.
- 🧑‍⚕️ **Patient CRM** — searchable records with call activity and appointment history.
- 📝 **Call Logging** — transcripts, duration, outcomes, and recordings.
- 🔁 **Missed-Call Recovery** — auto callbacks with retries, escalation, and staff notifications.
- 📊 **Analytics Dashboard** — calls, appointments, conversion, and trends (daily / weekly / monthly) with **Recharts**.
- 💰 **Revenue & ROI Dashboard** — clearly-labeled **estimated** revenue, recovery rate, and downloadable reports.
- 🏢 **Multi-Tenant SaaS** — per-clinic data, users, settings, and branding enforced by **Postgres Row-Level Security**.
- 🔐 **Auth & Roles** — Supabase Auth with **Admin / Receptionist** roles and protected routes.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| 🖥️ **Frontend** | Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| ⚙️ **Backend** | Next.js API Routes (TypeScript) |
| 🗄️ **Database** | Supabase PostgreSQL + Row-Level Security |
| 🔑 **Auth** | Supabase Auth |
| 🧠 **AI** | OpenAI |
| 🎙️ **Voice** | Vapi |
| 📆 **Calendar** | Google Calendar API |
| 📈 **Charts** | Recharts |
| ▲ **Deploy** | Vercel + Supabase |

---

## ⚡ Quick Start

```bash
# 1️⃣  Clone & install
git clone https://github.com/soumya0x/clinicflow-ai.git
cd clinicflow-ai
npm install

# 2️⃣  Configure environment
cp .env.example .env.local   # then fill in your keys 🔑

# 3️⃣  Set up the database (Supabase SQL editor or CLI)
#     Run supabase/migrations in order: 0001 → 0002 → 0003

# 4️⃣  (Optional) seed demo data 🌱
npm run seed

# 5️⃣  Launch 🚀
npm run dev
```

Open **http://localhost:3000**. Sign up to create your clinic (you become the admin) — or, if you seeded, log in with `admin@<clinic>.com` / `Password123!`.

---

## 🏛️ Architecture

```text
          ☎️ Phone call
               │
               ▼
        ┌──────────────┐   webhook (tool calls,
        │     Vapi      │──  end-of-call report)
        │ STT · TTS · LLM│            │
        └──────────────┘             ▼
🌐 Browser ─────────▶ ┌─────────────────────────────────┐
   (dashboard)        │        Next.js (Vercel)         │
                      │  RSC pages · API routes          │
                      │  /api/vapi/webhook · /api/cron    │
                      │  middleware (auth + guard)        │
                      └───────┬───────────────┬───────────┘
              anon key (RLS)  │               │  service role (trusted)
                              ▼               ▼
                      ┌─────────────────────────────────┐
                      │       🗄️ Supabase Postgres        │
                      │  Row-Level Security per clinic    │
                      └─────────────────────────────────┘
   🧠 OpenAI   📆 Google Calendar   ✉️ Resend (email)
```

**Highlights**
- 🛡️ **Tenant isolation in the database** — RLS means even an app bug can't leak Clinic A's data to Clinic B.
- ♻️ **Shared service layer** — REST routes and the voice webhook reuse the same validated business logic.
- 🔄 **Missed-call recovery state machine** — `pending → in_progress → recovered / failed`, driven by a serverless cron worker.
- 💸 **Revenue is always _estimated_** — projected from appointment value, never shown as collected cash.

📖 Full deep-dive in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🗂️ Project Structure

```text
clinicflow-ai/
├── 📁 src/
│   ├── app/
│   │   ├── (auth)/          # 🔐 sign-in, sign-up, forgot/reset password
│   │   ├── (dashboard)/     # 📊 protected dashboard + 8 pages
│   │   ├── api/             # ⚙️ REST + Vapi webhook + cron + Google OAuth
│   │   └── layout.tsx · page.tsx · globals.css
│   ├── components/{ui,dashboard,charts,forms}/
│   ├── lib/                 # 🧩 supabase clients, services, validations, integrations
│   ├── types/               # 🧾 database + app types
│   └── middleware.ts        # 🚦 session refresh + route protection
├── 🗄️ supabase/migrations/  # 0001 schema · 0002 RLS · 0003 google calendar
├── 🌱 scripts/seed.ts
├── 📚 docs/
└── ▲ vercel.json            # ⏰ cron: missed-call recovery worker
```

---

## 📚 Documentation

| Guide | What's inside |
|-------|---------------|
| 📦 [Installation](docs/INSTALLATION.md) | Local setup, database, seeding |
| 🔧 [Environment](docs/ENVIRONMENT.md) | Every env var explained |
| 🚢 [Deployment](docs/DEPLOYMENT.md) | Vercel + Supabase + Vapi + Google |
| 🔌 [API Reference](docs/API.md) | All endpoints & payloads |
| 🏛️ [Architecture](docs/ARCHITECTURE.md) | Design decisions & data model |

---

## 🚢 Deployment

Deploys cleanly to **Vercel** (frontend + API + cron) with **Supabase** (database + auth). Full step-by-step in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 💰 A Note on "Estimated Revenue"

> ⚠️ Every revenue figure in ClinicFlow AI is a **projection**, derived from appointment counts × a configurable average appointment value. It is **never** presented as collected payment, and every UI surface is labeled **"Estimated Revenue."**

---

## 🤝 Contributing

Contributions are welcome! 🙌

1. 🍴 Fork the repo
2. 🌿 Create a branch — `git checkout -b feat/amazing-thing`
3. ✅ Run `npm run lint && npm run typecheck`
4. 📩 Open a pull request

---

## 📜 License

Released under the **MIT License** — see [LICENSE](LICENSE). 

---

<div align="center">

Built with ❤️ for clinics that never want to miss a patient.

⭐ **If this project helps you, give it a star!** ⭐

</div>
