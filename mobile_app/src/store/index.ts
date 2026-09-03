/**
 * ShramSetu mobile store — Zustand mirror of the web app's store.
 * Same entities, same API contracts (lib/store/index.ts in the web repo
 * is the reference implementation), RN-persisted via AsyncStorage.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  apiGet, apiPost, apiPatch, apiDelete, apiUpload, clearSession, hasSession,
} from "../api/client";
import { STORE_PERSIST_KEY } from "../config";
import type {
  Application, ApplicationStatus, Assessment, ChatMessage, ContractorProfile,
  Expense, ExpenseCategory, FraudSignal, Job, JobStatus, Notification, Payment,
  Review, SafetyReport, SavingsGoal, Skill, TrustScoreEvent, User,
  Verification, VerificationType, WorkerProfile, WorkHistory,
} from "../types";

export interface AppState {
  // Data
  currentUser: User | null;
  users: User[];
  workerProfiles: WorkerProfile[];
  contractorProfiles: ContractorProfile[];
  skills: Skill[];
  jobs: Job[];
  applications: Application[];
  payments: Payment[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  reviews: Review[];
  verifications: Verification[];
  trustEvents: TrustScoreEvent[];
  notifications: Notification[];
  safetyReports: SafetyReport[];
  fraudSignals: FraudSignal[];
  assessments: Assessment[];
  workHistory: WorkHistory[];
  enrolledCourses: { userId: string; courseTitle: string; enrolledAt: string }[];
  chatHistory: ChatMessage[];

  // UI / session
  loaded: boolean;
  loading: boolean;
  dismissedOnboarding: boolean;
  toasts: { id: string; type: "success" | "error" | "info"; message: string }[];
  savedJobIds: string[];

  // Auth
  bootstrap: () => Promise<void>;
  restoreSession: () => Promise<User | null>;
  logout: () => Promise<void>;
  loginByEmail: (email: string, password: string) => Promise<User | null>;
  sendOtp: (phone: string) => Promise<string | null>;
  verifyOtp: (phone: string, code: string, name?: string, role?: "worker" | "contractor", location?: string) => Promise<User | null>;
  signup: (data: { name: string; email: string; password: string; role: "worker" | "contractor"; phone?: string; location?: string }) => Promise<User | null>;

  // Toasts
  pushToast: (type: "success" | "error" | "info", message: string) => void;
  dismissToast: (id: string) => void;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  // Worker actions
  uploadAvatar: (uri: string) => Promise<void>;
  updateWorkerProfile: (userId: string, patch: Partial<WorkerProfile> & { name?: string; avatar?: string; location?: string }) => Promise<void>;
  toggleWorkerAvailability: (userId: string) => Promise<void>;
  addSkill: (userId: string, skill: string) => Promise<void>;
  removeSkill: (userId: string, skill: string) => Promise<void>;
  addCertification: (userId: string, certName: string) => Promise<void>;
  addWorkHistory: (record: { contractorId: string; role: string; startDate: string; endDate?: string; rating?: number; jobId?: string }) => Promise<void>;
  requestVerification: (userId: string, type: VerificationType) => Promise<void>;
  addExpense: (workerId: string, expense: { category: ExpenseCategory; amount: number; date?: string; note?: string }) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "workerId">) => Promise<void>;
  contributeToSavingsGoal: (goalId: string, amount: number) => Promise<void>;
  completeAssessment: (workerId: string, skillName: string, score: number) => Promise<void>;
  applyToJob: (jobId: string) => Promise<void>;
  withdrawApplication: (appId: string) => Promise<void>;
  toggleSaveJob: (jobId: string) => Promise<void>;
  markPaymentReceived: (paymentId: string) => Promise<void>;
  addIncome: (payment: { jobId: string; amount: number; dueDate: string; method?: string; notes?: string; status?: "paid" | "pending" }) => Promise<void>;
  enrollCourse: (userId: string, courseTitle: string) => Promise<void>;
  submitReport: (report: Omit<SafetyReport, "id" | "createdAt" | "status" | "reporterId">) => Promise<void>;
  sendAssistantMessage: (message: string) => Promise<void>;
  clearChat: (userId: string) => Promise<void>;

  // Contractor actions
  updateContractorProfile: (userId: string, patch: Partial<ContractorProfile> & { name?: string; avatar?: string; location?: string }) => Promise<void>;
  createJob: (job: Omit<Job, "id" | "createdAt" | "workersHired" | "status"> & { status?: "active" | "draft" }) => Promise<Job>;
  updateJob: (jobId: string, patch: Partial<Job>) => Promise<void>;
  closeJob: (jobId: string) => Promise<void>;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
  hireWorker: (appId: string) => Promise<void>;
  inviteWorker: (jobId: string, workerId: string) => Promise<void>;
  markPaymentPaid: (paymentId: string) => Promise<void>;
  reviewWorker: (review: Omit<Review, "id" | "createdAt">) => Promise<void>;
}

type BootstrapResponse = {
  currentUser: User;
  users: User[];
  workerProfiles: WorkerProfile[];
  contractorProfiles: ContractorProfile[];
  skills: Skill[];
  jobs: Job[];
  applications: Application[];
  payments: Payment[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  reviews: Review[];
  verifications: Verification[];
  trustEvents: TrustScoreEvent[];
  notifications: Notification[];
  safetyReports: SafetyReport[];
  fraudSignals: FraudSignal[];
  assessments: Assessment[];
  workHistory: WorkHistory[];
  enrolledCourses: { userId: string; courseTitle: string; enrolledAt: string }[];
  chatHistory?: ChatMessage[];
  savedJobs?: string[];
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [], workerProfiles: [], contractorProfiles: [], skills: [],
      jobs: [], applications: [], payments: [], expenses: [], savingsGoals: [],
      reviews: [], verifications: [], trustEvents: [], notifications: [],
      safetyReports: [], fraudSignals: [], assessments: [], workHistory: [],
      enrolledCourses: [],
      chatHistory: [],
      loaded: false,
      loading: false,
      dismissedOnboarding: false,
      toasts: [],
      savedJobIds: [],

      // ---------------- Auth ----------------
      restoreSession: async () => {
        if (!(await hasSession())) return null;
        try {
          const me = await apiGet<{ user: User }>("/api/auth/me");
          set({ currentUser: me.user });
          return me.user;
        } catch {
          await clearSession();
          set({ currentUser: null });
          return null;
        }
      },

      bootstrap: async () => {
        set({ loading: true });
        try {
          const b = await apiGet<BootstrapResponse>("/api/bootstrap");
          set({
            currentUser: b.currentUser,
            users: b.users,
            workerProfiles: b.workerProfiles,
            contractorProfiles: b.contractorProfiles,
            skills: b.skills,
            jobs: b.jobs,
            applications: b.applications,
            payments: b.payments,
            expenses: b.expenses,
            savingsGoals: b.savingsGoals,
            reviews: b.reviews,
            verifications: b.verifications,
            trustEvents: b.trustEvents,
            notifications: b.notifications,
            safetyReports: b.safetyReports,
            fraudSignals: b.fraudSignals,
            assessments: b.assessments,
            workHistory: b.workHistory,
            enrolledCourses: b.enrolledCourses ?? [],
            savedJobIds: b.savedJobs ?? [],
            loaded: true,
          });
        } catch (e: any) {
          get().pushToast("error", e.message ?? "Could not load your data");
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        try { await apiPost("/api/auth/logout"); } catch { /* best-effort */ }
        await clearSession();
        set({
          currentUser: null, users: [], workerProfiles: [], contractorProfiles: [],
          skills: [], jobs: [], applications: [], payments: [], expenses: [],
          savingsGoals: [], reviews: [], verifications: [], trustEvents: [],
          notifications: [], safetyReports: [], fraudSignals: [], assessments: [],
          workHistory: [], enrolledCourses: [], chatHistory: [], loaded: false, dismissedOnboarding: false,
        });
      },

      loginByEmail: async (email, password) => {
        try {
          const r = await apiPost<{ user: User }>("/api/auth/login", { email, password });
          set({ currentUser: r.user });
          await get().bootstrap();
          return r.user;
        } catch (e: any) {
          get().pushToast("error", e.message);
          return null;
        }
      },

      sendOtp: async (phone) => {
        try {
          const r = await apiPost<{ devOtp?: string; sent: boolean }>("/api/auth/send-otp", { phone });
          if (r.devOtp) get().pushToast("info", `Dev code: ${r.devOtp}`);
          return r.devOtp ?? null;
        } catch (e: any) {
          get().pushToast("error", e.message);
          return null;
        }
      },

      verifyOtp: async (phone, code, name, role, location) => {
        try {
          const r = await apiPost<{ user: User }>("/api/auth/verify-otp", {
            phone, code, name, role,
          });
          if (r.user) {
            set({ currentUser: r.user });
            await get().bootstrap();
            // New signups land in the default city; apply the picked one once.
            if (location) await get().updateWorkerProfile(r.user.id, { location });
          }
          return r.user ?? null;
        } catch (e: any) {
          get().pushToast("error", e.message);
          return null;
        }
      },

      signup: async (data) => {
        try {
          const r = await apiPost<{ user: User }>("/api/auth/signup", data);
          if (r.user) {
            set({ currentUser: r.user });
            await get().bootstrap();
          }
          return r.user ?? null;
        } catch (e: any) {
          get().pushToast("error", e.message);
          return null;
        }
      },

      // ---------------- Toasts ----------------
      pushToast: (type, message) => {
        const id = uid();
        set({ toasts: [...get().toasts, { id, type, message }] });
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

      // ---------------- Notifications ----------------
      markNotificationRead: async (id) => {
        set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
        try {
          await apiPost("/api/notifications", { action: "mark-read", notificationId: id });
        } catch { /* optimistic */ }
      },
      markAllNotificationsRead: async (userId) => {
        set({ notifications: get().notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) });
        try {
          await apiPost("/api/notifications", { action: "mark-all-read" });
        } catch { /* optimistic */ }
      },

      // ---------------- Worker ----------------
      uploadAvatar: async (uri) => {
        const me = get().currentUser;
        if (!me) { get().pushToast("error", "Not signed in"); return; }
        const form = new FormData();
        form.append("file", { uri, name: "avatar.jpg", type: "image/jpeg" } as any);
        try {
          // Route returns { url, key } — the profile PATCH applies it to the user.
          const up = await apiUpload<{ url: string; key?: string }>("/api/avatar", form);
          if (!up.url) throw new Error("Upload failed");
          if (me.role === "worker") {
            await get().updateWorkerProfile(me.id, { avatar: up.url });
          } else {
            await get().updateContractorProfile(me.id, { avatar: up.url });
          }
        } catch (e: any) {
          get().pushToast("error", e.message);
        }
      },

      updateWorkerProfile: async (userId, patch) => {
        try {
          const r = await apiPatch<{ profile: WorkerProfile; user?: User }>("/api/worker/profile", patch);
          if (r.profile) set({ workerProfiles: get().workerProfiles.map((p) => (p.userId === userId ? r.profile : p)) });
          if (r.user) set({ users: get().users.map((u) => (u.id === userId ? r.user! : u)), currentUser: r.user.id === get().currentUser?.id ? r.user : get().currentUser });
          get().pushToast("success", "Profile updated");
        } catch (e: any) {
          get().pushToast("error", e.message);
          throw e;
        }
      },

      toggleWorkerAvailability: async (userId) => {
        const current = get().workerProfiles.find((p) => p.userId === userId);
        if (!current) return;
        const next = current.availability === "unavailable" ? "available" : "unavailable";
        // optimistic
        set({ workerProfiles: get().workerProfiles.map((p) => (p.userId === userId ? { ...p, availability: next } : p)) });
        try {
          const r = await apiPatch<{ profile: WorkerProfile }>("/api/worker/profile", { availability: next });
          if (r.profile) set({ workerProfiles: get().workerProfiles.map((p) => (p.userId === userId ? r.profile : p)) });
          get().pushToast("info", next === "available" ? "You are Available for work" : "Marked unavailable");
        } catch (e: any) {
          set({ workerProfiles: get().workerProfiles.map((p) => (p.userId === userId ? { ...p, availability: current.availability } : p)) });
          get().pushToast("error", e.message);
        }
      },

      addSkill: async (userId, skill) => {
        const p = get().workerProfiles.find((x) => x.userId === userId);
        if (!p) return;
        try {
          const r = await apiPatch<{ profile: WorkerProfile }>("/api/worker/profile", { skills: [...p.skills, skill] });
          if (r.profile) set({ workerProfiles: get().workerProfiles.map((x) => (x.userId === userId ? r.profile : x)) });
          get().pushToast("success", "Skill added");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      removeSkill: async (userId, skill) => {
        const p = get().workerProfiles.find((x) => x.userId === userId);
        if (!p) return;
        try {
          const r = await apiPatch<{ profile: WorkerProfile }>("/api/worker/profile", { skills: p.skills.filter((s) => s !== skill) });
          if (r.profile) set({ workerProfiles: get().workerProfiles.map((x) => (x.userId === userId ? r.profile : x)) });
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      addCertification: async (userId, certName) => {
        const p = get().workerProfiles.find((x) => x.userId === userId);
        if (!p) return;
        try {
          const r = await apiPatch<{ profile: WorkerProfile }>("/api/worker/profile", { certifications: [...p.certifications, certName] });
          if (r.profile) set({ workerProfiles: get().workerProfiles.map((x) => (x.userId === userId ? r.profile : x)) });
          get().pushToast("success", "Certificate added");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      addWorkHistory: async (record) => {
        try {
          const r = await apiPost<{ workHistory: WorkHistory }>("/api/worker/actions", {
            action: "add-work-history",
            role: record.role,
            contractorId: record.contractorId,
            jobId: record.jobId,
            startDate: record.startDate,
            endDate: record.endDate,
            rating: record.rating,
          });
          if (r.workHistory) set({ workHistory: [r.workHistory, ...get().workHistory] });
          get().pushToast("success", "Work record added");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      requestVerification: async (userId, type) => {
        try {
          await apiPost("/api/worker/actions", { action: "request-verification", type });
          await get().bootstrap();
          get().pushToast("info", "Verification requested — admin will review");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      addExpense: async (workerId, expense) => {
        try {
          const r = await apiPost<{ expense: Expense }>("/api/worker/actions", {
            action: "add-expense",
            category: expense.category,
            amount: expense.amount,
            note: expense.note,
            date: expense.date,
          });
          if (r.expense) set({ expenses: [r.expense, ...get().expenses] });
          get().pushToast("success", "Expense saved");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      deleteExpense: async (expenseId) => {
        set({ expenses: get().expenses.filter((e) => e.id !== expenseId) });
        try {
          await apiPost("/api/worker/actions", { action: "delete-expense", expenseId });
        } catch (e: any) {
          await get().bootstrap();
          get().pushToast("error", e.message);
        }
      },

      addSavingsGoal: async (goal) => {
        try {
          const r = await apiPost<{ savingsGoal: SavingsGoal }>("/api/worker/actions", {
            action: "add-savings-goal",
            name: goal.name,
            targetAmount: goal.targetAmount,
            targetDate: goal.targetDate,
            currentAmount: goal.currentAmount ?? 0,
          });
          if (r.savingsGoal) set({ savingsGoals: [...get().savingsGoals, r.savingsGoal] });
          get().pushToast("success", "Goal created");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      contributeToSavingsGoal: async (goalId, amount) => {
        try {
          const r = await apiPost<{ savingsGoal: SavingsGoal }>("/api/worker/actions", {
            action: "contribute-savings", goalId, amount,
          });
          if (r.savingsGoal) set({ savingsGoals: get().savingsGoals.map((g) => (g.id === goalId ? r.savingsGoal : g)) });
          get().pushToast("success", "Contribution saved");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      completeAssessment: async (workerId, skillName, score) => {
        try {
          const r = await apiPost<{ assessment: Assessment }>("/api/worker/actions", {
            action: "complete-assessment", skillName, score,
          });
          if (r.assessment) set({ assessments: [...get().assessments, r.assessment] });
          await get().bootstrap();
          get().pushToast("success", `Quiz complete — ${score}%`);
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      applyToJob: async (jobId) => {
        try {
          const r = await apiPost<{ application: Application; matchScore: number }>("/api/applications", { jobId });
          if (r.application) set({ applications: [r.application, ...get().applications] });
          get().pushToast("success", "Application sent");
        } catch (e: any) {
          get().pushToast(e.status === 409 ? "info" : "error", e.message);
          throw e;
        }
      },

      withdrawApplication: async (appId) => {
        set({ applications: get().applications.filter((a) => a.id !== appId) });
        try {
          await apiDelete(`/api/applications/${appId}`);
          get().pushToast("info", "Application withdrawn");
        } catch (e: any) {
          await get().bootstrap();
          get().pushToast("error", e.message);
        }
      },

      toggleSaveJob: async (jobId) => {
        const saved = get().savedJobIds.includes(jobId);
        set({ savedJobIds: saved ? get().savedJobIds.filter((id) => id !== jobId) : [...get().savedJobIds, jobId] });
        try {
          await apiPost("/api/worker/actions", { action: saved ? "unsave-job" : "save-job", jobId });
        } catch {
          set({ savedJobIds: saved ? [...get().savedJobIds, jobId] : get().savedJobIds.filter((id) => id !== jobId) });
        }
      },

      markPaymentReceived: async (paymentId) => {
        try {
          const r = await apiPatch<{ payment: Payment }>(`/api/payments/${paymentId}`, { action: "mark-received" });
          if (r.payment) set({ payments: get().payments.map((p) => (p.id === paymentId ? r.payment : p)) });
          get().pushToast("success", "Payment confirmed as received");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      addIncome: async (payment) => {
        try {
          const r = await apiPost<{ payment: Payment }>("/api/payments", {
            jobId: payment.jobId,
            amount: payment.amount,
            dueDate: payment.dueDate,
            method: payment.method,
            notes: payment.notes,
            markPaid: payment.status === "paid",
          });
          if (r.payment) set({ payments: [r.payment, ...get().payments] });
          get().pushToast("success", `Income of ₹${payment.amount} recorded`);
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      enrollCourse: async (userId, courseTitle) => {
        try {
          await apiPost("/api/worker/actions", { action: "enroll-course", courseTitle });
          set({ enrolledCourses: [...get().enrolledCourses, { userId, courseTitle, enrolledAt: new Date().toISOString() }] });
          get().pushToast("success", `Enrolled in ${courseTitle}!`);
        } catch (e: any) { get().pushToast(e.status === 409 ? "info" : "error", e.message); }
      },

      submitReport: async (report) => {
        try {
          const r = await apiPost<{ report: SafetyReport }>("/api/reports", {
            targetUserId: report.targetUserId,
            jobId: report.jobId,
            category: report.category,
            severity: report.severity,
            description: report.description,
          });
          if (r.report) set({ safetyReports: [r.report, ...get().safetyReports] });
          get().pushToast("success", "Report submitted. Admin will review.");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      // ---------------- Assistant ----------------
      sendAssistantMessage: async (message) => {
        try {
          const r = await apiPost<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>("/api/assistant", { message });
          set({ chatHistory: [...get().chatHistory, r.userMessage, r.assistantMessage].filter(Boolean) });
        } catch (e: any) {
          get().pushToast("error", e.message);
        }
      },

      clearChat: async (userId) => {
        set({ chatHistory: [] });
        try { await apiDelete("/api/assistant"); } catch { /* optimistic */ }
      },

      // ---------------- Contractor ----------------
      updateContractorProfile: async (userId, patch) => {
        try {
          const r = await apiPatch<{ profile: ContractorProfile; user?: User }>("/api/contractor/profile", patch);
          if (r.profile) set({ contractorProfiles: get().contractorProfiles.map((p) => (p.userId === userId ? r.profile : p)) });
          if (r.user) set({ users: get().users.map((u) => (u.id === userId ? r.user! : u)) });
          get().pushToast("success", "Profile updated");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      createJob: async (job) => {
        try {
          const r = await apiPost<{ job: Job }>("/api/jobs", job);
          if (r.job) set({ jobs: [r.job, ...get().jobs] });
          get().pushToast("success", "Job posted");
          return r.job;
        } catch (e: any) {
          get().pushToast("error", e.message);
          throw e;
        }
      },

      updateJob: async (jobId, patch) => {
        try {
          const r = await apiPatch<{ job: Job }>(`/api/jobs/${jobId}`, patch);
          if (r.job) set({ jobs: get().jobs.map((j) => (j.id === jobId ? r.job : j)) });
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      closeJob: async (jobId) => {
        await get().updateJob(jobId, { status: "closed" as JobStatus });
        get().pushToast("info", "Job closed");
      },

      updateApplicationStatus: async (appId, status) => {
        try {
          const r = await apiPatch<{ application: Application }>(`/api/applications/${appId}`, { status });
          if (r.application) set({ applications: get().applications.map((a) => (a.id === appId ? r.application : a)) });
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      hireWorker: async (appId) => {
        try {
          const r = await apiPatch<{ application: Application }>(`/api/applications/${appId}`, { hire: true });
          if (r.application) {
            const app = r.application;
            set({
              applications: get().applications.map((a) => (a.id === appId ? app : a)),
              jobs: get().jobs.map((j) => (j.id === app.jobId ? { ...j, workersHired: j.workersHired + 1 } : j)),
            });
          }
          get().pushToast("success", "Worker hired");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      inviteWorker: async (jobId, workerId) => {
        try {
          const r = await apiPost<{ application: Application }>("/api/applications/invite", { jobId, workerId });
          if (r.application) set({ applications: [r.application, ...get().applications] });
          const worker = get().users.find((u) => u.id === workerId);
          const job = get().jobs.find((j) => j.id === jobId);
          get().pushToast("success", `${worker?.name ?? "Worker"} shortlisted for ${job?.title ?? "your job"} — they've been notified`);
        } catch (e: any) {
          get().pushToast(e.status === 409 ? "info" : "error", e.message);
          throw e;
        }
      },

      markPaymentPaid: async (paymentId) => {
        try {
          const r = await apiPatch<{ payment: Payment }>(`/api/payments/${paymentId}`, { action: "mark-paid" });
          if (r.payment) set({ payments: get().payments.map((p) => (p.id === paymentId ? r.payment : p)) });
          get().pushToast("success", "Payment marked as paid");
        } catch (e: any) { get().pushToast("error", e.message); }
      },

      reviewWorker: async (review) => {
        try {
          const r = await apiPost<{ review: Review }>("/api/reviews", {
            workerId: review.revieweeId,
            jobId: review.jobId === "" ? undefined : review.jobId,
            rating: review.rating,
            comment: review.comment,
            reliability: review.reliability,
            skill: review.skill,
            safety: review.safety,
          });
          if (r.review) set({ reviews: [r.review, ...get().reviews] });
          await get().bootstrap(); // refresh worker rating/trust
          get().pushToast("success", "Review submitted");
        } catch (e: any) { get().pushToast("error", e.message); }
      },
    }),
    {
      name: STORE_PERSIST_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        chatHistory: s.chatHistory,
        savedJobIds: s.savedJobIds,
        dismissedOnboarding: s.dismissedOnboarding,
      }),
    }
  )
);
