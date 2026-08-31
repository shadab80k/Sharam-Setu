# ShramSetu AI — System Status & Production-Readiness Report

**Date:** 2026-08-31 · **Live:** https://6b4vx78a.insforge.site · **Branch:** `testing` (pushed)
**Verification status:** E2E 35/35 on production URL · Build 57/57 pages · TypeScript 0 errors

---

## 1. System Overview

ShramSetu is a two-sided marketplace (workers ↔ contractors) with an admin governance layer, built on:

| Layer | Technology |
|---|---|
| Frontend | Next.js 14.2.5 (App Router), 34 role-scoped pages, Tailwind, Recharts, Zustand |
| API | Next.js Route Handlers (BFF pattern) — zod validation, RBAC, server-only service key |
| Database | InsForge Postgres — 22 tables, RLS on every table, 6 migrations |
| Auth | InsForge Auth — phone OTP (custom), email/password, Google OAuth (wired, keys pending) |
| Realtime | InsForge websocket — `user:<id>` channels (notifications, payments, trust) |
| AI | OpenRouter (Gemini 2.5 Flash) with rule-engine fallback |
| Jobs | 2 InsForge schedules (escrow sweep 06:00, trust recompute 03:00) behind CRON_SECRET |
| Hosting | Vercel via InsForge deployments |

**Security model:** client SDK is strictly read-only (`REVOKE all DML from anon/authenticated`); every mutation goes through server routes; trust scores are computed exclusively in Postgres and cannot be influenced by the client (E2E-asserted).

---

## 2. ✅ Fully Working (verified with evidence)

### Authentication & Sessions
- Phone-OTP login: 6-digit code, SHA-256 hashed with server salt, 5-min TTL, max 5 attempts, 60s resend cooldown, 3-per-10-min rate limit. Dev mode displays the code on-screen.
- Email/password login + full signup (new users get profile rows + welcome notification).
- Sessions via httpOnly refresh cookies + middleware refresh; suspension blocks login.
- Google OAuth: full flow implemented (verifier cookie + callback); needs provider keys in InsForge dashboard.

### Database & Security
- 22 tables with FK cascades, CHECK constraints, indexes, `touch_updated_at` triggers.
- RLS on every table with `is_admin()/is_worker()/is_contractor()` SECURITY DEFINER helpers.
- Guard triggers: role immutable, `workers_hired` monotonic, payments insert-only with terminal `paid`, application ownership, status-transition guards.
- RBAC negatives verified: worker→admin routes 403, worker→job-post 403, analytics admin-only, double-payment 400, `trustScore` client write stripped + recomputed.

### Trust Engine (core IP) — server-authoritative
- 100-point plpgsql algorithm: Identity 20 · Work History 20 · Skills 20 · Reputation 20 · Reliability 20.
- Labels: Excellent (90+), High Trust (75+), Trusted (60+), Building (40+), Low (<40).
- Automatic recalculation triggers on verifications, assessments, work history, applications, payments, safety reports, fraud signals, reviews.
- Append-only `trust_events` audit trail (rendered as the worker's score trend).
- Nightly full-network recompute schedule.

### Marketplace
- Job posting wizard (contractor) with city validation, drafts, lifecycle (draft→active→completed/closed).
- Server-side match scoring (skills, Haversine distance, wage vs expected, availability) with "why this matches" cards.
- Apply / withdraw; full status pipeline (applied→viewed→shortlisted→interview→selected/rejected, →completed).
- Atomic `hire_applicant` RPC (workers_hired increment + duplicate protection + notifications).

### Payments / Escrow Ledger
- Immutable ledger rows; contractor creates, marks paid; worker marks received.
- Escrow state machine: pending → due → overdue via atomic `sweep_due_payments` RPC.
- Daily 06:00 sweep schedule (verified live: 200 with secret, 401 without).
- Notifications to both sides on transitions.

### AI Assistant
- Gemini 2.5 Flash via OpenRouter, Hindi/Hinglish responses (<120 words), worker's live context (trust breakdown, payments, matches).
- Persisted history per user, clear option, worker-only RBAC, deterministic rule-engine fallback when no key.

### Portals (all real data — the old hardcoded `usr_c_1` scoping bug is fixed, 9/9 checks)
- **Worker (12 pages):** dashboard, jobs, applications, income ledger, expenses & savings, profile, trust score, career, assistant, notifications, reports.
- **Contractor (9 pages):** dashboard (own jobs only), jobs CRUD, applicants pipeline, payments, reviews (session-scoped), notifications.
- **Admin (10 pages):** overview, registries, verifications (approve/reject workflow), fraud & safety, payments audit, analytics — every number aggregated from live DB rows ("Prototype demo figures" badge removed everywhere).

### Infra & Ops
- Production deployment live with all env vars; E2E suite passes against the production URL.
- Realtime store hydration; optimistic UI with rollback on API errors.
- `admin_audit_log` for every admin action; deterministic seed (36 users, ~6-month activity, hero account Ramesh Kumar 78–79 High Trust).

---

## 3. 🟡 Partially Real (stored in DB, but not derived from behaviour)

| Item | Detail | Fix |
|---|---|---|
| Contractor `paymentReliability`, `responseRate`, `completedJobs` | Seeded static values; trust recalc updates only trust_score/label, not these three | Compute from payments ledger (on-time %), application responses, completed jobs |
| Worker "Today's Income" label | Shows total paid income (real number, mislabeled) | Bucket by paid date |

---

## 4. 🟠 Simulated by Design (structure ready, needs external accounts/keys)

| Capability | Today | To go live (effort) |
|---|---|---|
| SMS OTP | Code shown on screen in dev mode | Add `MSG91_AUTH_KEY` or Twilio keys — providers already written, zero code change (~1 day incl. testing) |
| Money movement | Real escrow ledger & statuses; no actual transfer | Razorpay business KYC → order+capture + webhook to mark ledger paid (~3–5 days) |
| Aadhaar KYC | Worker request → admin review (no self-verify — deliberate security choice) | Licensed KYC vendor API wired into the approve step (~1 week incl. legal) |
| Google sign-in | Full flow implemented | Create Google Cloud OAuth client, add keys in InsForge dashboard (~1 hour) |

---

## 5. ❌ Not Yet Implemented (product gaps)

### 5.1 📍 Location logic — incomplete (no real location system)

**Current state:**
- `currentLocation` is a Zustand UI preference that **defaults to `"lucknow"` for every user** (`lib/store/index.ts:135`).
- The dashboard/TopBar location button **cycles through cities round-robin** on click — a demo-era UX hack, not a real selector.
- `navigator.geolocation` / IP-based detection is **never used** anywhere in the codebase.
- The signup form has **no city field** — the API silently defaults location to `"lucknow"` (`app/api/auth/signup/route.ts:12`).
- The worker profile page only **displays** `user.location`; there is no edit UI.
- Job "Near me" filter and match distances use the selected city's **centre lat/lng** (Haversine from `lib/utils/cities`), not the user's actual position.

**What a production version needs:**
1. GPS one-tap detect (`navigator.geolocation`) with graceful fallback to city picker + IP hint.
2. Signup onboarding: mandatory city selection (dropdown of supported cities).
3. Profile: editable city + optional locality/area with pin-code.
4. Persist the worker's real location on `users.location` (API already supports it — `PATCH /api/worker/profile` accepts `location`); make `currentLocation` derive from the profile instead of a separate UI state.
5. Distance matching from the worker's actual coords (schema already has `latitude/longitude` on jobs).

### 5.2 🧭 First-time-user onboarding — missing entirely

**Current state:**
- After signup, the new worker is dropped straight on `/worker/dashboard` with a near-empty profile (profession `"Helper"`, 0 experience, ₹0 wage, no skills) — no wizard, no checklist, no guidance.
- Profile completion % is computed by the trust function, but the UI never uses it to drive a "complete your profile" flow.
- A fresh contractor lands on the dashboard with no company details and no prompt to post a first job.

**What a production version needs:**
1. Post-signup onboarding wizard (worker): profession → experience → expected wage → skills → city/locality → languages → availability. Every field already has an API (`PATCH /api/worker/profile`) — this is a pure UI flow (~1–2 days).
2. Onboarding checklist card on the dashboard driven by profile completion (phone verified ✓, add photo, complete skills, first assessment…).
3. Contractor onboarding: company name, GST (optional), contact person, then "post your first job" CTA.

### 5.3 ✏️ Worker profile edit UI — API ready, UI missing

**Current state:** the profile API accepts **12 editable fields** — `profession, experienceYears, expectedDailyWage, availability, bio, preferredRadiusKm, languages, skills, certifications, name, location, avatar` — but the profile page exposes edit UI for **only 2** (bio and expected wage). A worker cannot change profession, experience, skills, languages or location from the UI at all.

**Fix:** add edit modals/sections for the remaining fields — API needs zero changes (~1 day).

### 5.4 🏗️ Contractor profile page — doesn't exist

`/api/contractor/profile` route exists, but the contractor portal has **no profile/settings page** (only dashboard, jobs, applicants, payments, reviews, workers, notifications). Contractors cannot edit company details, GST info, contact info, or avatar.

### 5.5 📈 Career page — static content

The career roadmap is a hardcoded array (`app/worker/career/page.tsx`): `current: true` is fixed on the **Mason** path for every worker regardless of their actual profession, and wages/demand figures are static text. `enrollCourse` is real (persists to `enrolled_courses`), but the roadmap should be generated from the worker's profession + `estimateWage` + real job-demand data.

### 5.6 Remaining gaps

1. **Avatar/photo upload** — avatars are generated dicebear URLs. InsForge Storage bucket + signed uploads + profile UI needed (~half day).
2. **Push notifications** — in-app realtime works, but no PWA push/SMS/Android channel. Real workers won't keep the web app open; this is the #1 engagement gap.
3. **API rate limiting** — only OTP endpoints are rate-limited; other routes are open to logged-in abuse patterns.
4. **Error & uptime monitoring** — no Sentry/rollbar, no uptime alerts, no on-call signal.
5. **Bootstrap payload** — one big hydration call (500-row caps). Fine now; at thousands of workers needs per-page queries/pagination.
6. **Analytics aggregation** — Node-side over raw rows; at scale move to SQL views/materialized tables.
7. **Multilingual UI** — assistant replies in Hindi, but the UI itself is English-only.
8. **Backups/DR** — InsForge-managed; restore drill not yet performed.
9. **Custom domain** — currently `*.insforge.site`.
10. **Legal/compliance** — privacy policy, ToS, DPDP Act registration, grievance officer — user's responsibility, currently absent.

> Note: the "Finishing" badge seen on job cards is a legitimate job **category** (like Construction), not leftover prototype text.

---

## 6. 🚀 Production-Grade Roadmap (priority order)

### P0 — Before real launch (1–2 weeks)
1. SMS OTP keys → live OTP (providers already coded)
2. Razorpay business account → real payments (webhook → ledger)
3. Sentry + uptime monitoring wired to the deployment
4. Rate limiting middleware for all API routes (IP + user based)
5. Privacy policy, ToS, DPDP basics (legal counsel)
6. Custom domain + DNS + SSL
7. Google OAuth keys

### P1 — Before onboarding real users (2–4 weeks)
8. **Onboarding wizard** (§5.2) — new users currently land on an empty dashboard
9. **Location system** (§5.1) — GPS detect + signup city field + profile edit + real-coords matching
10. **Worker profile edit UI** (§5.3) — expose the 10 API-editable fields hidden behind 2
11. **Contractor profile page** (§5.4) — company/GST/contact editing
12. **Career roadmap personalization** (§5.5) — generate from worker's profession + real demand
13. Avatar upload (bucket + signed URLs + profile UI)
14. PWA push notifications (+ optionally Android wrapper)
15. Contractor soft-metrics derived from real data (see §3)
16. Hindi UI toggle + empty-state polish
17. Backup & restore drill; dependency + security audit (npm audit, pen-test)

### P2 — Scale (1–2 months)
18. Replace mega-bootstrap with per-page queries + pagination
19. SQL materialized views for admin analytics
20. Realtime job-feed channels sharded by city
21. Caching/CDN layer; read replicas if load demands
22. Native Android app if PWA proves demand

---

## 7. Bottom Line

**Backend architecture is production-grade today**: real database, real auth, server-authoritative trust, atomic money-state machine, RBAC-defended APIs, realtime, cron, and a 35-assertion E2E suite that passes against production.

**Frontend has a product-completeness gap**, not an engineering gap: the backend APIs already support onboarding, location, and full profile editing — the UI simply doesn't expose them yet (§5.1–§5.5, roughly 4–5 days of focused UI work). These should land **before** showing the platform to real workers, because a first-time user today lands on an empty, Lucknow-defaulted dashboard with no way to set their profession.

What separates current state from *operating* in production is therefore: **the §5 UI flows** (~1 week), **3 paid accounts** (SMS, Razorpay, KYC vendor), **monitoring**, and **legal/compliance**.
