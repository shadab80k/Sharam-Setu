import { config } from "dotenv"; config({ path: ".env.local" });
/**
 * ShramSetu Production Seed
 * - Creates 36 auth users (25 workers, 10 contractors, 1 admin)
 * - Seeds all marketplace data deterministically (mirrors lib/data/seed.ts)
 * - Recalculates server-authoritative trust scores
 *
 * Run: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { createAdminClient } from "@insforge/sdk";
import { CITIES } from "../lib/utils/cities";

// ---------- deterministic RNG ----------
let seedState = 42;
function rand(min: number, max: number): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return min + (seedState % (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function daysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const FIRST_NAMES = ["Ramesh","Suresh","Lata","Amit","Priya","Vikram","Anita","Manoj","Geeta","Rajesh","Sunita","Deepak","Kavita","Arjun","Meena","Sanjay","Asha","Rakesh","Pooja","Kiran","Vinod","Neha","Mahesh","Rekha","Ganesh"];
const LAST_NAMES = ["Kumar","Yadav","Devi","Sharma","Singh","Verma","Patel","Gupta","Khan","Tiwari","Mishra","Pandey","Joshi","Chauhan","Rawat"];
const COMPANIES = ["Raj BuildWorks","Sharma Constructions","Verma Infra","Patel Builders","Modern Homes Pvt Ltd","Singh Contractors","Gupta Projects","Anita Civil Works","Bharat BuildCon","Noida Construction Co"];
const PROFESSIONS = [
  { name: "Mason", skills: ["Masonry","Brickwork","Plastering"] },
  { name: "Painter", skills: ["Painting","Wall Prep","Polish"] },
  { name: "Plumber", skills: ["Plumbing","Pipe Fitting","Drainage"] },
  { name: "Electrician", skills: ["Wiring","Lighting","Repair"] },
  { name: "Carpenter", skills: ["Carpentry","Furniture","Doors"] },
  { name: "Tile Fitter", skills: ["Tiling","Grouting","Tile Cutting"] },
  { name: "Helper", skills: ["Material Handling","Site Cleaning"] },
];
const SKILL_LIBRARY = [
  { name: "Masonry", category: "Construction" }, { name: "Brickwork", category: "Construction" },
  { name: "Plastering", category: "Construction" }, { name: "Painting", category: "Finishing" },
  { name: "Plumbing", category: "MEP" }, { name: "Wiring", category: "MEP" },
  { name: "Carpentry", category: "Finishing" }, { name: "Tiling", category: "Finishing" },
  { name: "Site Helper", category: "General" },
];
const JOB_TITLES = [
  { title: "Masonry Work", category: "Construction" }, { title: "Residential Painting", category: "Finishing" },
  { title: "Bathroom Plumbing", category: "MEP" }, { title: "House Wiring", category: "MEP" },
  { title: "Door & Window Carpentry", category: "Finishing" }, { title: "Floor Tiling", category: "Finishing" },
  { title: "Site Helper Required", category: "General" }, { title: "Plastering Contract", category: "Construction" },
  { title: "Waterproofing", category: "Construction" }, { title: "False Ceiling Work", category: "Finishing" },
];

interface SeedUser {
  authId: string; role: "worker" | "contractor" | "admin"; name: string;
  email: string; phone: string; avatar: string; location: string; profession?: string;
}

async function main() {
  const baseUrl = process.env.INSFORGE_URL!;
  const apiKey = process.env.INSFORGE_API_KEY!;
  const admin = createAdminClient({ baseUrl, apiKey });

  console.log("🚀 Seeding ShramSetu production data...\n");

  // ============ 1. AUTH USERS ============
  console.log("1️⃣  Creating auth users...");
  const users: SeedUser[] = [];

  /** Idempotent: create auth user or resolve existing one. Returns auth user id.
   *  Uses a throwaway client so the sign-in session never pollutes the admin
   *  client's bearer token (the DB writes must stay service-key scoped). */
  async function upsertAuthUser(email: string, password: string, name: string): Promise<string | null> {
    const signupClient = createAdminClient({ baseUrl, apiKey });
    const { data, error } = await signupClient.auth.signUp({ email, password, name });
    if (!error && data?.user?.id) return data.user.id;
    const signinClient = createAdminClient({ baseUrl, apiKey });
    const { data: sData, error: sError } = await signinClient.auth.signInWithPassword({ email, password });
    if (!sError && sData?.user?.id) return sData.user.id;
    console.error(`  ✗ ${email}: ${error?.message ?? sError?.message}`);
    return null;
  }

  // 25 workers — workers 0/1 are the stable demo identities used on the login page & in e2e
  for (let i = 0; i < 25; i++) {
    const demo: { name: string; phone: string; location?: string } | null =
      i === 0 ? { name: "Ramesh Kumar", phone: "9876543210", location: "lucknow" } :
      i === 1 ? { name: "Suresh Kumar", phone: "9876500001" } :
      null;
    const name = demo?.name ?? `${FIRST_NAMES[i]} ${pick(LAST_NAMES)}`;
    const email = i === 0 ? "worker@shramsetu.local" : `worker${i + 1}@shramsetu.local`;
    const phone = demo?.phone ?? `9${String(rand(100000000, 999999999))}`;
    const authId = await upsertAuthUser(email, "demo1234", name);
    if (!authId) continue;
    users.push({
      authId, role: "worker", name, email,
      phone, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/ /g, "")}`,
      location: demo?.location ?? pick(CITIES).id,
    });
    process.stdout.write(`  ✓ w${i + 1}`);
  }
  console.log("");

  // 10 contractors
  for (let i = 0; i < 10; i++) {
    const name = COMPANIES[i];
    const email = i === 0 ? "contractor@shramsetu.local" : `contractor${i + 1}@shramsetu.local`;
    const phone = i === 0 ? "9876543211" : `9${String(rand(100000000, 999999999))}`;
    const authId = await upsertAuthUser(email, "demo1234", name);
    if (!authId) continue;
    users.push({
      authId, role: "contractor", name, email,
      phone, avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name.replace(/\s/g, "")}`,
      location: pick(CITIES).id,
    });
    process.stdout.write(`  ✓ c${i + 1}`);
  }
  console.log("");

  // 1 admin
  {
    const authId = await upsertAuthUser("admin@shramsetu.local", "demo1234", "ShramSetu Admin");
    if (authId) users.push({
      authId, role: "admin", name: "ShramSetu Admin",
      email: "admin@shramsetu.local", phone: "9000000000",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SA", location: "delhi",
    });
  }
  console.log(`  → ${users.length} auth users created\n`);

  const workers = users.filter((u) => u.role === "worker");
  const contractors = users.filter((u) => u.role === "contractor");
  const adminUser = users.find((u) => u.role === "admin")!;

  // ============ 2. PUBLIC USERS ROWS ============
  console.log("2️⃣  Creating app user rows...");
  const { error: usersErr } = await admin.database.from("users").insert(
    users.map((u) => ({
      id: u.authId, role: u.role, name: u.name, email: u.email, phone: u.phone,
      avatar: u.avatar, location: u.location, status: "active", created_at: daysAgo(rand(30, 500)),
    }))
  );
  if (usersErr) throw new Error(`users insert failed: ${usersErr.message}`);

  // ============ 3. PROFILES ============
  console.log("3️⃣  Creating profiles...");
  await admin.database.from("worker_profiles").insert(
    workers.map((u) => {
      const prof = pick(PROFESSIONS);
      const city = CITIES.find((c) => c.id === u.location)!;
      return {
        user_id: u.authId, profession: prof.name, experience_years: rand(1, 15),
        expected_daily_wage: city.wageBase + rand(-100, 200),
        availability: pick(["available","available","working","unavailable"]),
        bio: `Experienced ${prof.name} with hands-on construction expertise. Reliable and skilled.`,
        profile_completion: rand(60, 98), preferred_radius_km: rand(3, 15),
        languages: pickN(["Hindi","English","Bhojpuri","Punjabi","Marwari"], rand(1, 2)),
        skills: pickN(prof.skills, Math.min(prof.skills.length, rand(1, 3))),
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        completed_jobs: rand(2, 80),
        certifications: pickN(["Safety Training","Skill Certification","First Aid","Equipment Operation"], rand(0, 3)),
      };
    })
  );
  await admin.database.from("contractor_profiles").insert(
    contractors.map((u) => ({
      user_id: u.authId, company_name: u.name,
      business_type: pick(["Residential","Commercial","Infrastructure","Renovation"]),
      location: u.location, rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      payment_reliability: rand(70, 99), completed_jobs: rand(10, 200),
      response_rate: rand(70, 99),
    }))
  );

  // skills library
  await admin.database.from("skills").insert(SKILL_LIBRARY);

  // ============ 4. JOBS ============
  console.log("4️⃣  Creating jobs...");
  const jobRows: any[] = [];
  for (let i = 0; i < 32; i++) {
    const contractor = pick(contractors);
    const jt = pick(JOB_TITLES);
    const city = pick(CITIES);
    const needed = rand(2, 8);
    jobRows.push({
      contractor_id: contractor.authId, title: jt.title, category: jt.category,
      description: `${jt.title} required for a project in ${city.name}. Materials and safety equipment provided.`,
      location: city.id, latitude: city.latitude, longitude: city.longitude,
      wage_per_day: city.wageBase + rand(-100, 300),
      start_date: daysAhead(rand(1, 20)), end_date: daysAhead(rand(21, 60)),
      workers_needed: needed, workers_hired: 0,
      status: i < 26 ? "active" : i < 29 ? "draft" : i === 29 ? "completed" : "closed",
      required_skills: pickN(SKILL_LIBRARY, rand(1, 3)).map((s) => s.name),
      payment_frequency: pick(["daily","weekly","on-completion"]),
      safety_notes: "Helmet and safety shoes mandatory on site.",
      created_at: daysAgo(rand(1, 170)),
    });
  }
  const { data: insertedJobs, error: jobsErr } = await admin.database
    .from("jobs").insert(jobRows).select("id, contractor_id, status");
  if (jobsErr) throw new Error(`jobs insert failed: ${jobsErr.message}`);
  const jobs = insertedJobs!;

  // ============ 5. APPLICATIONS ============
  console.log("5️⃣  Creating applications...");
  const activeJobs = jobs.filter((j) => j.status === "active" || j.status === "completed");
  const appRows: any[] = [];
  const used = new Set<string>();
  for (const job of activeJobs) {
    const count = rand(0, 5);
    for (let i = 0; i < count; i++) {
      const w = pick(workers);
      const key = `${job.id}:${w.authId}`;
      if (used.has(key)) continue;
      used.add(key);
      appRows.push({
        job_id: job.id, worker_id: w.authId, match_score: rand(55, 96),
        status: job.status === "completed" ? "completed" : pick(["applied","applied","viewed","shortlisted","interview","selected","rejected"]),
        applied_at: daysAgo(rand(1, 165)),
        match_reasons: pickN(["Skill match","Within radius","Above expected wage","Available immediately","Experience match"], rand(1, 3)),
      });
    }
  }
  const { data: insertedApps, error: appsErr } = await admin.database
    .from("applications").insert(appRows).select("id, job_id, worker_id, status");
  if (appsErr) throw new Error(`applications insert failed: ${appsErr.message}`);

  // sync workers_hired from selected applications
  for (const job of activeJobs) {
    const selected = insertedApps!.filter((a) => a.job_id === job.id && a.status === "selected").length;
    if (selected > 0) {
      await admin.database.from("jobs").update({
        workers_hired: Math.min(selected, 6),
      }).eq("id", job.id);
    }
  }

  // ============ 6. PAYMENTS ============
  console.log("6️⃣  Creating payments ledger...");
  const payRows: any[] = [];
  for (const app of insertedApps!) {
    if (!["selected", "completed"].includes(app.status)) continue;
    const job = jobs.find((j) => j.id === app.job_id)!;
    const status = pick(["paid","paid","paid","pending","due","overdue"]);
    const dueOffset = status === "overdue" ? rand(5, 15) : status === "due" ? rand(-1, -5) : rand(-15, -5);
    // paid payments carry a realistic history across the last ~5 months; live states stay near today
    const drift = status === "paid" ? rand(0, 150) : 0;
    payRows.push({
      job_id: app.job_id, worker_id: app.worker_id, contractor_id: job.contractor_id,
      amount: rand(700, 1600), due_date: daysAgo(drift - dueOffset),
      paid_date: status === "paid" ? daysAgo(drift + rand(1, 10)) : null,
      status, method: pick(["UPI","Bank Transfer","Cash"]),
    });
  }
  const { error: payErr } = await admin.database.from("payments").insert(payRows);
  if (payErr) throw new Error(`payments insert failed: ${payErr.message}`);

  // ============ 7. EXPENSES + SAVINGS ============
  console.log("7️⃣  Creating expenses & savings goals...");
  const expRows: any[] = [];
  for (const w of workers.slice(0, 15)) {
    for (let i = 0; i < rand(3, 8); i++) {
      expRows.push({
        worker_id: w.authId, category: pick(["food","transport","rent","family","tools","medical","other"]),
        amount: rand(50, 800), date: daysAgo(rand(1, 160)),
        note: pick(["Weekly groceries","Bus pass","Room rent","Family remittance","New tools","Medicine","Misc"]),
      });
    }
  }
  await admin.database.from("expenses").insert(expRows);
  await admin.database.from("savings_goals").insert(
    workers.slice(0, 10).map((w) => ({
      worker_id: w.authId, name: pick(["Emergency Fund","New Smartphone","Daughter's Wedding","Home Repair","Tool Upgrade"]),
      target_amount: rand(10000, 60000), current_amount: rand(1000, 25000),
      target_date: daysAhead(rand(30, 300)),
    }))
  );

  // ============ 8. REVIEWS ============
  console.log("8️⃣  Creating reviews...");
  const revRows: any[] = [];
  for (const app of insertedApps!.filter((row) => row.status === "completed")) {
    const job = jobs.find((j) => j.id === app.job_id)!;
    if (job.contractor_id === app.worker_id) continue;
    revRows.push({
      reviewer_id: job.contractor_id, reviewee_id: app.worker_id, job_id: app.job_id,
      rating: rand(3, 5), comment: pick(["Excellent work, very reliable.","Great craftsmanship and punctual.","Good worker, finished on time.","Skilled and professional. Would rehire."]),
      reliability: rand(3, 5), skill: rand(3, 5), safety: rand(3, 5),
      created_at: daysAgo(rand(2, 160)),
    });
  }
  if (revRows.length) await admin.database.from("reviews").insert(revRows);

  // ============ 9. VERIFICATIONS ============
  console.log("9️⃣  Creating verifications...");
  const verRows: any[] = [];
  for (const u of users) {
    const types = u.role === "admin" ? ["phone","email"] : pickN(["phone","email","identity","skill","work-history","address"], rand(2, 4));
    for (const t of types) {
      const status = pick(["verified","verified","verified","pending"]);
      verRows.push({
        user_id: u.authId, type: t, status,
        score: status === "verified" ? rand(85, 100) : 0,
        verified_at: status === "verified" ? daysAgo(rand(10, 200)) : null,
      });
    }
  }
  await admin.database.from("verifications").insert(verRows);

  // ============ 10. WORK HISTORY + ASSESSMENTS ============
  console.log("🔟  Creating work history & assessments...");
  const whRows: any[] = [];
  for (const w of workers.slice(0, 20)) {
    const count = rand(1, 4);
    for (let i = 0; i < count; i++) {
      const c = pick(contractors);
      const start = rand(30, 400);
      whRows.push({
        worker_id: w.authId, contractor_id: c.authId,
        job_id: pick(activeJobs).id, role: pick(PROFESSIONS).name,
        start_date: daysAgo(start), end_date: daysAgo(start - rand(10, 30)),
        verified: Math.random() > 0.3, rating: rand(3, 5),
      });
    }
  }
  await admin.database.from("work_history").insert(whRows);
  await admin.database.from("assessments").insert(
    workers.slice(0, 15).flatMap((w) =>
      pickN(SKILL_LIBRARY, rand(1, 2)).map((s) => ({
        worker_id: w.authId, skill_name: s.name, score: rand(45, 98),
        level: pick(["Beginner","Intermediate","Advanced","Expert"]),
        completed_at: daysAgo(rand(5, 160)),
      }))
    )
  );

  // ============ 11. FRAUD SIGNALS + SAFETY REPORTS ============
  console.log("1️⃣1️⃣  Creating fraud signals & safety reports...");
  await admin.database.from("fraud_signals").insert(
    pickN(workers, 3).concat(pickN(contractors, 2)).map((u) => ({
      user_id: u.authId, type: pick(["duplicate-listing","suspicious-activity","payment-mismatch","fake-credentials"]),
      severity: pick(["low","medium","high"]),
      description: pick([
        "Multiple accounts detected from same device.",
        "Wage rate significantly below market average.",
        "Document photos failed authenticity check.",
        "Rapid application submissions flagged.",
      ]),
      resolved: Math.random() > 0.4,
    }))
  );
  await admin.database.from("safety_reports").insert(
    [
      { reporter: pick(workers), target: pick(contractors), cat: "payment-dispute", sev: "high", desc: "Wages pending for 3 weeks after completion." },
      { reporter: pick(workers), target: pick(contractors), cat: "unsafe-workplace", sev: "medium", desc: "No safety harness provided at height work." },
      { reporter: pick(contractors), target: pick(workers), cat: "fake-worker", sev: "medium", desc: "Worker's claimed certification could not be verified." },
      { reporter: pick(workers), target: null, cat: "other", sev: "low", desc: "Site access road is dangerous at night." },
    ].map((r) => ({
      reporter_id: r.reporter.authId, target_user_id: r.target ? r.target.authId : null,
      job_id: pick(activeJobs).id, category: r.cat, severity: r.sev,
      description: r.desc, status: pick(["open","investigating","resolved"]),
    }))
  );

  // ============ 12. NOTIFICATIONS ============
  console.log("1️⃣2️⃣  Creating notifications...");
  await admin.database.from("notifications").insert(
    workers.slice(0, 10).flatMap((w) => [
      { user_id: w.authId, type: "job", title: "New jobs near you", message: "3 new Mason jobs in your area this week.", link: "/worker/jobs" },
      { user_id: w.authId, type: "payment", title: "Payment due reminder", message: "You have a payment due in 2 days.", link: "/worker/income" },
      { user_id: w.authId, type: "trust", title: "Trust score updated", message: "Your trust score improved after the latest verification.", link: "/worker/trust" },
    ]).concat([
      { user_id: adminUser.authId, type: "safety", title: "New safety report", message: "A high-severity payment dispute was filed.", link: "/admin/reports" },
      { user_id: contractors[0].authId, type: "application", title: "New applicants", message: "5 workers applied to your Masonry Work job.", link: "/contractor/applicants" },
    ])
  );

  // ============ 12.5 DEMO HERO ENRICHMENT ============
  // worker@shramsetu.local (Ramesh Kumar) is the advertised demo account —
  // bake the hero identity into the seed so every reseed reproduces it
  console.log("1️⃣2️⃣.5 Enriching demo hero (Ramesh Kumar)...");
  const hero = workers[0];
  // wipe every hero row seeded by the random pass, then rebuild deterministically
  await Promise.all([
    admin.database.from("applications").delete().eq("worker_id", hero.authId),
    admin.database.from("payments").delete().eq("worker_id", hero.authId),
    admin.database.from("reviews").delete().or([
      `reviewee_id.eq.${hero.authId}`,
      `reviewer_id.eq.${hero.authId}`,
    ].join(",")).then(() => undefined),
    admin.database.from("assessments").delete().eq("worker_id", hero.authId),
    admin.database.from("work_history").delete().eq("worker_id", hero.authId),
    admin.database.from("verifications").delete().eq("user_id", hero.authId),
  ]);
  await admin.database.from("worker_profiles").update({
    profession: "Mason",
    experience_years: 12,
    expected_daily_wage: 800,
    availability: "available",
    bio: "Master mason with 12+ years on residential and commercial sites. Specializes in brickwork, plastering and structural masonry.",
    profile_completion: 100,
    skills: ["Masonry", "Brickwork", "Plastering"],
    certifications: ["ITI Masonry Certification", "Site Safety Training (ISST)"],
    rating: 5.0,
  }).eq("user_id", hero.authId);
  const { error: heroVerErr } = await admin.database.from("verifications").insert(
    ["phone", "email", "identity", "skill", "work-history", "address"].map((t) => ({
      user_id: hero.authId, type: t, status: "verified", score: 95,
      verified_at: daysAgo(90),
    }))
  );
  if (heroVerErr) console.error(`  ✗ hero verifications: ${heroVerErr.message}`);
  // three completed, paid engagements so the hero dashboard shows real income
  const heroJobs = jobs.filter(
    (j) => j.status === "active" && !appRows.some((a: any) => a.job_id === j.id && a.worker_id === hero.authId)
  ).slice(0, 3);
  for (const [i, hj] of heroJobs.entries()) {
    await admin.database.from("applications").insert([{
      job_id: hj.id, worker_id: hero.authId, match_score: 92, status: "completed",
      applied_at: daysAgo(30 + i * 5), match_reasons: ["Skill match", "Experience match"],
    }]);
    await admin.database.from("payments").insert([{
      job_id: hj.id, worker_id: hero.authId, contractor_id: hj.contractor_id,
      amount: 4800, status: "paid", method: "UPI",
      due_date: daysAgo(6 + i * 5), paid_date: daysAgo(8 + i * 5),
    }]);
    await admin.database.from("reviews").insert([{
      reviewer_id: hj.contractor_id, reviewee_id: hero.authId, job_id: hj.id,
      rating: 5, comment: "Outstanding masonry work — precise, fast and fully professional. Would rehire.",
      reliability: 5, skill: 5, safety: 5, created_at: daysAgo(28 + i * 5),
    }]);
  }
  // deterministic strong skill record so the demo hero lands in High Trust (75+)
  await admin.database.from("assessments").insert([
    { worker_id: hero.authId, skill_name: "Masonry", score: 92, level: "Expert", completed_at: daysAgo(45) },
    { worker_id: hero.authId, skill_name: "Brickwork", score: 88, level: "Advanced", completed_at: daysAgo(60) },
    { worker_id: hero.authId, skill_name: "Plastering", score: 85, level: "Advanced", completed_at: daysAgo(75) },
  ]);
  // three verified past contracts — high-trust track record
  await admin.database.from("work_history").insert(
    [0, 1, 2].map((i) => ({
      worker_id: hero.authId, contractor_id: contractors[i].authId, job_id: heroJobs[i % Math.max(1, heroJobs.length)]?.id ?? jobs[0].id,
      role: "Mason", start_date: daysAgo(400 - i * 100), end_date: daysAgo(370 - i * 100),
      verified: true, rating: 5,
    }))
  );
  // three extra job applications in progress — healthy pipeline without hurting completion rate
  const pipelineJobs = jobs.filter(
    (j) => j.status === "active" && !appRows.some((a: any) => a.job_id === j.id && a.worker_id === hero.authId) && !heroJobs.includes(j)
  ).slice(0, 3);
  for (const [i, pj] of pipelineJobs.entries()) {
    await admin.database.from("applications").insert([{
      job_id: pj.id, worker_id: hero.authId, match_score: 88, status: i === 0 ? "selected" : "shortlisted",
      applied_at: daysAgo(2 + i), match_reasons: ["Skill match", "Within radius"],
    }]);
  }

  // ============ 13. TRUST RECALC ============
  console.log("\n1️⃣3️⃣  Recalculating trust scores (server-authoritative)...");
  let recalced = 0;
  for (const u of users) {
    const { error } = await admin.database.rpc("recalc_user_trust", { p_user_id: u.authId });
    if (error) console.error(`  ✗ trust recalc ${u.email}: ${error.message}`);
    else recalced++;
  }
  console.log(`  → ${recalced}/${users.length} trust scores computed`);

  console.log("\n✅ SEED COMPLETE");
  console.log("Demo accounts (password: demo1234):");
  console.log("  worker@shramsetu.local / contractor@shramsetu.local / admin@shramsetu.local");
  console.log("  Phone OTP login: 9876543210 (or any seeded worker phone)");
}

main().catch((e) => { console.error(e); process.exit(1); });
