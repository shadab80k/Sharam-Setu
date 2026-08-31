import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import { CITIES } from "@/lib/utils/cities";

// GET /api/admin/analytics — real platform aggregates for the admin dashboard
export async function GET() {
  const { user, response } = await requireRole("admin");
  if (!user) return response;
  const admin = getAdminClient();

  const [users, jobs, applications, payments, expenses, verifications, reports, profiles] = await Promise.all([
    admin.database.from("users").select("id, role, location, status, created_at").limit(1000),
    admin.database.from("jobs").select("id, contractor_id, location, status, category, required_skills, wage_per_day, created_at, workers_needed, workers_hired").limit(1000),
    admin.database.from("applications").select("id, job_id, worker_id, status, applied_at").limit(2000),
    admin.database.from("payments").select("id, worker_id, contractor_id, amount, status, due_date, paid_date").limit(2000),
    admin.database.from("expenses").select("id, worker_id, category, amount, date").limit(2000),
    admin.database.from("verifications").select("id, user_id, type, status").limit(1000),
    admin.database.from("safety_reports").select("id, category, severity, status, created_at").limit(500),
    admin.database.from("worker_profiles").select("user_id, profession, trust_score, availability, expected_daily_wage").limit(1000),
  ]);

  const usersRows = users.data ?? [];
  const jobsRows = jobs.data ?? [];
  const appRows = applications.data ?? [];
  const payRows = payments.data ?? [];
  const expRows = expenses.data ?? [];
  const verRows = verifications.data ?? [];
  const repRows = reports.data ?? [];
  const profRows = profiles.data ?? [];

  const workers = usersRows.filter((u: any) => u.role === "worker");
  const contractors = usersRows.filter((u: any) => u.role === "contractor");
  const activeJobs = jobsRows.filter((j: any) => j.status === "active");
  const completedJobs = jobsRows.filter((j: any) => j.status === "completed");
  const paidPayments = payRows.filter((p: any) => p.status === "paid");
  const overduePayments = payRows.filter((p: any) => p.status === "overdue");

  // City distribution (by worker locations)
  const cityDistribution = CITIES.map((c) => ({
    name: c.name,
    value: workers.filter((w: any) => w.location === c.id).length,
  })).filter((c) => c.value > 0);

  // Skill demand (jobs requiring the skill)
  const skillDemandMap = new Map<string, number>();
  for (const j of activeJobs) {
    for (const s of j.required_skills ?? []) {
      skillDemandMap.set(s, (skillDemandMap.get(s) ?? 0) + 1);
    }
  }
  const skillDemand = [...skillDemandMap.entries()]
    .map(([name, demand]) => ({ name, demand }))
    .sort((a, b) => b.demand - a.demand);

  // Worker income improvement (avg expected wage vs city base) — cohort proxy
  const avgExpected = profRows.length
    ? Math.round(profRows.reduce((s: number, p: any) => s + p.expected_daily_wage, 0) / profRows.length)
    : 0;
  const avgBase = CITIES.length ? Math.round(CITIES.reduce((s, c) => s + c.wageBase, 0) / CITIES.length) : 0;

  // Applications received per month (real counts)
  const months: { m: string; v: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const v = appRows.filter(
      (a: any) => new Date(a.applied_at) >= start && new Date(a.applied_at) < end
    ).length;
    months.push({ m: start.toLocaleString("en-IN", { month: "short" }), v });
  }

  // Trust trend: average current trust score of each signup cohort (real worker_profiles data)
  const profileScoreByUser = new Map(profRows.map((p: any) => [p.user_id, p.trust_score]));
  const trustTrend: { m: string; v: number | null }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const cohort = workers.filter(
      (w: any) => new Date(w.created_at) >= start && new Date(w.created_at) < end
    );
    const scores = cohort
      .map((w: any) => profileScoreByUser.get(w.id))
      .filter((s: any) => typeof s === "number");
    trustTrend.push({
      m: start.toLocaleString("en-IN", { month: "short" }),
      v: scores.length
        ? Math.round(scores.reduce((s: number, n: number) => s + n, 0) / scores.length)
        : null,
    });
  }

  // Payment compliance
  const paidOnTime = paidPayments.filter((p: any) => p.paid_date && new Date(p.paid_date) <= new Date(p.due_date));
  const compliance = payRows.length ? Math.round((paidOnTime.length / payRows.length) * 100) : 0;

  // Expense category distribution
  const expCategories = new Map<string, number>();
  for (const e of expRows) {
    expCategories.set(e.category, (expCategories.get(e.category) ?? 0) + e.amount);
  }

  // Signup growth (cumulative workers+contractors per month)
  const signupGrowth: { m: string; v: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const v = usersRows.filter(
      (u: any) => new Date(u.created_at) < end
    ).length;
    signupGrowth.push({ m: start.toLocaleString("en-IN", { month: "short" }), v });
  }

  return NextResponse.json({
    totals: {
      workers: workers.length,
      contractors: contractors.length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      applications: appRows.length,
      hires: appRows.filter((a: any) => ["selected", "completed"].includes(a.status)).length,
      totalWagesFlowed: paidPayments.reduce((s: number, p: any) => s + p.amount, 0),
      pendingWages: payRows.filter((p: any) => p.status !== "paid").reduce((s: number, p: any) => s + p.amount, 0),
      overdueCount: overduePayments.length,
      compliance,
      pendingVerifications: verRows.filter((v: any) => v.status === "pending").length,
      openReports: repRows.filter((r: any) => r.status === "open" || r.status === "investigating").length,
      avgExpectedWage: avgExpected,
      avgCityBaseWage: avgBase,
      avgPaidAmount: paidPayments.length
        ? Math.round(paidPayments.reduce((s: number, p: any) => s + p.amount, 0) / paidPayments.length)
        : 0,
      platformFeePotential: Math.round(paidPayments.reduce((s: number, p: any) => s + p.amount, 0) * 0.02),
    },
    cityDistribution,
    skillDemand,
    matchingTrend: months,
    trustTrend,
    signupGrowth,
    expenseCategories: [...expCategories.entries()].map(([category, total]) => ({ category, total })),
    trustDistribution: {
      excellent: profRows.filter((p: any) => p.trust_score >= 90).length,
      high: profRows.filter((p: any) => p.trust_score >= 75 && p.trust_score < 90).length,
      trusted: profRows.filter((p: any) => p.trust_score >= 60 && p.trust_score < 75).length,
      building: profRows.filter((p: any) => p.trust_score >= 40 && p.trust_score < 60).length,
      low: profRows.filter((p: any) => p.trust_score < 40).length,
    },
    reportsBySeverity: ["low", "medium", "high", "critical"].map((sev) => ({
      severity: sev,
      count: repRows.filter((r: any) => r.severity === sev).length,
    })),
    generatedAt: new Date().toISOString(),
  });
}
