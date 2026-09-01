import "server-only";
import type {
  User, WorkerProfile, ContractorProfile, Skill, Job, Application, Payment,
  Expense, SavingsGoal, Review, Verification, TrustScoreEvent, Notification,
  SafetyReport, FraudSignal, Assessment, WorkHistory, ChatMessage,
} from "@/lib/types";

/** DB (snake_case) → frontend type (camelCase, ISO strings). */

function iso(v: unknown): string {
  return v ? new Date(v as string).toISOString() : new Date().toISOString();
}
function isoOpt(v: unknown): string | undefined {
  return v ? new Date(v as string).toISOString() : undefined;
}

export function mapUser(r: any): User {
  return {
    id: r.id, role: r.role, name: r.name, email: r.email, phone: r.phone ?? "",
    avatar: r.avatar ?? "", location: r.location, createdAt: iso(r.created_at), status: r.status,
  };
}

export function mapWorkerProfile(r: any): WorkerProfile {
  return {
    userId: r.user_id, profession: r.profession, experienceYears: r.experience_years,
    expectedDailyWage: r.expected_daily_wage, availability: r.availability,
    bio: r.bio, profileCompletion: r.profile_completion,
    preferredRadiusKm: r.preferred_radius_km, languages: r.languages ?? [],
    skills: r.skills ?? [], trustScore: r.trust_score, trustLabel: r.trust_label,
    rating: Number(r.rating), completedJobs: r.completed_jobs, certifications: r.certifications ?? [],
  };
}

export function mapContractorProfile(r: any): ContractorProfile {
  return {
    userId: r.user_id, companyName: r.company_name, businessType: r.business_type,
    location: r.location, trustScore: r.trust_score, trustLabel: r.trust_label,
    rating: Number(r.rating), paymentReliability: r.payment_reliability ?? 0,
    completedJobs: r.completed_jobs ?? 0,
    // paidPayments is computed by the caller (bootstrap/profile API) from the
    // payments ledger so the UI can hide reliability when there's no history
    paidPayments: r.paid_payments ?? 0,
    complaintCount: r.complaint_count,
  };
}

export function mapSkill(r: any): Skill {
  return { id: r.id, name: r.name, category: r.category };
}

export function mapJob(r: any): Job {
  return {
    id: r.id, contractorId: r.contractor_id, title: r.title, category: r.category,
    description: r.description, location: r.location,
    latitude: Number(r.latitude), longitude: Number(r.longitude),
    wagePerDay: r.wage_per_day, startDate: iso(r.start_date), endDate: iso(r.end_date),
    workersNeeded: r.workers_needed, workersHired: r.workers_hired, status: r.status,
    requiredSkills: r.required_skills ?? [], paymentFrequency: r.payment_frequency,
    safetyNotes: r.safety_notes, createdAt: iso(r.created_at),
  };
}

export function mapApplication(r: any): Application {
  return {
    id: r.id, jobId: r.job_id, workerId: r.worker_id, matchScore: r.match_score,
    status: r.status, appliedAt: iso(r.applied_at), matchReasons: r.match_reasons ?? [],
  };
}

export function mapPayment(r: any): Payment {
  return {
    id: r.id, jobId: r.job_id, workerId: r.worker_id, contractorId: r.contractor_id,
    amount: r.amount, dueDate: iso(r.due_date), paidDate: isoOpt(r.paid_date),
    status: r.status, method: r.method, notes: r.notes ?? undefined,
  };
}

export function mapExpense(r: any): Expense {
  return { id: r.id, workerId: r.worker_id, category: r.category, amount: r.amount, date: iso(r.date), note: r.note ?? undefined };
}

export function mapSavingsGoal(r: any): SavingsGoal {
  return {
    id: r.id, workerId: r.worker_id, name: r.name, targetAmount: r.target_amount,
    currentAmount: r.current_amount, targetDate: iso(r.target_date),
  };
}

export function mapReview(r: any): Review {
  return {
    id: r.id, reviewerId: r.reviewer_id, revieweeId: r.reviewee_id, jobId: r.job_id ?? "",
    rating: r.rating, comment: r.comment, reliability: r.reliability, skill: r.skill,
    safety: r.safety, createdAt: iso(r.created_at),
  };
}

export function mapVerification(r: any): Verification {
  return {
    id: r.id, userId: r.user_id, type: r.type, status: r.status, score: r.score,
    verifiedAt: isoOpt(r.verified_at),
  };
}

export function mapTrustEvent(r: any): TrustScoreEvent {
  return { id: r.id, userId: r.user_id, category: r.category, points: r.points, reason: r.reason, createdAt: iso(r.created_at) };
}

export function mapNotification(r: any): Notification {
  return {
    id: r.id, userId: r.user_id, type: r.type, title: r.title, message: r.message,
    read: r.read, createdAt: iso(r.created_at), link: r.link ?? undefined,
  };
}

export function mapSafetyReport(r: any): SafetyReport {
  return {
    id: r.id, reporterId: r.reporter_id, targetUserId: r.target_user_id ?? undefined,
    jobId: r.job_id ?? undefined, category: r.category, severity: r.severity,
    description: r.description, status: r.status, createdAt: iso(r.created_at),
    resolution: r.resolution ?? undefined,
  };
}

export function mapFraudSignal(r: any): FraudSignal {
  return {
    id: r.id, userId: r.user_id, type: r.type, severity: r.severity,
    description: r.description, createdAt: iso(r.created_at), resolved: r.resolved,
  };
}

export function mapAssessment(r: any): Assessment {
  return {
    id: r.id, workerId: r.worker_id, skillName: r.skill_name, score: r.score,
    level: r.level, completedAt: iso(r.completed_at),
  };
}

export function mapWorkHistory(r: any): WorkHistory {
  return {
    id: r.id, workerId: r.worker_id, contractorId: r.contractor_id, jobId: r.job_id ?? "",
    role: r.role, startDate: iso(r.start_date), endDate: iso(r.end_date ?? r.start_date),
    verified: r.verified, rating: r.rating ?? 0,
  };
}

export function mapChatMessage(r: any): ChatMessage {
  return {
    id: r.id, role: r.role, content: r.content, createdAt: iso(r.created_at),
    intent: r.intent ?? undefined,
    cta: r.cta_label && r.cta_link ? { label: r.cta_label, link: r.cta_link } : undefined,
  };
}
