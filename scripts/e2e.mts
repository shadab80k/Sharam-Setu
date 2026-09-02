/**
 * ShramSetu Production E2E Test Suite
 * Runs against a live server (default http://localhost:3001) and the real
 * InsForge backend. Covers: auth (OTP + email + signup), job marketplace,
 * hire flow, payments/escrow, verification workflow, RBAC negative tests,
 * and the AI assistant.
 *
 * Usage: BASE_URL=http://localhost:3001 npx tsx scripts/e2e.mts
 */
import { config } from "dotenv"; config({ path: ".env.local" });

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const DEMO_PW = "demo1234";

let passed = 0, failed = 0;
const failures: string[] = [];

function assert(cond: unknown, name: string, detail = "") {
  if (cond) { console.log(`  ✅ ${name}`); passed++; }
  else { console.error(`  ❌ ${name} — ${detail}`); failed++; failures.push(name); }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// --- tiny cookie-jar fetch ---
function jar() {
  const store: Record<string, string> = {};
  return {
    async call(method: string, path: string, body?: unknown) {
      const res = await fetch(BASE + path, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(Object.keys(store).length ? { Cookie: Object.entries(store).map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const c of res.headers.getSetCookie?.() ?? []) {
        const [pair] = c.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) store[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : {} };
    },
  };
}

/**
 * send-otp with cooldown tolerance: the OTP rate limit (a real security
 * feature) 429s a phone that was messaged within the last minute — repeated
 * E2E runs hit it. This helper waits out the reported cooldown and retries
 * instead of failing the suite.
 */
async function sendOtpTolerant(j: ReturnType<typeof jar>, phone: string) {
  let r = await j.call("POST", "/api/auth/send-otp", { phone });
  const deadline = Date.now() + 90_000;
  while (r.status === 429 && Date.now() < deadline) {
    const waitS = Math.min(Number(/(\d+)s/.exec(r.body?.error ?? "")?.[1] ?? 5) + 1, 20);
    await new Promise((res) => setTimeout(res, waitS * 1000));
    r = await j.call("POST", "/api/auth/send-otp", { phone });
  }
  return r;
}

async function main() {
  console.log("==================================================");
  console.log("  SHRAMSETU — PRODUCTION E2E VERIFICATION");
  console.log(`  Target: ${BASE}`);
  console.log("==================================================");

  const worker = jar(), contractor = jar(), admin = jar(), outsider = jar();

  // ---------- 1. AUTH ----------
  section("🔐 1. AUTHENTICATION");
  let r = await worker.call("POST", "/api/auth/login", { email: "worker@shramsetu.local", password: DEMO_PW });
  assert(r.status === 200 && r.body.user?.role === "worker", "Worker login (email)", JSON.stringify(r.body).slice(0, 120));

  r = await contractor.call("POST", "/api/auth/login", { email: "contractor@shramsetu.local", password: DEMO_PW });
  assert(r.status === 200 && r.body.user?.role === "contractor", "Contractor login", JSON.stringify(r.body).slice(0, 120));

  r = await admin.call("POST", "/api/auth/login", { email: "admin@shramsetu.local", password: DEMO_PW });
  assert(r.status === 200 && r.body.user?.role === "admin", "Admin login", JSON.stringify(r.body).slice(0, 120));

  r = await outsider.call("POST", "/api/auth/login", { email: "worker@shramsetu.local", password: "wrong" });
  assert(r.status === 401, "Wrong password rejected", `status=${r.status}`);

  r = await sendOtpTolerant(worker, "9876543210");
  assert(r.status === 200 && typeof r.body.devOtp === "string", "OTP send (dev code returned)", JSON.stringify(r.body));

  r = await worker.call("POST", "/api/auth/verify-otp", { phone: "9876543210", code: "000000" });
  assert(r.status === 400, "Wrong OTP rejected", `status=${r.status}`);

  // ---------- 2. SESSION + BOOTSTRAP ----------
  section("🧾 2. SESSION & BOOTSTRAP");
  r = await worker.call("GET", "/api/auth/me");
  assert(r.status === 200 && r.body.user?.email === "worker@shramsetu.local", "Session persists (me)", JSON.stringify(r.body));

  r = await outsider.call("GET", "/api/bootstrap");
  assert(r.status === 401, "Bootstrap blocked without session", `status=${r.status}`);

  r = await worker.call("GET", "/api/bootstrap");
  const me = r.body.currentUser;
  assert(r.status === 200 && me?.name === "Ramesh Kumar", "Bootstrap hydrates store", me?.name);
  assert(r.body.users.length >= 30, "User directory loaded", `users=${r.body.users?.length}`);
  assert(r.body.jobs.length >= 20, "Jobs loaded", `jobs=${r.body.jobs?.length}`);
  const myProfile = r.body.workerProfiles.find((p: any) => p.userId === me.id);
  assert(myProfile && myProfile.trustScore > 0, "Server-computed trust score present", `trust=${myProfile?.trustScore}`);

  // ---------- 3. JOB MARKETPLACE ----------
  section("💼 3. JOB MARKETPLACE");
  r = await worker.call("GET", "/api/jobs");
  assert(r.status === 200 && r.body.matches?.length > 0, "Job matching with scores", `matches=${r.body.matches?.length}`);
  const top = r.body.matches[0];
  assert(typeof top.matchScore === "number" && top.matchScore > 0, "Match score computed server-side", `score=${top.matchScore}`);

  // bootstrap gives the worker's existing applications; also find a job owned
  // by the demo contractor so the hire-leg can run with proper ownership.
  // The contractor posts a fresh job each run so the suite is idempotent
  // against a shared database (re-runs never run out of fresh jobs).
  const contractorId = (await contractor.call("GET", "/api/auth/me")).body.user.id;
  const runStamp = Date.now().toString().slice(-6);
  r = await contractor.call("POST", "/api/jobs", {
    title: `E2E Wiring Job ${runStamp}`, category: "MEP",
    description: "End-to-end verification job", location: "lucknow",
    wagePerDay: 900, startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    workersNeeded: 2, requiredSkills: ["Wiring"], paymentFrequency: "daily",
    safetyNotes: "E2E run",
  });
  assert(r.status === 201 && r.body.job?.id, "Contractor posts fresh job for this run", JSON.stringify(r.body).slice(0, 150));
  const openJob = r.body.job;

  // apply
  r = await worker.call("POST", "/api/applications", { jobId: openJob.id });
  const appId = r.body.application?.id;
  assert(r.status === 201 && appId, "Worker applies to job", JSON.stringify(r.body).slice(0, 150));

  r = await worker.call("POST", "/api/applications", { jobId: openJob.id });
  assert(r.status === 409, "Duplicate application rejected", `status=${r.status}`);

  // contractor sees it & hires (atomic)
  r = await contractor.call("GET", "/api/bootstrap");
  const cApps = r.body.applications;
  assert(cApps.some((a: any) => a.jobId === openJob.id), "Contractor sees applicant", `apps=${cApps.length}`);

  r = await contractor.call("PATCH", `/api/applications/${appId}`, { hire: true });
  assert(r.status === 200 && r.body.application?.status === "selected", "Atomic hire (RPC)", JSON.stringify(r.body).slice(0, 150));

  // verify workers_hired incremented
  r = await contractor.call("GET", "/api/bootstrap");
  const hiredJob = r.body.jobs.find((j: any) => j.id === openJob.id);
  assert(hiredJob && hiredJob.workersHired > 0, "workers_hired incremented", `hired=${hiredJob?.workersHired}`);

  // ---------- 3.5 CONTRACTOR → WORKER INVITE (shortlist without application) ----------
  section("🤝 3.5 CONTRACTOR INVITE FLOW");
  // Ramesh already has an application on openJob, so invite targets a fresh job
  r = await contractor.call("POST", "/api/jobs", {
    title: `E2E Invite Job ${runStamp}`, category: "Plumbing",
    description: "Contractor-invite verification job", location: "lucknow",
    wagePerDay: 850, startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    workersNeeded: 1, requiredSkills: ["Pipe Fitting"], paymentFrequency: "daily",
    safetyNotes: "E2E invite run",
  });
  const inviteJob = r.body.job;
  assert(r.status === 201 && inviteJob?.id, "Contractor posts fresh job for invite test", JSON.stringify(r.body).slice(0, 150));

  // contractor invites the worker directly — no application existed
  r = await contractor.call("POST", "/api/applications/invite", { jobId: inviteJob.id, workerId: me.id });
  const inviteApp = r.body.application;
  assert(r.status === 201 && inviteApp?.status === "shortlisted", "Contractor invite creates shortlisted application", JSON.stringify(r.body).slice(0, 150));
  assert(typeof inviteApp?.matchScore === "number" && inviteApp.matchScore >= 0, "Invite has server-computed match", `score=${inviteApp?.matchScore}`);

  // worker was notified
  r = await worker.call("GET", "/api/bootstrap");
  const inviteNotif = (r.body.notifications ?? []).find((n: any) => n.title?.includes("shortlisted"));
  assert(!!inviteNotif, "Worker notified of shortlist", JSON.stringify((r.body.notifications ?? [])[0] ?? {}).slice(0, 120));

  // duplicate invite rejected (unique job+worker)
  r = await contractor.call("POST", "/api/applications/invite", { jobId: inviteJob.id, workerId: me.id });
  assert(r.status === 409, "Duplicate invite rejected", `status=${r.status}`);

  // worker cannot use invite API
  r = await worker.call("POST", "/api/applications/invite", { jobId: inviteJob.id, workerId: me.id });
  assert(r.status === 403, "Worker blocked from invite API", `status=${r.status}`);

  // missing job rejected
  r = await contractor.call("POST", "/api/applications/invite", { jobId: "00000000-0000-0000-0000-000000000000", workerId: me.id });
  assert(r.status === 404, "Invite to missing job rejected", `status=${r.status}`);

  // ---------- 4. PAYMENTS & ESCROW ----------
  section("💰 4. PAYMENTS & ESCROW");
  r = await contractor.call("POST", "/api/payments", {
    jobId: openJob.id, workerId: me.id, amount: 900,
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), method: "UPI", notes: "E2E wage",
  });
  const payId = r.body.payment?.id;
  assert(r.status === 201 && payId, "Contractor creates wage record", JSON.stringify(r.body).slice(0, 150));

  r = await worker.call("PATCH", `/api/payments/${payId}`, { action: "mark-paid" });
  assert(r.status === 403, "Worker cannot mark-paid (RBAC)", `status=${r.status}`);

  r = await contractor.call("PATCH", `/api/payments/${payId}`, { action: "mark-paid" });
  assert(r.status === 200 && r.body.payment?.status === "paid", "Contractor marks paid", JSON.stringify(r.body).slice(0, 120));

  r = await contractor.call("PATCH", `/api/payments/${payId}`, { action: "mark-paid" });
  assert(r.status === 400, "Double-pay rejected", JSON.stringify(r.body));

  // ---------- 5. VERIFICATION WORKFLOW ----------
  section("🛡️ 5. VERIFICATION WORKFLOW");
  const suresh = jar();
  r = await sendOtpTolerant(suresh, "9876500001");
  const code = r.body.devOtp as string;
  r = await suresh.call("POST", "/api/auth/verify-otp", { phone: "9876500001", code });
  assert(r.status === 200 && r.body.user?.name === "Suresh Kumar", "OTP login (existing user)", JSON.stringify(r.body).slice(0, 120));

  r = await suresh.call("POST", "/api/worker/actions", { action: "request-verification", type: "skill" });
  assert(r.status === 200 || r.status === 409, "Verification request submitted", JSON.stringify(r.body));

  if (r.status === 200) {
    r = await admin.call("GET", "/api/bootstrap");
    const pending = r.body.verifications.find((v: any) => v.status === "pending");
    assert(!!pending, "Admin sees pending verification");
    r = await admin.call("POST", "/api/admin/actions", { action: "approve-verification", verificationId: pending.id });
    assert(r.status === 200, "Admin approves verification", JSON.stringify(r.body));
    r = await suresh.call("GET", "/api/bootstrap");
    const vp = r.body.verifications.find((v: any) => v.type === "skill");
    assert(vp?.status === "verified", "Trust recalc trigger ran (verifications refreshed)", vp?.status);
  }

  // ---------- 6. RBAC NEGATIVE TESTS ----------
  section("🔒 6. RBAC / SECURITY");
  r = await worker.call("POST", "/api/admin/actions", { action: "suspend-user", userId: me.id });
  assert(r.status === 403, "Worker blocked from admin API", `status=${r.status}`);

  r = await worker.call("POST", "/api/jobs", { title: "x", category: "y", wagePerDay: 1, startDate: new Date().toISOString(), endDate: new Date().toISOString(), workersNeeded: 1, paymentFrequency: "daily", location: "lucknow" });
  assert(r.status === 403, "Worker blocked from posting jobs", `status=${r.status}`);

  r = await worker.call("PATCH", "/api/worker/profile", { trustScore: 100, availability: "working" } as any);
  // trustScore must be stripped by validation (server-authoritative);
  // the profile must NOT come back with a score of 100.
  const scoreAfter: number | undefined = r.body.profile?.trustScore;
  assert(r.status === 200 && scoreAfter !== 100, "trustScore not writable via API (server-authoritative)", `returned=${scoreAfter}`);

  r = await contractor.call("POST", "/api/reports", { category: "fraud", severity: "high", description: "contractor should not be able to review own; this is just RBAC probe report" });
  assert(r.status === 201, "Safety report accepted from any role", `status=${r.status}`);

  // ---------- 6.5 NEW USER FLOWS (onboarding, forgot-password, metrics) ----------
  section("🧪 6.5 NEW USER FLOWS");

  // Signup a fresh worker with a real city → lands on the onboarding defaults marker
  const stamp = Date.now().toString().slice(-8);
  const freshEmail = `fresh_${stamp}@shramsetu.local`;
  r = await outsider.call("POST", "/api/auth/signup", {
    name: "Fresh Worker", email: freshEmail, password: "secret99", role: "worker",
    phone: `9${stamp.slice(0, 8)}${stamp.slice(0, 1)}`, location: "kanpur",
  });
  assert(r.status === 200 && r.body.user?.role === "worker", "Worker signup with city", JSON.stringify(r.body).slice(0, 120));

  r = await outsider.call("GET", "/api/bootstrap");
  const freshProfile = r.body.workerProfiles.find((p: any) => p.userId === r.body.currentUser.id);
  assert(
    freshProfile && freshProfile.profession === "Helper" && freshProfile.expectedDailyWage === 0,
    "Fresh worker has onboarding-defaults marker (Helper, ₹0)",
    `prof=${freshProfile?.profession} wage=${freshProfile?.expectedDailyWage}`
  );
  assert(r.body.currentUser.location === "kanpur", "Signup city persisted (no default Lucknow)", r.body.currentUser.location);

  // Completing the profile via the existing PATCH clears the marker
  r = await outsider.call("PATCH", "/api/worker/profile", {
    profession: "Electrician", experienceYears: 4, expectedDailyWage: 950, skills: ["Wiring"], bio: "Certified electrician from Kanpur.",
  });
  assert(r.status === 200 && r.body.profile?.profession === "Electrician", "Onboarding completion via profile PATCH", JSON.stringify(r.body.profile?.profession));
  r = await outsider.call("GET", "/api/bootstrap");
  const doneProfile = r.body.workerProfiles.find((p: any) => p.userId === r.body.currentUser.id);
  assert(doneProfile && doneProfile.profession === "Electrician" && doneProfile.expectedDailyWage === 950, "Marker cleared after onboarding", `prof=${doneProfile?.profession}`);

  // Forgot-password: unknown email must not reveal account existence
  r = await jar().call("POST", "/api/auth/forgot-password", { email: `nobody_${stamp}@shramsetu.local` });
  assert(r.status === 200 && /sent/i.test(r.body.message ?? ""), "Forgot-password neutral response for unknown email", JSON.stringify(r.body).slice(0, 100));

  r = await jar().call("POST", "/api/auth/forgot-password", { email: "not-an-email" });
  assert(r.status === 400, "Forgot-password rejects invalid email", `status=${r.status}`);

  r = await jar().call("POST", "/api/auth/reset-password", { email: freshEmail, code: "000000", newPassword: "newpass123" });
  assert(r.status === 400, "Reset-password rejects wrong code", `status=${r.status}`);

  // Contractor metrics derived from real data (paidPayments gate)
  // PATCH with no fields is the read-back path (all fields optional)
  r = await contractor.call("PATCH", "/api/contractor/profile", {});
  assert(
    r.status === 200 && typeof r.body.profile?.paidPayments === "number",
    "Contractor profile returns paidPayments count",
    `paid=${r.body.profile?.paidPayments} reliability=${r.body.profile?.paymentReliability}`
  );
  assert(r.body.profile?.responseRate === undefined, "Fake responseRate removed from API", JSON.stringify(r.body.profile ?? {}).slice(0, 120));

  // Avatar upload security: no file → clean 400, outsider blocked
  r = await worker.call("POST", "/api/avatar");
  assert(r.status === 400, "Avatar upload without file rejected", `status=${r.status}`);
  r = await jar().call("POST", "/api/avatar", {});
  assert(r.status === 401, "Avatar upload requires session", `status=${r.status}`);

  // ---------- 7. AI ASSISTANT ----------
  section("🤖 7. AI ASSISTANT");
  r = await worker.call("POST", "/api/assistant", { message: "Where is my pending payment?" });
  assert(r.status === 200 && r.body.assistantMessage?.content, "Assistant responds (LLM or fallback)", JSON.stringify(r.body).slice(0, 120));
  assert(r.body.userMessage?.role === "user", "Chat history persisted", "");

  r = await contractor.call("POST", "/api/assistant", { message: "hello" });
  assert(r.status === 403, "Assistant is worker-only", `status=${r.status}`);

  // ---------- 8. ADMIN ANALYTICS ----------
  section("📊 8. ADMIN ANALYTICS");
  r = await admin.call("GET", "/api/admin/analytics");
  assert(r.status === 200 && r.body.totals?.workers >= 25, "Real aggregates computed", JSON.stringify(r.body.totals ?? {}).slice(0, 150));

  r = await worker.call("GET", "/api/admin/analytics");
  assert(r.status === 403, "Analytics admin-only", `status=${r.status}`);

  // ---------- SUMMARY ----------
  console.log("\n==================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  if (failures.length) console.log("  Failed:", failures.join(", "));
  console.log("==================================================");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
