import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import { generateResponse } from "@/lib/services/aiAssistant";
import type { WorkerProfile, Job, Application, Payment, Expense, SavingsGoal } from "@/lib/types";

const Body = z.object({ message: z.string().min(1).max(500) });

const SYSTEM_PROMPT = `You are the ShramSetu AI assistant for a blue-collar construction worker in India.
You help with: finding jobs, fair wage questions, trust score improvement, payment status, savings advice, career guidance, and safety reporting.
Rules:
- Be warm, simple and practical. Short sentences. The user may have low literacy.
- Use ₹ for money. Reply in the language of the question (Hindi/Hinglish/English).
- When relevant, reference the worker's real data provided in context.
- Keep answers under 120 words. End with one clear next step when possible.`;

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: "Message required" }, { status: 400 });
  const { message } = parse.data;
  const admin = getAdminClient();

  // ---- gather live worker context ----
  const [profileQ, jobsQ, appsQ, paysQ, expQ, goalsQ, unreadQ] = await Promise.all([
    admin.database.from("worker_profiles")
      .select("user_id, profession, experience_years, expected_daily_wage, availability, bio, profile_completion, preferred_radius_km, languages, skills, trust_score, trust_label, rating, completed_jobs, certifications")
      .eq("user_id", user.id).limit(1),
    admin.database.from("jobs")
      .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at")
      .eq("status", "active").limit(50),
    admin.database.from("applications")
      .select("id, job_id, worker_id, match_score, status, applied_at, match_reasons")
      .eq("worker_id", user.id).limit(100),
    admin.database.from("payments")
      .select("id, job_id, worker_id, contractor_id, amount, due_date, paid_date, status, method, notes")
      .eq("worker_id", user.id).limit(100),
    admin.database.from("expenses")
      .select("id, worker_id, category, amount, date, note").eq("worker_id", user.id).limit(100),
    admin.database.from("savings_goals")
      .select("id, worker_id, name, target_amount, current_amount, target_date").eq("worker_id", user.id).limit(20),
    admin.database.from("notifications")
      .select("id").eq("user_id", user.id).eq("read", false).limit(20),
  ]);

  const profile = profileQ.data?.length ? M.mapWorkerProfile(profileQ.data[0]) : null;
  const jobs = (jobsQ.data ?? []).map(M.mapJob);
  const applications = (appsQ.data ?? []).map(M.mapApplication);
  const payments = (paysQ.data ?? []).map(M.mapPayment);
  const expenses = (expQ.data ?? []).map(M.mapExpense);
  const savingsGoals = (goalsQ.data ?? []).map(M.mapSavingsGoal);
  const unreadCount = unreadQ.data?.length ?? 0;

  // ---- persist the user message ----
  const { data: userMsg } = await admin.database.from("assistant_messages").insert([{
    user_id: user.id, role: "user", content: message,
  }]).select("id, user_id, role, content, intent, cta_label, cta_link, created_at");
  if (!userMsg?.length) {
    return NextResponse.json({ error: "Could not save message" }, { status: 500 });
  }

  // ---- LLM answer (fallback to rule engine) ----
  let reply: { message: string; intent: string; cta?: { label: string; link: string } } | null = null;

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      const context = {
        worker: profile,
        activeJobs: jobs.slice(0, 8).map((j) => ({ title: j.title, wage: j.wagePerDay, location: j.location, skills: j.requiredSkills })),
        applications: applications.slice(0, 10).map((a) => ({ jobId: a.jobId, status: a.status, match: a.matchScore })),
        payments: payments.slice(0, 10).map((p) => ({ amount: p.amount, status: p.status, due: p.dueDate })),
        totalPending: payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0),
        monthlyExpenses: expenses.slice(0, 10).map((e) => ({ category: e.category, amount: e.amount })),
        savingsGoals,
        unreadNotifications: unreadCount,
      };

      const historyQ = await admin.database
        .from("assistant_messages").select("role, content")
        .eq("user_id", user.id).order("created_at", { ascending: true }).limit(20);
      const history = (historyQ.data ?? []).slice(-8).map((m: any) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

      const completion = await client.chat.completions.create({
        model: process.env.OPENROUTER_CHAT_MODEL ?? "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `Worker's live platform context (JSON):\n${JSON.stringify(context)}` },
          ...history,
          { role: "user", content: message },
        ],
        max_completion_tokens: 400,
      });
      const answer = completion.choices[0]?.message?.content?.trim();
      if (answer) reply = { message: answer, intent: "AI_ASSISTANT" };
    } catch (e) {
      console.error("[assistant] LLM failed, using rule engine:", (e as Error).message);
    }
  }

  // Fallback: deterministic rule engine (from lib/services/aiAssistant.ts)
  if (!reply && profile) {
    const r = generateResponse(message, {
      worker: profile as WorkerProfile,
      jobs: jobs as Job[],
      applications: applications as unknown as Application[],
      payments: payments as Payment[],
      expenses: expenses as Expense[],
      savingsGoals: savingsGoals as SavingsGoal[],
      unreadNotifications: [] as never[],
    });
    reply = {
      message: r.message,
      intent: r.intent,
      cta: r.cta,
    };
  }

  if (!reply) {
    reply = { message: "Sorry, I could not process that. Please try again.", intent: "GENERAL_HELP" };
  }

  // ---- persist the assistant reply ----
  const { data: aiMsg } = await admin.database.from("assistant_messages").insert([{
    user_id: user.id, role: "assistant", content: reply.message,
    intent: reply.intent,
    cta_label: reply.cta?.label ?? null,
    cta_link: reply.cta?.link ?? null,
  }]).select("id, user_id, role, content, intent, cta_label, cta_link, created_at");

  return NextResponse.json({
    userMessage: M.mapChatMessage(userMsg[0]),
    assistantMessage: aiMsg?.length ? M.mapChatMessage(aiMsg[0]) : null,
  });
}

// GET /api/assistant — chat history
export async function GET() {
  const { user, response } = await requireRole("worker");
  if (!user) return response;
  const admin = getAdminClient();
  const { data } = await admin.database
    .from("assistant_messages")
    .select("id, user_id, role, content, intent, cta_label, cta_link, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(200);
  return NextResponse.json({ messages: (data ?? []).map(M.mapChatMessage) });
}

// DELETE /api/assistant — clear history
export async function DELETE() {
  const { user, response } = await requireRole("worker");
  if (!user) return response;
  const admin = getAdminClient();
  const { error } = await admin.database.from("assistant_messages").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
