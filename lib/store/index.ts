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
} from "@/lib/types";
import { randomId, clamp } from "@/lib/utils";
import { calculateTrustScore, calculateContractorTrust } from "@/lib/services/trustEngine";

interface AppState extends SeedData {
  currentUserId: string | null;
  currentLocation: string;
  chatHistory: Record<string, ChatMessage[]>;
  dismissedOnboarding: boolean;
  toasts: { id: string; type: "success" | "error" | "info"; message: string }[];

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
  addExpense: (workerId: string, expense: Omit<Expense, "id" | "workerId">) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id">) => void;
  completeAssessment: (workerId: string, skillName: string, score: number) => void;
  applyToJob: (jobId: string, workerId: string, matchScore: number) => void;
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
            workHistory: [], // could be expanded
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

      addExpense: (workerId, expense) => {
        const e: Expense = { ...expense, id: randomId("exp"), workerId };
        set({ expenses: [e, ...get().expenses] });
        get().pushToast("success", `Expense of ₹${expense.amount} added`);
      },

      addSavingsGoal: (goal) => {
        const g: SavingsGoal = { ...goal, id: randomId("sav") };
        set({ savingsGoals: [g, ...get().savingsGoals] });
        get().pushToast("success", "Savings goal created");
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
