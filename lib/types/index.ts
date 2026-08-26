export type Role = "worker" | "contractor" | "admin";

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  location: string;
  createdAt: string;
  status: "active" | "suspended";
}

export interface WorkerProfile {
  userId: string;
  profession: string;
  experienceYears: number;
  expectedDailyWage: number;
  availability: "available" | "working" | "unavailable";
  bio: string;
  profileCompletion: number;
  preferredRadiusKm: number;
  languages: string[];
  skills: string[];
  trustScore: number;
  trustLabel: string;
  rating: number;
  completedJobs: number;
  certifications: string[];
}

export interface ContractorProfile {
  userId: string;
  companyName: string;
  businessType: string;
  location: string;
  trustScore: number;
  trustLabel: string;
  rating: number;
  paymentReliability: number;
  completedJobs: number;
  responseRate: number;
  complaintCount: number;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface WorkerSkill {
  workerId: string;
  skillId: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  verified: boolean;
  assessmentScore: number;
}

export interface WorkHistory {
  id: string;
  workerId: string;
  contractorId: string;
  jobId: string;
  role: string;
  startDate: string;
  endDate: string;
  verified: boolean;
  rating: number;
}

export type JobStatus = "active" | "draft" | "completed" | "closed";

export interface Job {
  id: string;
  contractorId: string;
  title: string;
  category: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  wagePerDay: number;
  startDate: string;
  endDate: string;
  workersNeeded: number;
  workersHired: number;
  status: JobStatus;
  requiredSkills: string[];
  paymentFrequency: "daily" | "weekly" | "on-completion";
  safetyNotes: string;
  createdAt: string;
}

export type ApplicationStatus =
  | "applied"
  | "viewed"
  | "shortlisted"
  | "interview"
  | "selected"
  | "rejected"
  | "completed";

export interface Application {
  id: string;
  jobId: string;
  workerId: string;
  matchScore: number;
  status: ApplicationStatus;
  appliedAt: string;
  matchReasons: string[];
}

export type PaymentStatus = "pending" | "due" | "paid" | "overdue";

export interface Payment {
  id: string;
  jobId: string;
  workerId: string;
  contractorId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  method: string;
  notes?: string;
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "rent"
  | "family"
  | "tools"
  | "medical"
  | "other";

export interface Expense {
  id: string;
  workerId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  workerId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  jobId: string;
  rating: number;
  comment: string;
  reliability: number;
  skill: number;
  safety: number;
  createdAt: string;
}

export type VerificationType =
  | "phone"
  | "email"
  | "identity"
  | "skill"
  | "work-history"
  | "address";

export type VerificationStatus = "verified" | "pending" | "rejected" | "not-started";

export interface Verification {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  score: number;
  verifiedAt?: string;
}

export interface TrustScoreEvent {
  id: string;
  userId: string;
  category: string;
  points: number;
  reason: string;
  createdAt: string;
}

export type NotificationType =
  | "job"
  | "payment"
  | "trust"
  | "verification"
  | "application"
  | "safety"
  | "ai"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export type ReportSeverity = "low" | "medium" | "high" | "critical";

export type ReportCategory =
  | "unsafe-workplace"
  | "payment-dispute"
  | "fake-job"
  | "fake-worker"
  | "harassment"
  | "fraud"
  | "other";

export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";

export interface SafetyReport {
  id: string;
  reporterId: string;
  targetUserId?: string;
  jobId?: string;
  category: ReportCategory;
  severity: ReportSeverity;
  description: string;
  status: ReportStatus;
  createdAt: string;
  resolution?: string;
}

export interface FraudSignal {
  id: string;
  userId: string;
  type: string;
  severity: ReportSeverity;
  description: string;
  createdAt: string;
  resolved: boolean;
}

export interface Assessment {
  id: string;
  workerId: string;
  skillName: string;
  score: number;
  level: string;
  completedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  intent?: string;
  cta?: { label: string; link: string };
}
