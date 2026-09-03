# ShramSetu Mobile — Architecture

Native React Native (Expo) app for **workers and contractors**. Admin stays on the web app. The mobile app talks to the **exact same ShramSetu web backend** (Next.js API routes → InsForge Postgres) — zero backend changes, one cookie-jar auth layer.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | React Native 0.74.5 + Expo ~51, Expo Router ~3.5 (file-based routes) |
| Language | TypeScript (strict) |
| State | Zustand + persist (AsyncStorage) |
| Session | InsForge cookies in `expo-secure-store` (see §3) |
| UI | Custom kit (`src/components/ui`) on exact web design tokens |
| Trust ring | `react-native-svg` + plain RN `Animated` (no reanimated dep) |
| Images | `expo-image-picker` (camera/gallery → `/api/avatar`) |

Folder layout:

```
mobile_app/
├── app/                    expo-router screens
│   ├── _layout.tsx         root: session restore + ToastHost + boot overlay
│   ├── index.tsx           Welcome (phone OTP / email / demo)
│   ├── otp.tsx             6-digit verify (+ new-user signup completion)
│   ├── signup.tsx          name / role / city → routes into OTP with signup params
│   ├── (worker)/           bottom tabs: Home · Jobs · Money · Assistant · Profile
│   │   ├── home.tsx        trust ring, availability toggle, checklist, AI recs
│   │   ├── jobs/ index + [id]      match-sorted feed + apply/withdraw/save
│   │   ├── onboarding.tsx  5-step wizard (profession→experience→wage→city→languages+skills)
│   │   ├── trust.tsx       breakdown, events, quiz, work records, certifications, verifications
│   │   ├── career.tsx      roadmap stages, wage estimates, Skill India courses
│   │   ├── money.tsx       income / expenses / savings (3 segments + sheets)
│   │   ├── assistant.tsx   Gemini AI chat (same /api/assistant)
│   │   ├── profile.tsx     avatar upload, bio/skills/certs, details sheet
│   │   └── applications / notifications / report / settings
│   └── (contractor)/       bottom tabs: Home · Jobs · Workers · Applicants · Profile
│       ├── home.tsx        metrics, pipeline, recommended workers + one-tap invite
│       ├── jobs/ index + [id] + new    manage/edit/close + post job (fair-pay hints)
│       ├── workers.tsx     search/filter + invite job-picker bottom sheet
│       ├── applicants.tsx  pipeline tabs (new/shortlisted/on-job/rejected) + actions
│       ├── payments.tsx    wage ledger, mark-paid, create wage records
│       ├── reviews.tsx     rate completed workers (rating + reliability/skill/safety)
│       └── profile.tsx    company identity, payment reliability, edit sheet
├── src/
│   ├── api/client.ts       cookie-jar fetch wrapper (§3)
│   ├── store/index.ts      Zustand mirror of web store — same API contracts
│   ├── services/           ★ verbatim ports of web lib/services (pure TS):
│   │                       jobMatching, trustEngine, wageEstimator, professions,
│   │                       quizBank, onboarding — one algorithm, two clients
│   ├── types/index.ts      verbatim web lib/types
│   ├── utils/              formatINR, timeAgo, haversine, CITIES (verbatim)
│   ├── theme/tokens.ts     exact web palette (navy900 #071B33, orange600 #D84315…)
│   └── components/ui/      Button, Card, Badge(+statusTone), Input/Select/Chip,
│                           TrustRing, Avatar/Skeleton, Sheet, Tabs, ToastHost,
│                           ProgressBar, EmptyState
└── assets/                 (icon/splash)
```

## 2. Data flow (identical to web)

1. **Login** (OTP or email) → server sets InsForge session cookies.
2. **Bootstrap**: `GET /api/bootstrap` returns every entity in one payload (users, profiles, jobs, applications, payments, expenses, goals, reviews, verifications, trust events, notifications, reports, fraud signals, assessments, work history, enrolled courses, chat history, saved jobs) → single Zustand `set()`.
3. **Actions** call the same endpoints as the web store (`/api/worker/actions` discriminated union, `/api/jobs`, `/api/applications[/invite]`, `/api/payments`, `/api/reviews`, `/api/reports`, `/api/notifications`, `/api/assistant`, `/api/avatar`). All server-authoritative: trust math, match scores on invites, role checks.
4. Optimistic updates with rollback mirror the web store (availability toggle, withdraw, unsave).

## 3. Cookie-jar auth (RN has no cookie jar)

`src/api/client.ts`:

- Auth responses' **Set-Cookie** headers are parsed (incl. `Max-Age`, deletion via empty value) into a jar persisted in **expo-secure-store** (encrypted on device).
- Every request attaches `Cookie: …`.
- **401 → `POST /api/auth/refresh` → retry once → else clearSession + logout.** Cold start: `hasSession()` → `GET /api/auth/me` to validate before restoring the tab.

## 4. Mazdur-first UX rules (every screen)

1. ≥44px touch targets; primary actions in the bottom thumb zone (apply/hire bars).
2. **Bottom sheets** instead of desktop modals (quiz, invites, forms, reviews).
3. Big visual hierarchy: TrustRing prominent, match % as large orange numerals, wages always `₹/day`.
4. Skeleton shimmer loaders on every list + pull-to-refresh + honest empty states with CTAs.
5. Toasts (success green / error red / info navy) identical to web.
6. 6-box OTP keyboard, paste-tolerant; resend via same endpoint.
7. Language: English only in v1; Settings shows हिंदी locked ("Coming soon") — strings already centralized for v1.1.

## 5. AI parity with web

- **Assistant** → same `POST /api/assistant` (Gemini 2.5 Flash via OpenRouter, RAG-style live context, rule-engine fallback). Chat history persisted (AsyncStorage via store partialize).
- **Job matching** → same `calculateMatchScore` (skills 30%, distance 20%, wage 15%, experience 15%, contractor trust 10%, availability 10%) imported from the identical service file.
- **Wage intelligence** → same `estimateWage` city×profession×experience model feeding onboarding hints, career roadmaps and fair-pay warnings on job posting.

## 6. Dev & ops

- `API_BASE` in `src/config/index.ts` — **set to your machine's LAN IP** (e.g. `http://192.168.x.x:3000`) before `npx expo start`; production placeholder `https://shramsetu.vercel.app`.
- `npm run typecheck` (tsc --noEmit) — currently **clean**.
- Install note: use `npm install --legacy-peer-deps` (Expo 51 peer ranges).
- Realtime: v1 uses in-app bell + unread badges (web parity); `expo-notifications` push is the documented v1.1 step — no code changes needed on the backend.
- The web repo is untouched: this folder is fully self-contained (own package.json/lockfile) and can be moved out (`git subtree`/copy) without affecting the website.

## 7. Roadmap (v1.1)

- Hindi localization (toggle UI already in Settings)
- Expo push notifications (FCM/APNs)
- Realtime via InsForge websocket (fallback: 30s polling)
- Technician-visit verifications (camera proof → admin queue)
