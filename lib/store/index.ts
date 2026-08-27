"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeedData, type SeedData } from "@/lib/data/seed";
import type {
  User,
  WorkerProfile,
  ContractorProfile,
  Job,
  Application,
  Payment,
  Expense,
  SavingsGoal,
  Review,
  Verification,
  Notification,
  SafetyReport,
  FraudSignal,
  Assessment,
  TrustScoreEvent,
  Role,
  ChatMessage,
  JobStatus,
  PaymentStatus,
  ApplicationStatus,
  ExpenseCategory,
  ReportCategory,
  ReportSeverity,
  WorkHistory,
} from "@/lib/types";
import { randomId, clamp } from "@/lib/utils";
import { calculateTrustScore, calculateContractorTrust } from "@/lib/services/trustEngine";

interface AppState extends SeedData {
  currentUserId: string | null;
  currentLocation: string;
  chatHistory: Record<string, ChatMessage[]>;
  dismissedOnboarding: boolean;
  toasts: { id: string; type: "success" | "error" | "info"; message: string }[];
  savedJobIds: string[];
  enrolledCourses: { userId: string; courseTitle: string; enrolledAt: string }[];

  // Auth
  login: (userId: string) => void;
  logout: () => void;
  loginByEmail: (email: string) => User | null;
  switchUser: (role: Role) => void;

  // UI helpers
  setLocation: (cityId: string) => void;
  pushToast: (type: "success" | "error" | "info", message: string) => void;
  dismissToast: (id: string) => void;
  markOnboarded: () => void;

  // Notifications
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  // Worker actions
  updateWorkerProfile: (userId: string, patch: Partial<WorkerProfile>) => void;
  toggleWorkerAvailability: (userId: string) => void;
  addSkill: (userId: string, skill: string) => void;
  removeSkill: (userId: string, skill: string) => void;
  addCertification: (userId: string, certName: string) => void;
  addWorkHistory: (record: Omit<WorkHistory, "id">) => void;
  requestVerification: (userId: string, type: Verification["type"]) => void;
  addIncome: (payment: Omit<Payment, "id">) => void;
  addExpense: (workerId: string, expense: Omit<Expense, "id" | "workerId">) => void;
  deleteExpense: (expenseId: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id">) => void;
  contributeToSavingsGoal: (goalId: string, amount: number) => void;
  completeAssessment: (workerId: string, skillName: string, score: number) => void;
  applyToJob: (jobId: string, workerId: string, matchScore: number) => void;
  withdrawApplication: (appId: string) => void;
  toggleSaveJob: (jobId: string) => void;
  enrollCourse: (userId: string, courseTitle: string) => void;
  markPaymentReceived: (paymentId: string) => void;

  // Contractor actions
  updateContractorProfile: (userId: string, patch: Partial<ContractorProfile>) => void;
  createJob: (job: Omit<Job, "id" | "createdAt" | "workersHired" | "status">) => Job;
  updateJob: (jobId: string, patch: Partial<Job>) => void;
  closeJob: (jobId: string) => void;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
  hireWorker: (appId: string) => void;
  markPaymentPaid: (paymentId: string) => void;
  reviewWorker: (review: Omit<Review, "id" | "createdAt">) => void;

  // Reports
  submitReport: (
    report: Omit<SafetyReport, "id" | "createdAt" | "status" | "reporterId"> & { reporterId: string }
  ) => void;
  updateReportStatus: (reportId: string, status: SafetyReport["status"]) => void;

  // Admin
  suspendUser: (userId: string) => void;
  reactivateUser: (userId: string) => void;
  approveVerification: (verificationId: string) => void;
  rejectVerification: (verificationId: string) => void;

  // Chat
  addChatMessage: (userId: string, msg: ChatMessage) => void;
  clearChat: (userId: string) => void;

  // Reset
  resetDemoData: () => void;
}

const seed = buildSeedData();

const SAMPLE_PROMPTS = [
  "Find jobs near me",
  "What should I earn?",
  "Why is my trust score 87?",
  "Where is my pending payment?",
  "How can I save more?",
  "Which skill should I learn?",
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...seed,
      currentUserId: null,
      currentLocation: "lucknow",
      chatHistory: {},
      dismissedOnboarding: false,
      toasts: [],
      savedJobIds: [],
      enrolledCourses: [],

      login: (userId) => set({ currentUserId: userId }),
      logout: () => set({ currentUserId: null }),

      loginByEmail: (email) => {
        const user = get().users.find((u) => u.email === email);
        if (user) {
          set({ currentUserId: user.id });
          return user;
        }
        return null;
      },

      switchUser: (role) => {
        const id = role === "worker" ? "usr_w_1" : role === "contractor" ? "usr_c_1" : "usr_a_1";
        set({ currentUserId: id });
      },

      setLocation: (cityId) => set({ currentLocation: cityId }),

      pushToast: (type, message) => {
        const id = randomId("toast");
        set({ toasts: [...get().toasts, { id, type, message }] });
        setTimeout(() => {
          set({ toasts: get().toasts.filter((t) => t.id !== id) });
        }, 3500);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

      markOnboarded: () => set({ dismissedOnboarding: true }),

      addNotification: (n) => {
        const note: Notification = {
          ...n,
          id: randomId("not"),
          createdAt: new Date().toISOString(),
          read: false,
        };
        set({ notifications: [note, ...get().notifications] });
      },

      markNotificationRead: (id) => {
        set({
          notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        });
      },
      markAllNotificationsRead: (userId) => {
        set({
          notifications: get().notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n
          ),
        });
      },

      updateWorkerProfile: (userId, patch) => {
        set({
          workerProfiles: get().workerProfiles.map((p) =>
            p.userId === userId ? { ...p, ...patch } : p
          ),
        });
        // Recalculate trust
        const user = get().users.find((u) => u.id === userId);
        if (user) {
          const profile = get().workerProfiles.find((p) => p.userId === userId);
          const result = calculateTrustScore({
            user,
            profile,
            verifications: get().verifications,
            assessments: get().assessments,
            workHistory: get().workHistory,
            applications: get().applications,
            payments: get().payments,
            safetyReports: get().safetyReports,
            fraudSignals: get().fraudSignals,
          });
          set({
            workerProfiles: get().workerProfiles.map((p) =>
              p.userId === userId ? { ...p, trustScore: result.score, trustLabel: result.label } : p
            ),
          });
        }
      },

      toggleWorkerAvailability: (userId) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile) return;
        const nextStatus: WorkerProfile["availability"] =
          profile.availability === "available" ? "working" : "available";
        get().updateWorkerProfile(userId, { availability: nextStatus });
        get().pushToast(
          "info",
          `Status updated to ${nextStatus === "available" ? "Available for work" : "Working / Busy"}`
        );
      },

      addSkill: (userId, skill) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile || profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
        const updatedSkills = [...profile.skills, skill];
        get().updateWorkerProfile(userId, {
          skills: updatedSkills,
          profileCompletion: Math.min(100, profile.profileCompletion + 2),
        });
        get().pushToast("success", `Skill "${skill}" added to profile`);
      },

      removeSkill: (userId, skill) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile) return;
        const updatedSkills = profile.skills.filter((s) => s !== skill);
        get().updateWorkerProfile(userId, { skills: updatedSkills });
        get().pushToast("info", `Skill "${skill}" removed`);
      },

      addCertification: (userId, certName) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile || profile.certifications.includes(certName)) return;
        const updatedCerts = [...profile.certifications, certName];
        get().updateWorkerProfile(userId, {
          certifications: updatedCerts,
          profileCompletion: Math.min(100, profile.profileCompletion + 5),
        });
        get().addNotification({
          userId,
          type: "trust",
          title: "Certification added",
          message: `+4 Trust score for certification: ${certName}`,
          link: "/worker/trust",
        });
        get().pushToast("success", `Certification "${certName}" added! (+4 Trust)`);
      },

      addWorkHistory: (record) => {
        const newRecord: WorkHistory = {
          ...record,
          id: randomId("wh"),
        };
        set({ workHistory: [newRecord, ...get().workHistory] });
        get().updateWorkerProfile(record.workerId, {
          completedJobs: (get().workerProfiles.find((p) => p.userId === record.workerId)?.completedJobs ?? 0) + 1,
        });
        get().pushToast("success", "Work history record added successfully");
      },

      requestVerification: (userId, type) => {
        const existing = get().verifications.find((v) => v.userId === userId && v.type === type);
        if (existing) {
          set({
            verifications: get().verifications.map((v) =>
              v.id === existing.id
                ? { ...v, status: "verified" as const, score: 95, verifiedAt: new Date().toISOString() }
                : v
            ),
          });
        } else {
          const newV: Verification = {
            id: randomId("ver"),
            userId,
            type,
            status: "verified",
            score: 90,
            verifiedAt: new Date().toISOString(),
          };
          set({ verifications: [newV, ...get().verifications] });
        }
        get().updateWorkerProfile(userId, {
          profileCompletion: Math.min(100, (get().workerProfiles.find((p) => p.userId === userId)?.profileCompletion ?? 80) + 5),
        });
        get().addNotification({
          userId,
          type: "verification",
          title: "Verification completed",
          message: `Your ${type.replace("-", " ")} has been successfully verified (+10 Trust).`,
          link: "/worker/trust",
        });
        get().pushToast("success", `${type.replace("-", " ").toUpperCase()} verified! Trust Score boosted.`);
      },

      addIncome: (payment) => {
        const newPayment: Payment = {
          ...payment,
          id: randomId("pay"),
          paidDate: payment.status === "paid" ? (payment.paidDate || new Date().toISOString()) : undefined,
        };
        set({ payments: [newPayment, ...get().payments] });
        get().pushToast("success", `Income of ₹${payment.amount} recorded`);
      },

      addExpense: (workerId, expense) => {
        const e: Expense = { ...expense, id: randomId("exp"), workerId };
        set({ expenses: [e, ...get().expenses] });
        get().pushToast("success", `Expense of ₹${expense.amount} added`);
      },

      deleteExpense: (expenseId) => {
        set({ expenses: get().expenses.filter((e) => e.id !== expenseId) });
        get().pushToast("info", "Expense removed");
      },

      addSavingsGoal: (goal) => {
        const g: SavingsGoal = { ...goal, id: randomId("sav") };
        set({ savingsGoals: [g, ...get().savingsGoals] });
        get().pushToast("success", "Savings goal created");
      },

      contributeToSavingsGoal: (goalId, amount) => {
        set({
          savingsGoals: get().savingsGoals.map((g) =>
            g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g
          ),
        });
        const goal = get().savingsGoals.find((g) => g.id === goalId);
        get().pushToast("success", `Added ₹${amount} to "${goal?.name ?? "Savings Goal"}"!`);
      },

      completeAssessment: (workerId, skillName, score) => {
        const level = score >= 85 ? "Expert" : score >= 70 ? "Advanced" : score >= 50 ? "Intermediate" : "Beginner";
        const asm: Assessment = {
          id: randomId("asm"),
          workerId,
          skillName,
          score,
          level,
          completedAt: new Date().toISOString(),
        };
        set({ assessments: [asm, ...get().assessments] });
        // Trust boost
        get().updateWorkerProfile(workerId, { profileCompletion: Math.min(100, (get().workerProfiles.find((p) => p.userId === workerId)?.profileCompletion ?? 80) + 3) });
        get().addNotification({
          userId: workerId,
          type: "trust",
          title: "Assessment complete",
          message: `+8 Trust Score for ${skillName} assessment (${score}%)`,
          link: "/worker/trust",
        });
        get().pushToast("success", `Assessment complete — score ${score}%`);
      },

      applyToJob: (jobId, workerId, matchScore) => {
        const existing = get().applications.find((a) => a.jobId === jobId && a.workerId === workerId);
        if (existing) {
          get().pushToast("info", "You have already applied to this job");
          return;
        }
        const app: Application = {
          id: randomId("app"),
          jobId,
          workerId,
          matchScore,
          status: "applied",
          appliedAt: new Date().toISOString(),
          matchReasons: ["Skill match", "Within radius"],
        };
        set({ applications: [app, ...get().applications] });
        const job = get().jobs.find((j) => j.id === jobId);
        if (job) {
          get().addNotification({
            userId: workerId,
            type: "application",
            title: "Application sent",
            message: `Your application for ${job.title} was sent.`,
            link: "/worker/applications",
          });
        }
        get().pushToast("success", "Application sent");
      },

      withdrawApplication: (appId) => {
        const app = get().applications.find((a) => a.id === appId);
        set({ applications: get().applications.filter((a) => a.id !== appId) });
        if (app) {
          get().pushToast("info", "Application withdrawn");
        }
      },

      toggleSaveJob: (jobId) => {
        const isSaved = get().savedJobIds.includes(jobId);
        if (isSaved) {
          set({ savedJobIds: get().savedJobIds.filter((id) => id !== jobId) });
          get().pushToast("info", "Job removed from saved");
        } else {
          set({ savedJobIds: [...get().savedJobIds, jobId] });
          get().pushToast("success", "Job saved for later");
        }
      },

      enrollCourse: (userId, courseTitle) => {
        const existing = get().enrolledCourses?.find((c) => c.userId === userId && c.courseTitle === courseTitle);
        if (existing) {
          get().pushToast("info", `Already enrolled in ${courseTitle}`);
          return;
        }
        set({
          enrolledCourses: [...(get().enrolledCourses || []), { userId, courseTitle, enrolledAt: new Date().toISOString() }],
        });
        get().addNotification({
          userId,
          type: "ai",
          title: "Course Enrolled",
          message: `You enrolled in ${courseTitle}. Training schedule sent via SMS.`,
          link: "/worker/career",
        });
        get().pushToast("success", `Successfully enrolled in ${courseTitle}!`);
      },

      markPaymentReceived: (paymentId) => {
        set({
          payments: get().payments.map((p) =>
            p.id === paymentId ? { ...p, status: "paid" as PaymentStatus, paidDate: new Date().toISOString() } : p
          ),
        });
        const pay = get().payments.find((p) => p.id === paymentId);
        if (pay) {
          get().addNotification({
            userId: pay.workerId,
            type: "payment",
            title: "Payment received",
            message: `₹${pay.amount} payment confirmed.`,
            link: "/worker/income",
          });
        }
        get().pushToast("success", "Payment marked as received");
      },

      updateContractorProfile: (userId, patch) => {
        set({
          contractorProfiles: get().contractorProfiles.map((p) =>
            p.userId === userId ? { ...p, ...patch } : p
          ),
        });
      },

      createJob: (job) => {
        const newJob: Job = {
          ...job,
          id: randomId("job"),
          createdAt: new Date().toISOString(),
          workersHired: 0,
          status: "active" as JobStatus,
        };
        set({ jobs: [newJob, ...get().jobs] });
        get().pushToast("success", "Job posted successfully");
        return newJob;
      },

      updateJob: (jobId, patch) => {
        set({
          jobs: get().jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
        });
      },

      closeJob: (jobId) => {
        get().updateJob(jobId, { status: "closed" });
        get().pushToast("info", "Job closed");
      },

      updateApplicationStatus: (appId, status) => {
        set({
          applications: get().applications.map((a) =>
            a.id === appId ? { ...a, status } : a
          ),
        });
        const app = get().applications.find((a) => a.id === appId);
        if (app) {
          const job = get().jobs.find((j) => j.id === app.jobId);
          get().addNotification({
            userId: app.workerId,
            type: "application",
            title: `Application ${status}`,
            message: `Your application for ${job?.title ?? "a job"} is now ${status}.`,
            link: "/worker/applications",
          });
        }
      },

      hireWorker: (appId) => {
        get().updateApplicationStatus(appId, "selected");
        const app = get().applications.find((a) => a.id === appId);
        if (app) {
          set({
            jobs: get().jobs.map((j) =>
              j.id === app.jobId ? { ...j, workersHired: j.workersHired + 1 } : j
            ),
          });
        }
        get().pushToast("success", "Worker hired");
      },

      markPaymentPaid: (paymentId) => {
        set({
          payments: get().payments.map((p) =>
            p.id === paymentId ? { ...p, status: "paid" as PaymentStatus, paidDate: new Date().toISOString() } : p
          ),
        });
        const pay = get().payments.find((p) => p.id === paymentId);
        if (pay) {
          get().addNotification({
            userId: pay.workerId,
            type: "payment",
            title: "Payment received",
            message: `₹${pay.amount} received from contractor.`,
            link: "/worker/income",
          });
        }
        get().pushToast("success", "Payment marked as paid");
      },

      reviewWorker: (review) => {
        const r: Review = {
          ...review,
          id: randomId("rev"),
          createdAt: new Date().toISOString(),
        };
        set({ reviews: [r, ...get().reviews] });
        get().pushToast("success", "Review submitted");
      },

      submitReport: (report) => {
        const r: SafetyReport = {
          ...report,
          id: randomId("rep"),
          createdAt: new Date().toISOString(),
          status: "open",
        };
        set({ safetyReports: [r, ...get().safetyReports] });
        get().addNotification({
          userId: "usr_a_1",
          type: "safety",
          title: "New safety report",
          message: `${report.severity} severity report filed.`,
          link: "/admin/reports",
        });
        get().pushToast("success", "Report submitted. Admin will review.");
      },

      updateReportStatus: (reportId, status) => {
        set({
          safetyReports: get().safetyReports.map((r) =>
            r.id === reportId ? { ...r, status } : r
          ),
        });
        get().pushToast("info", `Report marked as ${status}`);
      },

      suspendUser: (userId) => {
        set({
          users: get().users.map((u) => (u.id === userId ? { ...u, status: "suspended" } : u)),
        });
        get().pushToast("info", "User suspended");
      },
      reactivateUser: (userId) => {
        set({
          users: get().users.map((u) => (u.id === userId ? { ...u, status: "active" } : u)),
        });
        get().pushToast("success", "User reactivated");
      },

      approveVerification: (verificationId) => {
        set({
          verifications: get().verifications.map((v) =>
            v.id === verificationId
              ? { ...v, status: "verified" as const, score: 95, verifiedAt: new Date().toISOString() }
              : v
          ),
        });
        const v = get().verifications.find((x) => x.id === verificationId);
        if (v) {
          get().addNotification({
            userId: v.userId,
            type: "verification",
            title: "Verification approved",
            message: `Your ${v.type} verification was approved.`,
          });
        }
        get().pushToast("success", "Verification approved");
      },
      rejectVerification: (verificationId) => {
        set({
          verifications: get().verifications.map((v) =>
            v.id === verificationId ? { ...v, status: "rejected" as const } : v
          ),
        });
        get().pushToast("info", "Verification rejected");
      },

      addChatMessage: (userId, msg) => {
        const history = get().chatHistory[userId] ?? [];
        set({ chatHistory: { ...get().chatHistory, [userId]: [...history, msg] } });
      },
      clearChat: (userId) => {
        set({ chatHistory: { ...get().chatHistory, [userId]: [] } });
      },

      resetDemoData: () => {
        const fresh = buildSeedData();
        set({ ...fresh, currentUserId: null, currentLocation: "lucknow", chatHistory: {}, dismissedOnboarding: false, toasts: [] });
        get().pushToast("info", "Demo data reset");
      },
    }),
    {
      name: "shramsetu-storage-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
      partialize: (state) => {
        const {
          toasts,
          ...rest
        } = state;
        return rest as any;
      },
    }
  )
);

export const SUGGESTED_PROMPTS = SAMPLE_PROMPTS;
