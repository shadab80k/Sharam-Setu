"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  User, WorkerProfile, ContractorProfile, Job, Application, Payment, Expense,
  SavingsGoal, Review, Verification, Notification, SafetyReport, FraudSignal,
  Assessment, TrustScoreEvent, Role, ChatMessage, JobStatus, PaymentStatus,
  ApplicationStatus, ExpenseCategory, ReportCategory, ReportSeverity, Skill, WorkHistory,
} from "@/lib/types";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api/client";
import { calculateTrustScore, calculateContractorTrust } from "@/lib/services/trustEngine";

/**
 * API-synced store. Pages read state exactly as before (same selectors);
 * every mutation now goes through the BFF (validation + RBAC server-side),
 * then refreshes from the server's authoritative response.
 */

export interface AppState {
  // Data (from /api/bootstrap)
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

  // Session/UI
  currentUserId: string | null;
  /** Derived from the signed-in user's persisted location — NOT an independent preference */
  currentLocation: string;
  loaded: boolean;
  loading: boolean;
  dismissedOnboarding: boolean;
  toasts: { id: string; type: "success" | "error" | "info"; message: string }[];
  savedJobIds: string[];

  // Realtime (event IDs already applied — dedupe)
  appliedRealtimeIds: Set<string>;

  // Auth
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
  loginByEmail: (email: string, password: string) => Promise<User | null>;
  sendOtp: (phone: string) => Promise<string | null>;
  verifyOtp: (phone: string, code: string, name?: string, role?: "worker" | "contractor") => Promise<User | null>;
  signup: (data: { name: string; email: string; password: string; role: "worker" | "contractor"; phone?: string; location?: string }) => Promise<User | null>;

  // UI helpers
  setLocation: (cityId: string) => void;
  pushToast: (type: "success" | "error" | "info", message: string) => void;
  dismissToast: (id: string) => void;
  markOnboarded: () => void;
  /** Uploads a photo via the server route and sets it as the current user's avatar */
  uploadAvatar: (file: File) => Promise<void>;

  // Notifications
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  // Worker actions
  updateWorkerProfile: (userId: string, patch: Partial<WorkerProfile> & { name?: string; avatar?: string; location?: string }) => Promise<void>;
  toggleWorkerAvailability: (userId: string) => Promise<void>;
  addSkill: (userId: string, skill: string) => Promise<void>;
  removeSkill: (userId: string, skill: string) => Promise<void>;
  addCertification: (userId: string, certName: string) => Promise<void>;
  addWorkHistory: (record: { contractorId: string; role: string; startDate: string; endDate?: string; rating?: number; jobId?: string }) => Promise<void>;
  requestVerification: (userId: string, type: Verification["type"]) => Promise<void>;
  addIncome: (payment: Omit<Payment, "id">) => Promise<void>;
  addExpense: (workerId: string, expense: { category: ExpenseCategory; amount: number; date?: string; note?: string }) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "workerId">) => Promise<void>;
  contributeToSavingsGoal: (goalId: string, amount: number) => Promise<void>;
  completeAssessment: (workerId: string, skillName: string, score: number) => Promise<void>;
  applyToJob: (jobId: string, workerId: string, matchScore: number) => Promise<void>;
  withdrawApplication: (appId: string) => Promise<void>;
  toggleSaveJob: (jobId: string) => Promise<void>;
  enrollCourse: (userId: string, courseTitle: string) => Promise<void>;
  markPaymentReceived: (paymentId: string) => Promise<void>;

  // Contractor actions
  updateContractorProfile: (userId: string, patch: Partial<ContractorProfile> & { name?: string; avatar?: string; location?: string }) => Promise<void>;
  createJob: (job: Omit<Job, "id" | "createdAt" | "workersHired" | "status"> & { status?: "active" | "draft" }) => Promise<Job>;
  updateJob: (jobId: string, patch: Partial<Job>) => Promise<void>;
  closeJob: (jobId: string) => Promise<void>;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
  hireWorker: (appId: string) => Promise<void>;
  markPaymentPaid: (paymentId: string) => Promise<void>;
  reviewWorker: (review: Omit<Review, "id" | "createdAt">) => Promise<void>;

  // Reports
  submitReport: (report: Omit<SafetyReport, "id" | "createdAt" | "status" | "reporterId">) => Promise<void>;
  updateReportStatus: (reportId: string, status: SafetyReport["status"], resolution?: string) => Promise<void>;

  // Admin
  suspendUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  approveVerification: (verificationId: string) => Promise<void>;
  rejectVerification: (verificationId: string) => Promise<void>;
  resolveFraudSignal: (fraudId: string, resolved: boolean) => Promise<void>;
  sweepPayments: () => Promise<void>;

  // Chat (assistant)
  addChatMessage: (userId: string, msg: ChatMessage) => void;
  sendAssistantMessage: (message: string) => Promise<void>;
  clearChat: (userId: string) => Promise<void>;
}

const EMPTY = {
  users: [], workerProfiles: [], contractorProfiles: [], skills: [], jobs: [],
  applications: [], payments: [], expenses: [], savingsGoals: [], reviews: [],
  verifications: [], trustEvents: [], notifications: [], safetyReports: [],
  fraudSignals: [], assessments: [], workHistory: [], enrolledCourses: [],
  chatHistory: [],
};

let toastSeq = 0;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      currentUserId: null,
      currentLocation: "lucknow",
      loaded: false,
      loading: false,
      dismissedOnboarding: false,
      toasts: [],
      savedJobIds: [],
      appliedRealtimeIds: new Set<string>(),

      // ---------------- Auth ----------------
      bootstrap: async () => {
        if (get().loading) return;
        set({ loading: true });
        try {
          const data = await apiGet<any>("/api/bootstrap");
          const me = data.currentUser;
          set({
            ...data,
            currentUserId: me?.id ?? null,
            // Single source of truth: the persisted user row's city
            currentLocation: me?.location ?? "lucknow",
            loaded: true,
            loading: false,
            appliedRealtimeIds: new Set<string>(),
          });
        } catch {
          set({ loaded: true, loading: false, currentUserId: null });
        }
      },

      logout: async () => {
        try { await apiPost("/api/auth/logout"); } catch { /* ignore */ }
        set({ ...EMPTY, currentUserId: null, loaded: true, savedJobIds: [], chatHistory: [] });
      },

      loginByEmail: async (email, password) => {
        const res = await apiPost<{ user: User }>("/api/auth/login", { email, password });
        set({ currentUserId: res.user.id });
        await get().bootstrap();
        const user = get().users.find((u) => u.id === res.user.id);
        return user ?? res.user;
      },

      sendOtp: async (phone) => {
        const res = await apiPost<{ devOtp?: string; sent: boolean }>("/api/auth/send-otp", { phone });
        return res.devOtp ?? null;
      },

      verifyOtp: async (phone, code, name, role) => {
        const res = await apiPost<{ user: User }>("/api/auth/verify-otp", { phone, code, name, role });
        set({ currentUserId: res.user.id });
        await get().bootstrap();
        return get().users.find((u) => u.id === res.user.id) ?? res.user;
      },

      signup: async (data) => {
        const res = await apiPost<{ user: User }>("/api/auth/signup", data);
        set({ currentUserId: res.user.id });
        await get().bootstrap();
        return get().users.find((u) => u.id === res.user.id) ?? res.user;
      },

      // ---------------- UI ----------------
      /** Changes the user's persisted city (workers/contractors via their profile API); admin stays UI-scoped */
      setLocation: (cityId) => {
        const uid = get().currentUserId;
        const me = get().users.find((u) => u.id === uid);
        if (!me) return;
        if (me.role === "worker") {
          void get().updateWorkerProfile(uid as string, { location: cityId }).then(() => {
            set({ currentLocation: cityId });
          });
        } else if (me.role === "contractor") {
          void get().updateContractorProfile(uid as string, { location: cityId }).then(() => {
            set({ currentLocation: cityId });
          });
        } else {
          // Admin has no editable city profile; keep it a pure UI filter
          set({ currentLocation: cityId });
        }
      },

      pushToast: (type, message) => {
        const id = `toast_${++toastSeq}`;
        set({ toasts: [...get().toasts, { id, type, message }] });
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3500);
      },

      uploadAvatar: async (file) => {
        const uid = get().currentUserId;
        const me = get().users.find((u) => u.id === uid);
        if (!uid || !me) throw new Error("Not signed in");
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/avatar", { method: "POST", body: fd });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.url) throw new Error(body.error ?? "Upload failed");
        if (me.role === "worker") {
          await get().updateWorkerProfile(uid, { avatar: body.url });
        } else {
          await get().updateContractorProfile(uid, { avatar: body.url });
        }
        get().pushToast("success", "Profile photo updated");
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
      markOnboarded: () => set({ dismissedOnboarding: true }),

      // ---------------- Notifications ----------------
      markNotificationRead: async (id) => {
        set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
        try { await apiPost("/api/notifications", { action: "mark-read", notificationId: id }); }
        catch (e: any) { get().pushToast("error", e.message); }
      },
      markAllNotificationsRead: async (userId) => {
        set({ notifications: get().notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) });
        try { await apiPost("/api/notifications", { action: "mark-all-read" }); }
        catch (e: any) { get().pushToast("error", e.message); }
      },

      // ---------------- Worker ----------------
      updateWorkerProfile: async (userId, patch) => {
        try {
          const res = await apiPatch<{ profile: WorkerProfile; user: User }>("/api/worker/profile", patch);
          if (res.profile) set({ workerProfiles: upsertBy(res.profile, "userId", get().workerProfiles) });
          if (res.user) set({ users: upsertBy(res.user, "id", get().users) });
          // refresh trust events breakdown
          get().bootstrap();
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      toggleWorkerAvailability: async (userId) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile) return;
        const next = profile.availability === "available" ? "working" : "available";
        try {
          await get().updateWorkerProfile(userId, { availability: next });
          get().pushToast("info", `Status updated to ${next === "available" ? "Available for work" : "Working / Busy"}`);
        } catch { /* toast already pushed */ }
      },

      addSkill: async (userId, skill) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile || profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
        await get().updateWorkerProfile(userId, { skills: [...profile.skills, skill] });
        get().pushToast("success", `Skill "${skill}" added to profile`);
      },

      removeSkill: async (userId, skill) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile) return;
        await get().updateWorkerProfile(userId, { skills: profile.skills.filter((s) => s !== skill) });
        get().pushToast("info", `Skill "${skill}" removed`);
      },

      addCertification: async (userId, certName) => {
        const profile = get().workerProfiles.find((p) => p.userId === userId);
        if (!profile || profile.certifications.includes(certName)) return;
        await get().updateWorkerProfile(userId, { certifications: [...profile.certifications, certName] });
        get().pushToast("success", `Certification "${certName}" added!`);
      },

      addWorkHistory: async (record) => {
        try {
          const res = await apiPost<{ workHistory: WorkHistory }>("/api/worker/actions", {
            action: "add-work-history", ...record,
          });
          if (res.workHistory) set({ workHistory: [res.workHistory, ...get().workHistory] });
          get().pushToast("success", "Work history record submitted for verification");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      requestVerification: async (userId, type) => {
        try {
          await apiPost("/api/worker/actions", { action: "request-verification", type });
          await get().bootstrap();
          get().pushToast("success", `${type.replace("-", " ").toUpperCase()} verification submitted for review`);
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      addIncome: async (payment) => {
        try {
          const res = await apiPost<{ payment: Payment }>("/api/payments", {
            jobId: payment.jobId, amount: payment.amount, dueDate: payment.dueDate,
            method: payment.method, notes: payment.notes, markPaid: payment.status === "paid",
          });
          if (res.payment) set({ payments: [res.payment, ...get().payments] });
          get().pushToast("success", `Income of ₹${payment.amount} recorded`);
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      addExpense: async (workerId, expense) => {
        try {
          const res = await apiPost<{ expense: Expense }>("/api/worker/actions", {
            action: "add-expense",
            category: expense.category,
            amount: expense.amount,
            note: expense.note,
            ...(expense.date ? { date: new Date(expense.date).toISOString() } : {}),
          });
          if (res.expense) set({ expenses: [res.expense, ...get().expenses] });
          get().pushToast("success", `Expense of ₹${expense.amount} added`);
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      deleteExpense: async (expenseId) => {
        set({ expenses: get().expenses.filter((e) => e.id !== expenseId) });
        try {
          await apiPost("/api/worker/actions", { action: "delete-expense", expenseId });
          get().pushToast("info", "Expense removed");
        } catch (e: any) {
          await get().bootstrap();
          get().pushToast("error", e.message);
        }
      },

      addSavingsGoal: async (goal) => {
        try {
          const res = await apiPost<{ savingsGoal: SavingsGoal }>("/api/worker/actions", {
            action: "add-savings-goal", name: goal.name,
            targetAmount: goal.targetAmount, targetDate: goal.targetDate,
            ...(goal.currentAmount ? { currentAmount: goal.currentAmount } : {}),
          });
          if (res.savingsGoal) set({ savingsGoals: [res.savingsGoal, ...get().savingsGoals] });
          get().pushToast("success", "Savings goal created");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      contributeToSavingsGoal: async (goalId, amount) => {
        const goal = get().savingsGoals.find((g) => g.id === goalId);
        // optimistic
        if (goal) {
          set({ savingsGoals: get().savingsGoals.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g)) });
        }
        try {
          const res = await apiPost<{ savingsGoal: SavingsGoal }>("/api/worker/actions", {
            action: "contribute-savings", goalId, amount,
          });
          if (res.savingsGoal) {
            set({ savingsGoals: get().savingsGoals.map((g) => (g.id === goalId ? res.savingsGoal! : g)) });
          }
          get().pushToast("success", `Added ₹${amount} to "${goal?.name ?? "Savings Goal"}"!`);
        } catch (e: any) {
          await get().bootstrap();
          get().pushToast("error", e.message);
        }
      },

      completeAssessment: async (workerId, skillName, score) => {
        try {
          const res = await apiPost<{ assessment: Assessment }>("/api/worker/actions", {
            action: "complete-assessment", skillName, score,
          });
          if (res.assessment) set({ assessments: [res.assessment, ...get().assessments] });
          get().bootstrap(); // refresh trust score
          get().pushToast("success", `Assessment complete — score ${score}%`);
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      applyToJob: async (jobId, _workerId, _matchScore) => {
        try {
          const res = await apiPost<{ application: Application; matchScore: number }>("/api/applications", { jobId });
          if (res.application) set({ applications: [res.application, ...get().applications] });
          get().pushToast("success", "Application sent");
        } catch (e: any) {
          get().pushToast(e instanceof Object && e.status === 409 ? "info" : "error", e.message);
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
        const isSaved = get().savedJobIds.includes(jobId);
        // optimistic
        set({
          savedJobIds: isSaved
            ? get().savedJobIds.filter((id) => id !== jobId)
            : [...get().savedJobIds, jobId],
        });
        try {
          await apiPost("/api/worker/actions", { action: isSaved ? "unsave-job" : "save-job", jobId });
          get().pushToast(isSaved ? "info" : "success", isSaved ? "Job removed from saved" : "Job saved for later");
        } catch (e: any) {
          set({ savedJobIds: isSaved ? [...get().savedJobIds, jobId] : get().savedJobIds.filter((id) => id !== jobId) });
          get().pushToast("error", e.message);
        }
      },

      enrollCourse: async (userId, courseTitle) => {
        try {
          await apiPost("/api/worker/actions", { action: "enroll-course", courseTitle });
          set({
            enrolledCourses: [...get().enrolledCourses, { userId, courseTitle, enrolledAt: new Date().toISOString() }],
          });
          get().pushToast("success", `Successfully enrolled in ${courseTitle}!`);
        } catch (e: any) { get().pushToast(e.status === 409 ? "info" : "error", e.message); }
      },

      markPaymentReceived: async (paymentId) => {
        try {
          const res = await apiPatch<{ payment: Payment }>(`/api/payments/${paymentId}`, { action: "mark-received" });
          if (res.payment) set({ payments: get().payments.map((p) => (p.id === paymentId ? res.payment! : p)) });
          get().pushToast("success", "Payment confirmed as received");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      // ---------------- Contractor ----------------
      updateContractorProfile: async (userId, patch) => {
        try {
          const res = await apiPatch<{ profile: ContractorProfile; user: User }>("/api/contractor/profile", patch);
          if (res.profile) set({ contractorProfiles: upsertBy(res.profile, "userId", get().contractorProfiles) });
          if (res.user) set({ users: upsertBy(res.user, "id", get().users) });
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      createJob: async (job) => {
        const res = await apiPost<{ job: Job }>("/api/jobs", job);
        if (res.job) set({ jobs: [res.job, ...get().jobs] });
        get().pushToast("success", "Job posted successfully");
        return res.job;
      },

      updateJob: async (jobId, patch) => {
        try {
          const wire: any = { ...patch };
          if (patch.wagePerDay !== undefined) { wire.wagePerDay = patch.wagePerDay; delete wire.wage_per_day; }
          const res = await apiPatch<{ job: Job }>(`/api/jobs/${jobId}`, wire);
          if (res.job) set({ jobs: get().jobs.map((j) => (j.id === jobId ? res.job! : j)) });
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      closeJob: async (jobId) => {
        await get().updateJob(jobId, { status: "closed" as JobStatus });
        get().pushToast("info", "Job closed");
      },

      updateApplicationStatus: async (appId, status) => {
        try {
          const res = await apiPatch<{ application: Application }>(`/api/applications/${appId}`, { status });
          if (res.application) {
            set({ applications: get().applications.map((a) => (a.id === appId ? res.application! : a)) });
          }
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      hireWorker: async (appId) => {
        try {
          const res = await apiPatch<{ application: Application }>(`/api/applications/${appId}`, { hire: true });
          if (res.application) {
            const app = res.application;
            set({
              applications: get().applications.map((a) => (a.id === appId ? app : a)),
              jobs: get().jobs.map((j) =>
                j.id === app.jobId ? { ...j, workersHired: j.workersHired + 1 } : j
              ),
            });
          }
          get().pushToast("success", "Worker hired");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      markPaymentPaid: async (paymentId) => {
        try {
          const res = await apiPatch<{ payment: Payment }>(`/api/payments/${paymentId}`, { action: "mark-paid" });
          if (res.payment) set({ payments: get().payments.map((p) => (p.id === paymentId ? res.payment! : p)) });
          get().pushToast("success", "Payment marked as paid");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      reviewWorker: async (review) => {
        try {
          const res = await apiPost<{ review: Review }>("/api/reviews", {
            workerId: review.revieweeId, jobId: review.jobId === "" ? undefined : review.jobId,
            rating: review.rating, comment: review.comment,
            reliability: review.reliability, skill: review.skill, safety: review.safety,
          });
          if (res.review) set({ reviews: [res.review, ...get().reviews] });
          get().bootstrap(); // refresh worker rating/trust
          get().pushToast("success", "Review submitted");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      // ---------------- Reports ----------------
      submitReport: async (report) => {
        try {
          const res = await apiPost<{ report: SafetyReport }>("/api/reports", {
            targetUserId: report.targetUserId, jobId: report.jobId,
            category: report.category, severity: report.severity, description: report.description,
          });
          if (res.report) set({ safetyReports: [res.report, ...get().safetyReports] });
          get().pushToast("success", "Report submitted. Admin will review.");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      updateReportStatus: async (reportId, status, resolution) => {
        try {
          await apiPost("/api/admin/actions", { action: "update-report-status", reportId, status, resolution });
          set({ safetyReports: get().safetyReports.map((r) => (r.id === reportId ? { ...r, status, resolution: resolution ?? r.resolution } : r)) });
          get().pushToast("info", `Report marked as ${status}`);
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      // ---------------- Admin ----------------
      suspendUser: async (userId) => {
        try {
          await apiPost("/api/admin/actions", { action: "suspend-user", userId });
          set({ users: get().users.map((u) => (u.id === userId ? { ...u, status: "suspended" } : u)) });
          get().pushToast("info", "User suspended");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      reactivateUser: async (userId) => {
        try {
          await apiPost("/api/admin/actions", { action: "reactivate-user", userId });
          set({ users: get().users.map((u) => (u.id === userId ? { ...u, status: "active" } : u)) });
          get().pushToast("success", "User reactivated");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      approveVerification: async (verificationId) => {
        try {
          await apiPost("/api/admin/actions", { action: "approve-verification", verificationId });
          await get().bootstrap();
          get().pushToast("success", "Verification approved");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      rejectVerification: async (verificationId) => {
        try {
          await apiPost("/api/admin/actions", { action: "reject-verification", verificationId });
          await get().bootstrap();
          get().pushToast("info", "Verification rejected");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      resolveFraudSignal: async (fraudId, resolved) => {
        try {
          await apiPost("/api/admin/actions", { action: "resolve-fraud", fraudId, resolved });
          set({ fraudSignals: get().fraudSignals.map((f) => (f.id === fraudId ? { ...f, resolved } : f)) });
          get().pushToast("info", resolved ? "Fraud signal resolved" : "Fraud signal reopened");
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      sweepPayments: async () => {
        try {
          const res = await apiPost<{ swept: number }>("/api/admin/actions", { action: "sweep-payments" });
          await get().bootstrap();
          get().pushToast("success", `Escrow sweep complete — ${res.swept ?? 0} payment(s) updated`);
        } catch (e: any) { get().pushToast("error", e.message); throw e; }
      },

      // ---------------- Chat ----------------
      addChatMessage: (userId, msg) => {
        const history = get().chatHistory ?? [];
        if (history.some((m) => m.id === msg.id)) return; // dedupe realtime vs local
        set({ chatHistory: [...history, msg] });
      },

      sendAssistantMessage: async (message) => {
        const userId = get().currentUserId!;
        try {
          const res = await apiPost<{ userMessage: ChatMessage; assistantMessage: ChatMessage | null }>(
            "/api/assistant", { message }
          );
          if (res.userMessage) get().addChatMessage(userId, res.userMessage);
          if (res.assistantMessage) get().addChatMessage(userId, res.assistantMessage);
        } catch (e: any) {
          get().pushToast("error", e.message);
        }
      },

      clearChat: async (userId) => {
        set({ chatHistory: [] });
        try { await apiDelete("/api/assistant"); } catch { /* ignore */ }
      },
    }),
    {
      name: "shramsetu-storage-v2",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
      partialize: (state) => {
        const { toasts, appliedRealtimeIds, loading, loaded, ...rest } = state;
        return rest as any;
      },
    }
  )
);

function upsertBy<T>(item: T, key: keyof T, list: T[]): T[] {
  const idx = list.findIndex((x) => x[key] === item[key]);
  if (idx === -1) return [item, ...list];
  const copy = [...list];
  copy[idx] = item;
  return copy;
}

export const SUGGESTED_PROMPTS = [
  "Find jobs near me",
  "What should I earn?",
  "Why is my trust score 87?",
  "Where is my pending payment?",
  "How can I save more?",
  "Which skill should I learn?",
];

// ---- Client-side trust computation (used only as an immediate UI hint; the
// server remains authoritative via triggers) ----
export { calculateTrustScore, calculateContractorTrust };
