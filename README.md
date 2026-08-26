# ShramSetu AI — Working Prototype

> The digital identity platform for India's informal workforce.
> Built per the NEXHACK 2.0 design + product specification.

A fully working local web prototype. All 33 routes, 3 role experiences, deterministic trust engine, AI matching, mock AI assistant, payment ledger, seed data, localStorage persistence.

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**

That's it. No backend, no database, no env vars.

---

## Demo accounts

The login page has a one-click **Demo Access** block:

| Role | User | Login |
|------|------|-------|
| **Worker** | Ramesh Kumar (Mason, Lucknow) | Click `Worker` button |
| **Contractor** | Raj BuildWorks | Click `Contractor` button |
| **Admin** | ShramSetu Admin | Click `Admin` button |

You can also sign in with phone + OTP (`123456`), Google (mocked), or any of:
- `worker@shramsetu.local` / `demo`
- `contractor@shramsetu.local` / `demo`
- `admin@shramsetu.local` / `admin`

Switch between roles anytime via the avatar dropdown in the top-right.

---

## What's in the box

### 3 role experiences (33 routes)

**Worker (12 pages)**
- Dashboard · Jobs · Job detail · Applications · Profile · Trust · Income · Expenses & Savings · Career · AI Assistant · Notifications · Reports

**Contractor (9 pages)**
- Dashboard · My Jobs · Post Job (5-step wizard) · Job detail · Find Workers · Applicants · Payments · Reviews · Notifications

**Admin (10 pages)**
- Overview · Workers · Contractors · Jobs · Applications · Verifications · Fraud & Safety · Payments · Analytics · Reports

**Plus:** Login + OTP, demo mode banner, role-protected routes, simulated location picker (7 cities).

### Working business logic

- **Trust engine** — deterministic 100-point score (Identity/Work/Skills/Reputation/Reliability) with breakdown
- **AI job matching** — weighted formula (skill/distance/wage/experience/trust/availability) with "why this matches" explanations
- **Fair wage estimator** — profession + experience + city + skill level
- **Mock AI assistant** — intent detection (JOB_SEARCH, WAGE_ESTIMATE, TRUST_CHECK, PAYMENT_STATUS, SAVINGS_ADVICE, CAREER_GUIDANCE, etc.) with contextual responses
- **State propagation** — hire updates applications, job counts, creates notifications, recalculates metrics
- **Payment flow** — mark paid creates worker notification, updates income dashboard
- **Expense tracking** — adds to ledger, recalculates savings rate, updates AI financial guidance
- **Skill assessment** — saves score, boosts trust, creates notification

### Seed data (auto-loads on first run)

- 25 workers · 10 contractors · 1 admin
- 30 jobs · 60 applications · 40 payments
- 50 expenses · 10 savings goals · 40 reviews
- Verification records · fraud signals · safety reports · notifications

All persisted to `localStorage` under key `shramsetu-storage-v1`. Reset via the top-right menu → "Reset demo data".

### Visual design

- Navy + construction orange + cream palette (per NEXHACK spec)
- Inter font · 8px grid · rounded cards · subtle shadows
- Trust rings · progress rings · metric cards · status badges
- Lucide icons · Recharts visualizations
- Fully responsive · mobile-friendly sidebar drawer

---

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with custom design tokens
- **Zustand** with localStorage persistence
- **Recharts** for analytics
- **Lucide React** for icons

No backend. No external API. Everything runs in the browser.

---

## Project structure

```
app/
├── page.tsx                  # Login + OTP
├── layout.tsx                # Root layout (Inter font, globals)
├── globals.css               # Design tokens
├── worker/                   # Worker role (12 pages)
├── contractor/               # Contractor role (9 pages)
└── admin/                    # Admin role (10 pages)
components/
├── ui/                       # Button, Card, Input, Badge, Modal, Tabs, TrustRing, MetricCard…
├── layout/                   # Sidebar, TopBar, AppShell, AuthGuard
└── features/                 # JobCard, WorkerCard
lib/
├── store/                    # Zustand store with all actions
├── services/                 # trustEngine, jobMatching, wageEstimator, aiAssistant
├── data/seed.ts              # Deterministic seed data
├── types/                    # TypeScript types
└── utils/                    # cn, formatINR, haversine, cities
```

---

## Prototype disclaimers

This is a local demo. Production integrations are mocked:
- **SMS OTP** → fixed `123456`
- **Google OAuth** → one-click mock
- **GPS** → 7 selectable cities, Haversine distance
- **Payments** → internal ledger, no real money
- **AI** → deterministic intent router, not an LLM
- **Notifications** → in-app only, no push/SMS/email
- **Verification** → simulated scores

All seed metrics labeled as prototype figures. No real Aadhaar/identity data is collected.

---

## License

MIT — use freely for demos, hackathons, internal prototypes.
