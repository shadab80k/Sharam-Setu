import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

/**
 * /api/worker/actions — small worker write operations.
 * action: request-verification | complete-assessment | add-work-history |
 *         add-expense | delete-expense | add-savings-goal | contribute-savings |
 *         save-job | unsave-job | enroll-course
 */
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request-verification"), type: z.enum(["phone", "email", "identity", "skill", "work-history", "address"]) }),
  z.object({ action: z.literal("complete-assessment"), skillName: z.string().min(2).max(40), score: z.number().int().min(0).max(100) }),
  z.object({
    action: z.literal("add-work-history"),
    role: z.string().min(2).max(40), contractorId: z.string().uuid(),
    jobId: z.string().uuid().optional(), startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(), rating: z.number().int().min(1).max(5).optional(),
  }),
  z.object({
    action: z.literal("add-expense"),
    category: z.enum(["food", "transport", "rent", "family", "tools", "medical", "other"]),
    amount: z.number().int().min(1).max(1_000_000), note: z.string().max(200).optional(),
    date: z.string().datetime().optional(),
  }),
  z.object({ action: z.literal("delete-expense"), expenseId: z.string().uuid() }),
  z.object({
    action: z.literal("add-savings-goal"), name: z.string().min(2).max(60),
    targetAmount: z.number().int().min(1).max(10_000_000), targetDate: z.string().datetime(),
    currentAmount: z.number().int().min(0).max(10_000_000).optional(),
  }),
  z.object({ action: z.literal("contribute-savings"), goalId: z.string().uuid(), amount: z.number().int().min(1).max(1_000_000) }),
  z.object({ action: z.literal("save-job"), jobId: z.string().uuid() }),
  z.object({ action: z.literal("unsave-job"), jobId: z.string().uuid() }),
  z.object({ action: z.literal("enroll-course"), courseTitle: z.string().min(2).max(80) }),
]);

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parse.data;
  const admin = getAdminClient();

  switch (b.action) {
    case "request-verification": {
      // Real KYC would go through a vendor; here the request lands as PENDING
      // for admin review instead of self-verifying (security fix vs demo).
      const { error } = await admin.database.from("verifications").insert([{
        user_id: user.id, type: b.type, status: "pending", score: 0,
      }]);
      if (error?.message?.includes("duplicate")) {
        return NextResponse.json({ error: "Already requested/verified" }, { status: 409 });
      }
      if (error) return NextResponse.json({ error: "Request failed" }, { status: 500 });
      await admin.database.from("notifications").insert([{
        user_id: user.id, type: "verification", title: "Verification submitted",
        message: `Your ${b.type.replace("-", " ")} verification is pending admin review.`,
        link: "/worker/trust",
      }]);
      return NextResponse.json({ ok: true, status: "pending" });
    }

    case "complete-assessment": {
      const level = b.score >= 85 ? "Expert" : b.score >= 70 ? "Advanced" : b.score >= 50 ? "Intermediate" : "Beginner";
      const { data, error } = await admin.database.from("assessments").insert([{
        worker_id: user.id, skill_name: b.skillName, score: b.score, level,
      }]).select("id, worker_id, skill_name, score, level, completed_at");
      if (error) return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
      await admin.database.from("notifications").insert([{
        user_id: user.id, type: "trust", title: "Assessment complete",
        message: `Trust recalculated after ${b.skillName} assessment (${b.score}%).`,
        link: "/worker/trust",
      }]);
      return NextResponse.json({ assessment: M.mapAssessment(data![0]) }, { status: 201 });
    }

    case "add-work-history": {
      const { data, error } = await admin.database.from("work_history").insert([{
        worker_id: user.id, contractor_id: b.contractorId, job_id: b.jobId ?? null,
        role: b.role, start_date: b.startDate, end_date: b.endDate ?? null,
        verified: false, rating: b.rating ?? null, // verification is admin's job
      }]).select("id, worker_id, contractor_id, job_id, role, start_date, end_date, verified, rating");
      if (error) return NextResponse.json({ error: "Record failed" }, { status: 500 });
      return NextResponse.json({ workHistory: M.mapWorkHistory(data![0]) }, { status: 201 });
    }

    case "add-expense": {
      const { data, error } = await admin.database.from("expenses").insert([{
        worker_id: user.id, category: b.category, amount: b.amount,
        note: b.note, date: b.date ?? new Date().toISOString(),
      }]).select("id, worker_id, category, amount, date, note");
      if (error) return NextResponse.json({ error: "Expense failed" }, { status: 500 });
      return NextResponse.json({ expense: M.mapExpense(data![0]) }, { status: 201 });
    }

    case "delete-expense": {
      const { error } = await admin.database.from("expenses")
        .delete().eq("id", b.expenseId).eq("worker_id", user.id);
      if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "add-savings-goal": {
      const { data, error } = await admin.database.from("savings_goals").insert([{
        worker_id: user.id, name: b.name, target_amount: b.targetAmount,
        current_amount: b.currentAmount ?? 0, target_date: b.targetDate,
      }]).select("id, worker_id, name, target_amount, current_amount, target_date");
      if (error) return NextResponse.json({ error: "Goal failed" }, { status: 500 });
      return NextResponse.json({ savingsGoal: M.mapSavingsGoal(data![0]) }, { status: 201 });
    }

    case "contribute-savings": {
      const { data: goal } = await admin.database
        .from("savings_goals").select("id, worker_id, current_amount")
        .eq("id", b.goalId).limit(1);
      if (!goal?.length) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      if (goal[0].worker_id !== user.id) return NextResponse.json({ error: "Not your goal" }, { status: 403 });
      const { data, error } = await admin.database
        .from("savings_goals")
        .update({ current_amount: goal[0].current_amount + b.amount })
        .eq("id", b.goalId)
        .select("id, worker_id, name, target_amount, current_amount, target_date");
      if (error) return NextResponse.json({ error: "Contribution failed" }, { status: 500 });
      return NextResponse.json({ savingsGoal: M.mapSavingsGoal(data![0]) });
    }

    case "save-job": {
      const { error } = await admin.database.from("saved_jobs").insert([{
        user_id: user.id, job_id: b.jobId,
      }]);
      if (error?.message?.includes("duplicate")) {
        return NextResponse.json({ ok: true, already: true });
      }
      if (error) return NextResponse.json({ error: "Save failed" }, { status: 500 });
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    case "unsave-job": {
      const { error } = await admin.database.from("saved_jobs")
        .delete().eq("user_id", user.id).eq("job_id", b.jobId);
      if (error) return NextResponse.json({ error: "Unsave failed" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "enroll-course": {
      const { error } = await admin.database.from("enrolled_courses").insert([{
        user_id: user.id, course_title: b.courseTitle,
      }]);
      if (error?.message?.includes("duplicate")) {
        return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
      }
      if (error) return NextResponse.json({ error: "Enrollment failed" }, { status: 500 });
      await admin.database.from("notifications").insert([{
        user_id: user.id, type: "ai", title: "Course enrolled",
        message: `You enrolled in ${b.courseTitle}. Training schedule sent via SMS.`,
        link: "/worker/career",
      }]);
      return NextResponse.json({ ok: true }, { status: 201 });
    }
  }
}
