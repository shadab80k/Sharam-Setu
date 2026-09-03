import type { User, WorkerProfile, Verification, Assessment, WorkHistory, Application, Payment, SafetyReport, FraudSignal } from "@/types";
import { clamp, trustLabel } from "@/utils";

export interface TrustBreakdownItem {
  category: string;
  points: number;
  max: number;
  reason: string;
}

export interface TrustResult {
  score: number;
  label: string;
  breakdown: TrustBreakdownItem[];
}

export interface TrustInput {
  user: User;
  profile?: WorkerProfile;
  verifications: Verification[];
  assessments: Assessment[];
  workHistory: WorkHistory[];
  applications: Application[];
  payments: Payment[];
  safetyReports: SafetyReport[];
  fraudSignals: FraudSignal[];
}

export function calculateTrustScore(input: TrustInput): TrustResult {
  const breakdown: TrustBreakdownItem[] = [];
  const { user, profile, verifications, assessments, workHistory, applications, payments, safetyReports, fraudSignals } = input;

  // 1. Identity & account (20)
  let identity = 0;
  const phoneV = verifications.find((v) => v.userId === user.id && v.type === "phone" && v.status === "verified");
  if (phoneV) identity += 10;
  const emailV = verifications.find((v) => v.userId === user.id && v.type === "email" && v.status === "verified");
  if (emailV) identity += 5;
  if (profile) identity += Math.round((profile.profileCompletion / 100) * 5);
  breakdown.push({
    category: "Identity & Account",
    points: Math.min(20, identity),
    max: 20,
    reason: `${phoneV ? "Phone verified" : "Phone not verified"} · ${emailV ? "Email verified" : "Email not verified"} · ${profile?.profileCompletion ?? 0}% complete`,
  });

  // 2. Work history (20)
  let work = 0;
  const verifiedJobs = workHistory.filter((w) => w.workerId === user.id && w.verified).length;
  work += Math.min(10, verifiedJobs * 2);
  const completed = applications.filter((a) => a.workerId === user.id && a.status === "completed").length;
  work += Math.min(5, completed);
  if (profile) work += Math.min(5, Math.floor(profile.experienceYears / 2));
  breakdown.push({
    category: "Work History",
    points: Math.min(20, work),
    max: 20,
    reason: `${verifiedJobs} verified jobs · ${completed} completed · ${profile?.experienceYears ?? 0} yrs experience`,
  });

  // 3. Skills (20)
  let skills = 0;
  const userAssessments = assessments.filter((a) => a.workerId === user.id);
  if (userAssessments.length) {
    const avg = userAssessments.reduce((s, a) => s + a.score, 0) / userAssessments.length;
    skills += Math.round((avg / 100) * 10);
  }
  const certs = profile?.certifications.length ?? 0;
  skills += Math.min(5, certs);
  if (profile) skills += Math.min(5, Math.max(0, profile.skills.length - 1));
  breakdown.push({
    category: "Skills",
    points: Math.min(20, skills),
    max: 20,
    reason: `${userAssessments.length} assessment(s) · ${certs} certification(s) · ${profile?.skills.length ?? 0} skill(s)`,
  });

  // 4. Reputation (20)
  let reputation = 0;
  if (profile) {
    reputation += Math.round((profile.rating / 5) * 10);
  }
  const positiveReviews = workHistory.filter((w) => w.workerId === user.id && w.rating >= 4).length;
  reputation += Math.min(5, positiveReviews);
  const repeatContractors = new Set(workHistory.filter((w) => w.workerId === user.id).map((w) => w.contractorId)).size;
  reputation += Math.min(5, repeatContractors);
  breakdown.push({
    category: "Reputation",
    points: Math.min(20, reputation),
    max: 20,
    reason: `Rating ${profile?.rating.toFixed(1) ?? "—"}/5 · ${positiveReviews} positive · ${repeatContractors} repeat contractor(s)`,
  });

  // 5. Reliability & safety (20)
  let reliability = 0;
  const totalApps = applications.filter((a) => a.workerId === user.id).length;
  const completedApps = applications.filter((a) => a.workerId === user.id && a.status === "completed").length;
  const completionRate = totalApps ? completedApps / totalApps : 0.7;
  reliability += Math.round(completionRate * 8);
  const overduePayments = payments.filter((p) => p.workerId === user.id && p.status === "overdue").length;
  reliability += Math.max(0, 5 - overduePayments);
  const userReports = safetyReports.filter((r) => r.reporterId === user.id && r.status !== "dismissed");
  const userFraud = fraudSignals.filter((f) => f.userId === user.id && !f.resolved);
  reliability += Math.max(0, 7 - userReports.length * 2 - userFraud.length * 3);
  breakdown.push({
    category: "Reliability & Safety",
    points: Math.min(20, reliability),
    max: 20,
    reason: `${Math.round(completionRate * 100)}% completion · ${overduePayments} overdue · ${userReports.length + userFraud.length} safety/fraud signal(s)`,
  });

  const raw = breakdown.reduce((s, b) => s + b.points, 0);
  const score = clamp(raw, 0, 100);
  return {
    score,
    label: trustLabel(score),
    breakdown,
  };
}

export function calculateContractorTrust(input: {
  user: User;
  verifications?: Verification[];
  jobs?: { id: string; contractorId: string; status: string }[];
  payments?: Payment[];
  safetyReports?: SafetyReport[];
}): TrustResult {
  const breakdown: TrustBreakdownItem[] = [];
  const verifications = input?.verifications ?? [];
  const jobs = input?.jobs ?? [];
  const payments = input?.payments ?? [];
  const safetyReports = input?.safetyReports ?? [];
  const userId = input?.user?.id ?? "";

  const verificationsCount = verifications.filter((v) => v.userId === userId && v.status === "verified").length;
  const profile = Math.min(20, verificationsCount * 3);
  breakdown.push({ category: "Profile Verification", points: profile, max: 20, reason: `${verificationsCount} verifications` });

  const completed = jobs.filter((j) => j.contractorId === userId && j.status === "completed").length;
  const jobScore = Math.min(20, completed * 2);
  breakdown.push({ category: "Completed Jobs", points: jobScore, max: 20, reason: `${completed} jobs completed` });

  const contractorPayments = payments.filter((p) => p.contractorId === userId);
  const paid = contractorPayments.filter((p) => p.status === "paid").length;
  const reliability = contractorPayments.length ? Math.round((paid / contractorPayments.length) * 20) : 12;
  breakdown.push({ category: "Payment Reliability", points: reliability, max: 20, reason: `${paid}/${contractorPayments.length} paid on time` });

  const complaints = safetyReports.filter((r) => r.targetUserId === userId).length;
  const safety = Math.max(0, 20 - complaints * 4);
  breakdown.push({ category: "Safety Record", points: safety, max: 20, reason: `${complaints} complaint(s)` });

  const response = 15;
  breakdown.push({ category: "Response Rate", points: response, max: 20, reason: "~85% response rate" });

  const total = breakdown.reduce((s, b) => s + b.points, 0);
  const score = clamp(total, 0, 100);
  return { score, label: trustLabel(score), breakdown };
}
