# ShramSetu Mobile (Worker + Contractor app)

Native React Native / Expo companion app for the [ShramSetu](../README.md) marketplace. Same backend, same trust engine, same AI assistant — designed mazdur-first: big targets, bottom sheets, minimal text.

## Quick start

```bash
cd mobile_app
npm install --legacy-peer-deps
```

1. Start the web app dev server (the backend): `cd .. && npm run dev` (port 3000).
2. Find your machine's LAN IP (`ipconfig` → IPv4) and set it as `API_BASE` in `src/config/index.ts`, e.g. `http://192.168.1.5:3000`.
3. `npx expo start` → scan the QR with Expo Go (phone on the same Wi-Fi).

Demo accounts (seeded): **Worker** `worker@shramsetu.local` · **Contractor** `contractor@shramsetu.local` — password `demo1234`, or use phone OTP (dev mode shows the code in a toast).

## What's inside

- **Auth**: phone OTP (6-box entry, resend, new-user signup), email login, demo access — cookie-jar sessions in encrypted storage with auto refresh.
- **Worker**: dashboard (trust ring, today's income, checklist, AI job recs), jobs feed (match-sorted, apply/withdraw/save), 5-step onboarding wizard, trust center (score breakdown, skill quizzes, work records, certifications, verification requests), career roadmap + Skill India courses, money (income/expenses/savings), AI assistant, profile (camera/gallery avatar), applications timeline, safety reporting.
- **Contractor**: metrics + applicant pipeline + recommended workers with one-tap invite, job posting (with fair-pay hints), applicant management (shortlist/reject/hire, call), wage ledger (mark paid, create records), worker reviews (rating + reliability/skill/safety).
- **Zero backend changes** — same 30 API endpoints as the web app via a cookie-jar fetch client; pure-TS services (matching, trust engine, wage estimator, quiz bank) are shared verbatim from the web repo.

Typecheck: `npm run typecheck` (clean). Architecture details: [ARCHITECTURE.md](./ARCHITECTURE.md).
