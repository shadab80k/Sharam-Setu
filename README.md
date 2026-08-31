# 🏗️ ShramSetu AI

> **Production-grade digital identity, fair-wage & trust platform for India's informal workforce.**
> Real Postgres database · Real authentication · Server-authoritative trust scores · Escrow payment ledger · LLM assistant · Live admin analytics.

**Live deployment:** **https://6b4vx78a.insforge.site** (seeded demo data, sign in with one click)

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![InsForge](https://img.shields.io/badge/Backend-InsForge-6E56CF?style=flat-square)](https://insforge.com)
[![Postgres](https://img.shields.io/badge/DB-Postgres_+_RLS-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Zustand](https://img.shields.io/badge/State-Zustand_5-orange?style=flat-square)](https://github.com/pmndrs/zustand)
[![E2E](https://img.shields.io/badge/E2E-35/35_passing-brightgreen?style=flat-square)](#-end-to-end-verification)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG_AA-success?style=flat-square)](#-accessibility--performance)

---

## 🌟 What is this?

A full-stack marketplace connecting construction **workers** and **contractors**, built around a portable **verified trust score**:

- **Workers** get a digital identity: verified profile, 100-point trust score, job matches with pay/radius/skill transparency, an income & expense ledger, savings goals, skill assessments, and a Hindi/Hinglish AI assistant.
- **Contractors** post jobs, review ranked applicants, hire, record wage payments, and leave verified reviews.
- **Admins** run the platform: verification approvals, suspensions, fraud & safety signals, escrow audits, and **live analytics computed from real data** — no prototype figures anywhere.

### Honest scope note
Within this deployment, three integrations are **structurally ready but intentionally simulated** (no paid third-party accounts were available):
1. **SMS OTP** — dev mode returns the code on screen; drop in MSG91/Twilio keys and it goes live (see `lib/server/sms/provider.ts`).
2. **Payments** — a real double-entry escrow **ledger** with status transitions & audit trail, but no actual money movement; Razorpay keys can be wired in later.
3. **Aadhaar KYC** — verification requests land with an admin for review instead of a licensed vendor check.

---

## 🚀 Quick Start (local)

### Prerequisites
- Node.js 18.17+ / 20+
- An InsForge project (Postgres + Auth) — free tier works

```bash
git clone https://github.com/shadab80k/Sharam-Setu.git
cd Sharam-Setu
npm install
```

### 1. Create your InsForge backend

```bash
npx -y @insforge/cli create shramsetu     # or `link` to an existing project
```

### 2. Apply migrations & seed

```bash
# migrations/ folder is applied via the InsForge dashboard SQL editor or:
npx -y @insforge/cli db import --file migrations/20260831045747_core-schema.sql
# ...apply each migration in order, then:
npx tsx scripts/seed.mts
```

### 3. Configure `.env.local`

```ini
# Public (client) — safe to expose
NEXT_PUBLIC_INSFORGE_URL=https://<project>.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=anon_...

# Server-only — NEVER prefix with NEXT_PUBLIC_
INSFORGE_URL=https://<project>.insforge.app
INSFORGE_API_KEY=ik_...

# Optional integrations
OPENROUTER_API_KEY=sk-or-...              # AI assistant (falls back to rule engine without it)
CRON_SECRET=<32-byte hex>                 # protects /api/cron
NEXT_PUBLIC_DEV_OTP_MODE=true             # dev only: show OTP on login screen
```

### 4. Run

```bash
npm run dev          # http://localhost:3000
```

---

## 🔑 Demo Accounts (password `demo1234`)

| Role | Profile | Sign in |
|---|---|---|
| 👷 **Worker** | **Ramesh Kumar** — Master Mason · Lucknow · **79 High Trust** | one-click **Worker** button, or `worker@shramsetu.local` |
| 🏗️ **Contractor** | **Raj BuildWorks** — verified builder · 4.3★ | one-click **Contractor** button, or `contractor@shramsetu.local` |
| 🏛️ **Admin** | **ShramSetu Admin** — compliance & analytics | one-click **Admin** button, or `admin@shramsetu.local` |

Phone OTP login: **9876543210** (or any seeded worker number) — in dev mode the code appears on screen.

The seed creates **36 auth users** (25 workers, 10 contractors, 1 admin), 31 jobs, ~60 applications, a full payments ledger, expenses, savings goals, reviews, verifications, work history, assessments, fraud signals and safety reports spread across ~6 months — so every chart and dashboard renders from real rows.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 14 App Router (this repo)                           │
│  ├── 34 role-scoped pages (worker/contractor/admin)          │
│  ├── Zustand store = per-user cache over real APIs            │
│  │     (identical selector API — pages stay declarative)      │
│  └── Realtime subscriptions (notifications, payments, trust)  │
├──────────────────────────────────────────────────────────────┤
│  app/api/* — BFF route handlers (server-only service key)     │
│  ├── zod validation + role-based access on every write        │
│  ├── Atomic business logic in Postgres RPCs:                  │
│  │     hire_applicant · mark_payment_paid · sweep_due_payments│
│  └── Sessions via InsForge Auth (httpOnly cookies)            │
├──────────────────────────────────────────────────────────────┤
│  InsForge Postgres — 22 tables, RLS on all of them            │
│  ├── Server-authoritative trust engine (plpgsql, 100 pts)     │
│  ├── Append-only trust_events + payments ledger audit         │
│  ├── Guard triggers: role immutability, escrow transitions    │
│  └── Realtime channels (user:<id>, jobs:<city>)               │
└──────────────────────────────────────────────────────────────┘
```

### Security model
- **Client SDK is read-only**: every mutation goes through server routes that hold the service key. Even then, RLS + `REVOKE INSERT, UPDATE, DELETE ON ALL TABLES FROM anon, authenticated` means the anon key cannot write anything.
- **Trust scores are server-authoritative**: computed by `worker_trust_breakdown()` / `contractor_trust_breakdown()` in Postgres, recalculated by triggers on verifications, assessments, work history, applications, payments, safety reports, fraud signals and reviews. The API rejects/strips client-supplied trust scores (covered by an E2E assertion).
- **Role walls**: `is_admin()` / `is_worker()` / `is_contractor()` SECURITY DEFINER helpers drive all RLS policies; suspended users are blocked at session level.
- **Escrow integrity**: payments are insert-only with guard triggers (job/worker/contractor/amount immutable, `paid` is terminal); due/overdue sweeps run as an atomic RPC behind a cron secret.

### Repository layout

```
shramsetu/
├── app/
│   ├── api/                    # BFF route handlers (auth, jobs, applications,
│   │                           #   payments, worker/admin actions, assistant, cron)
│   ├── worker/ | contractor/ | admin/   # 34 role-scoped pages
│   └── page.tsx                # Login (phone OTP / Google / email / signup)
├── components/                 # features/ layout/ ui/
├── lib/
│   ├── server/                 # service-key clients, session, mappers, SMS providers
│   ├── store/                  # Zustand sync layer (optimistic updates + rollback)
│   ├── services/               # trust + matching + wage algorithms (shared logic)
│   └── api/                    # typed fetch client
├── migrations/                 # ordered SQL: schema → RLS → trust engine → realtime → grants
├── scripts/
│   ├── seed.mts                # deterministic demo data + server trust recalc
│   └── e2e.mts                 # 35-assertion live E2E suite
└── middleware.ts               # session refresh
```

---

## 🧪 End-to-end verification

Run the full live suite against any deployment:

```bash
BASE_URL=https://6b4vx78a.insforge.site npx tsx scripts/e2e.mts
# (local default: http://localhost:3001)
```

Covers: login (all 3 roles + wrong password + OTP), bootstrap data scoping per role, job matching with server-computed scores, apply → hire → `workers_hired` increment, payment create/RBAC/double-pay guard, verification workflow (request → admin approve → trust recalc), RBAC negatives (worker can't post jobs or read admin analytics, `trustScore` strip test), assistant (LLM + history + worker-only), and analytics (real aggregates + admin-only).

**Latest run: 35/35 passed — including against the production URL.**

---

## ⏰ Scheduled jobs

Two InsForge schedules hit `/api/cron` with the stored `CRON_SECRET`:

| Job | Schedule | Action |
|---|---|---|
| `escrow-sweep` | daily 06:00 | `pending → due → overdue` transitions + notifications |
| `trust-recompute` | nightly 03:00 | full-network trust recalculation |

---

## 🔌 Swapping in real integrations

| Capability | Today | To go live |
|---|---|---|
| SMS OTP | dev code on screen | add `MSG91_AUTH_KEY` / `TWILIO_*` env vars — provider auto-detects |
| Payments | escrow ledger (simulated) | add Razorpay keys; ledger + statuses already model the flow |
| KYC | admin-reviewed requests | contract a licensed Aadhaar/KYC vendor, call it in the approve step |
| AI assistant | OpenRouter (Gemini 2.5 Flash) + rule fallback | key already wired; swap model via `OPENROUTER_CHAT_MODEL` |

---

## 📊 Accessibility & Performance

- WCAG 2.1 AA contrast, full `aria-label` coverage, keyboard-navigable modals and tables.
- Skeleton-shimmer loading states, GPU-composited animations, code-split chart components.
- 100/100 Lighthouse SEO on static routes.

---

## 📄 License

MIT — built with ❤️ for India's Shramiks.
