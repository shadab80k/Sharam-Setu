import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import type { Role } from "@/lib/types";

/**
 * Store bootstrap: one call that hydrates the client store with all data the
 * signed-in user is allowed to see. Wire format = lib/types (camelCase).
 */
const ROLE_HOME: Record<Role, string> = {
  worker: "/worker/dashboard",
  contractor: "/contractor/dashboard",
  admin: "/admin/dashboard",
};

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const uid = session.id;
  const NIL = "00000000-0000-0000-0000-000000000000";
  const role = session.role;

  // ---- Directory (safe fields) + profiles ----
  const [usersQ, workerQ, contractorQ] = await Promise.all([
    admin.database.from("users").select("id, role, name, email, phone, avatar, location, status, created_at").limit(500),
    admin.database.from("worker_profiles").select("user_id, profession, experience_years, expected_daily_wage, availability, bio, profile_completion, preferred_radius_km, languages, skills, trust_score, trust_label, rating, completed_jobs, certifications").limit(500),
    admin.database.from("contractor_profiles").select("user_id, company_name, business_type, location, trust_score, trust_label, rating, payment_reliability, completed_jobs, response_rate, complaint_count").limit(500),
  ]);
  const users = (usersQ.data ?? []).map(M.mapUser);
  const workerProfiles = (workerQ.data ?? []).map(M.mapWorkerProfile);
  const contractorProfiles = (contractorQ.data ?? []).map(M.mapContractorProfile);

  // ---- Jobs: non-draft for everyone; contractor also gets own drafts ----
  const jobsQ = await admin.database
    .from("jobs")
    .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at")
    .neq("status", "draft")
    .limit(500);
  let jobs = (jobsQ.data ?? []).map(M.mapJob);
  if (role === "contractor") {
    const draftsQ = await admin.database
      .from("jobs")
      .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at")
      .eq("status", "draft")
      .eq("contractor_id", uid)
      .limit(100);
    jobs = [...(draftsQ.data ?? []).map(M.mapJob), ...jobs];
  }

  // ---- Applications (scoped) ----
  let applications: any[] = [];
  if (role === "worker") {
    const { data } = await admin.database
      .from("applications").select("id, job_id, worker_id, match_score, status, applied_at, match_reasons")
      .eq("worker_id", uid).limit(500);
    applications = data ?? [];
  } else if (role === "contractor") {
    const ownIds = jobs.filter((j) => j.contractorId === uid).map((j) => j.id);
    const { data } = await admin.database
      .from("applications").select("id, job_id, worker_id, match_score, status, applied_at, match_reasons")
      .in("job_id", ownIds.length ? ownIds : [NIL]).limit(1000);
    applications = data ?? [];
  } else {
    const { data } = await admin.database
      .from("applications").select("id, job_id, worker_id, match_score, status, applied_at, match_reasons").limit(1000);
    applications = data ?? [];
  }

  // ---- Payments (scoped) ----
  let payments: any[] = [];
  if (role === "worker" || role === "contractor") {
    const col = role === "worker" ? "worker_id" : "contractor_id";
    const { data } = await admin.database
      .from("payments").select("id, job_id, worker_id, contractor_id, amount, due_date, paid_date, status, method, notes")
      .eq(col, uid).limit(500);
    payments = data ?? [];
  } else {
    const { data } = await admin.database
      .from("payments").select("id, job_id, worker_id, contractor_id, amount, due_date, paid_date, status, method, notes").limit(1000);
    payments = data ?? [];
  }

  // ---- Worker-private collections ----
  let expenses: any[] = [], savingsGoals: any[] = [], enrolledCourses: any[] = [];
  let chatHistory: any[] = [], savedJobs: any[] = [];
  if (role === "worker") {
    const [e, s, c, ch, sj] = await Promise.all([
      admin.database.from("expenses").select("id, worker_id, category, amount, date, note").eq("worker_id", uid).limit(500),
      admin.database.from("savings_goals").select("id, worker_id, name, target_amount, current_amount, target_date").eq("worker_id", uid).limit(100),
      admin.database.from("enrolled_courses").select("id, user_id, course_title, enrolled_at").eq("user_id", uid).limit(100),
      admin.database.from("assistant_messages").select("id, user_id, role, content, intent, cta_label, cta_link, created_at").eq("user_id", uid).order("created_at", { ascending: true }).limit(200),
      admin.database.from("saved_jobs").select("id, user_id, job_id, created_at").eq("user_id", uid).limit(200),
    ]);
    expenses = e.data ?? []; savingsGoals = s.data ?? []; enrolledCourses = c.data ?? [];
    chatHistory = ch.data ?? []; savedJobs = sj.data ?? [];
  }

  // ---- Shared ----
  const sel = {
    reviews: "id, reviewer_id, reviewee_id, job_id, rating, comment, reliability, skill, safety, created_at",
    verifications: "id, user_id, type, status, score, verified_at",
    trustEvents: "id, user_id, category, points, reason, created_at",
    notifications: "id, user_id, type, title, message, read, link, created_at",
    safetyReports: "id, reporter_id, target_user_id, job_id, category, severity, description, status, resolution, created_at",
    fraudSignals: "id, user_id, type, severity, description, resolved, created_at",
    assessments: "id, worker_id, skill_name, score, level, completed_at",
    workHistory: "id, worker_id, contractor_id, job_id, role, start_date, end_date, verified, rating",
    skills: "id, name, category",
  };
  const isAdmin = role === "admin";

  const [reviews, verifications, trustEvents, notifications, safetyReports, fraudSignals, assessments, workHistory, skills] = await Promise.all([
    admin.database.from("reviews").select(sel.reviews).limit(500),
    isAdmin
      ? admin.database.from("verifications").select(sel.verifications).limit(500)
      : admin.database.from("verifications").select(sel.verifications).eq("user_id", uid).limit(100),
    isAdmin
      ? admin.database.from("trust_events").select(sel.trustEvents).order("created_at", { ascending: false }).limit(500)
      : admin.database.from("trust_events").select(sel.trustEvents).eq("user_id", uid).order("created_at", { ascending: false }).limit(200),
    admin.database.from("notifications").select(sel.notifications).eq("user_id", uid)
      .order("created_at", { ascending: false }).limit(200),
    admin.database.from("safety_reports").select(sel.safetyReports).order("created_at", { ascending: false }).limit(200),
    isAdmin
      ? admin.database.from("fraud_signals").select(sel.fraudSignals).limit(200)
      : admin.database.from("fraud_signals").select(sel.fraudSignals).eq("user_id", uid).limit(50),
    isAdmin
      ? admin.database.from("assessments").select(sel.assessments).limit(500)
      : admin.database.from("assessments").select(sel.assessments).eq("worker_id", uid).limit(200),
    isAdmin
      ? admin.database.from("work_history").select(sel.workHistory).limit(500)
      : admin.database.from("work_history").select(sel.workHistory).or(`worker_id.eq.${uid},contractor_id.eq.${uid}`).limit(500),
    admin.database.from("skills").select(sel.skills).limit(200),
  ]);

  return NextResponse.json({
    currentUser: { ...session, home: ROLE_HOME[role] },
    users,
    workerProfiles,
    contractorProfiles,
    skills: (skills.data ?? []).map(M.mapSkill),
    jobs,
    applications: applications.map(M.mapApplication),
    payments: payments.map(M.mapPayment),
    expenses: expenses.map(M.mapExpense),
    savingsGoals: savingsGoals.map(M.mapSavingsGoal),
    reviews: (reviews.data ?? []).map(M.mapReview),
    verifications: (verifications.data ?? []).map(M.mapVerification),
    trustEvents: (trustEvents.data ?? []).map(M.mapTrustEvent),
    notifications: (notifications.data ?? []).map(M.mapNotification),
    safetyReports: (safetyReports.data ?? []).map(M.mapSafetyReport),
    fraudSignals: (fraudSignals.data ?? []).map(M.mapFraudSignal),
    assessments: (assessments.data ?? []).map(M.mapAssessment),
    workHistory: (workHistory.data ?? []).map(M.mapWorkHistory),
    enrolledCourses: enrolledCourses.map((r: any) => ({
      userId: r.user_id, courseTitle: r.course_title, enrolledAt: M.mapChatMessage(r).createdAt,
    })),
    chatHistory: chatHistory.map(M.mapChatMessage),
    savedJobs: savedJobs.map((r: any) => r.job_id),
  });
}
