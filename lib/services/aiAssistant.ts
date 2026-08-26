import type { Job, Application, Payment, Expense, SavingsGoal, WorkerProfile, Notification } from "@/lib/types";

export type Intent =
  | "JOB_SEARCH"
  | "WAGE_ESTIMATE"
  | "TRUST_CHECK"
  | "PAYMENT_STATUS"
  | "SAVINGS_ADVICE"
  | "CAREER_GUIDANCE"
  | "PROFILE_HELP"
  | "SAFETY_REPORT"
  | "GENERAL_HELP";

export interface AIResponse {
  message: string;
  intent: Intent;
  cta?: { label: string; link: string };
  suggestions?: string[];
}

const INTENT_KEYWORDS: Record<Intent, string[]> = {
  JOB_SEARCH: ["job", "kaam", "work", "find work", "near", "available", "nearby", "looking for work"],
  WAGE_ESTIMATE: ["wage", "salary", "charge", "earn", "rate", "kitna", "paisa", "pay", "kama"],
  TRUST_CHECK: ["trust", "score", "reputation", "reliable", "trustworthy", "verify", "verified"],
  PAYMENT_STATUS: ["payment", "paid", "paisa aaya", "due", "overdue", "kitna mila", "paise"],
  SAVINGS_ADVICE: ["save", "saving", "savings", "expense", "kharcha", "bachat", "kitna bacha"],
  CAREER_GUIDANCE: ["career", "skill", "learn", "grow", "promotion", "next", "better job", "kya seekhu"],
  PROFILE_HELP: ["profile", "complete", "update", "photo", "bio"],
  SAFETY_REPORT: ["unsafe", "fraud", "report", "harass", "scam", "fake", "khatre"],
  GENERAL_HELP: ["help", "what", "how", "kaise", "kya"],
};

export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();
  let best: Intent = "GENERAL_HELP";
  let bestScore = 0;
  (Object.keys(INTENT_KEYWORDS) as Intent[]).forEach((intent) => {
    const score = INTENT_KEYWORDS[intent].filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  });
  return best;
}

export interface AssistantContext {
  worker: WorkerProfile;
  jobs: Job[];
  applications: Application[];
  payments: Payment[];
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  unreadNotifications: Notification[];
}

export function generateResponse(message: string, ctx: AssistantContext): AIResponse {
  const intent = detectIntent(message);
  const m = message.toLowerCase();

  switch (intent) {
    case "JOB_SEARCH": {
      const top = ctx.jobs
        .filter((j) => j.status === "active")
        .slice(0, 3)
        .map((j) => `${j.title} · ₹${j.wagePerDay}/day · ${j.location}`);
      return {
        intent,
        message: `I found ${ctx.jobs.filter((j) => j.status === "active").length} matching jobs for you. Top picks: ${top.join("; ")}.`,
        cta: { label: "View recommended jobs", link: "/worker/jobs" },
        suggestions: ["Show only Mason jobs", "Highest paying jobs", "Within 5 km"],
      };
    }
    case "WAGE_ESTIMATE": {
      const base = 900 + ctx.worker.experienceYears * 30;
      return {
        intent,
        message: `Based on your profile (${ctx.worker.profession}, ${ctx.worker.experienceYears} years), a fair daily wage is around ₹${base - 100}–₹${base + 200}/day. You currently expect ₹${ctx.worker.expectedDailyWage}/day.`,
        cta: { label: "Open wage estimator", link: "/worker/assistant" },
      };
    }
    case "TRUST_CHECK": {
      return {
        intent,
        message: `Your trust score is ${ctx.worker.trustScore}/100 (${ctx.worker.trustLabel}). Top contributors: profile completeness, completed jobs, and positive reviews.`,
        cta: { label: "View trust breakdown", link: "/worker/trust" },
        suggestions: ["How to improve trust score?", "What lowers trust score?"],
      };
    }
    case "PAYMENT_STATUS": {
      const pending = ctx.payments.filter((p) => p.status === "pending" || p.status === "due" || p.status === "overdue");
      const overdue = ctx.payments.filter((p) => p.status === "overdue");
      return {
        intent,
        message: `You have ${pending.length} pending payments (${overdue.length} overdue). Total pending: ₹${pending.reduce((s, p) => s + p.amount, 0)}.`,
        cta: { label: "Open income page", link: "/worker/income" },
      };
    }
    case "SAVINGS_ADVICE": {
      const totalExp = ctx.expenses.reduce((s, e) => s + e.amount, 0);
      const totalInc = ctx.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
      const savings = totalInc - totalExp;
      const rate = totalInc ? Math.round((savings / totalInc) * 100) : 0;
      return {
        intent,
        message: `This period: income ₹${totalInc.toLocaleString("en-IN")}, expenses ₹${totalExp.toLocaleString("en-IN")}, savings ₹${Math.max(0, savings).toLocaleString("en-IN")} (${rate}% rate). ${rate < 15 ? "Consider reducing transport/food expenses to lift your savings rate." : "Great savings rate — keep it up."}`,
        cta: { label: "Open expenses & savings", link: "/worker/expenses" },
      };
    }
    case "CAREER_GUIDANCE": {
      return {
        intent,
        message: `From ${ctx.worker.profession}, your next step could be Tile Fitter (≈12-18% higher pay in your area). Learning takes ~6 weeks via local training.`,
        cta: { label: "Explore career path", link: "/worker/career" },
        suggestions: ["Show career roadmap", "Higher-paying roles near me"],
      };
    }
    case "PROFILE_HELP": {
      return {
        intent,
        message: `Your profile is ${ctx.worker.profileCompletion}% complete. Add a profile photo, certifications, and complete a skill assessment to boost visibility.`,
        cta: { label: "Edit profile", link: "/worker/profile" },
      };
    }
    case "SAFETY_REPORT": {
      return {
        intent,
        message: "If you experienced an unsafe situation, payment dispute, or fraud, file a report and admin will review within 48 hours.",
        cta: { label: "File a report", link: "/worker/reports" },
      };
    }
    default:
      return {
        intent,
        message: `Hi ${ctx.worker ? "there" : ""}! I can help with jobs, wages, trust, payments, savings, and career growth. Try one of the suggestions below.`,
        suggestions: [
          "Find jobs near me",
          "What should I earn?",
          "Why is my trust score what it is?",
          "Where is my pending payment?",
          "How can I save more?",
          "Which skill should I learn?",
        ],
      };
  }
}
