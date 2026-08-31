import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";

// PATCH /api/jobs/:id — update/close (own jobs only)
const UpdateBody = z.object({
  title: z.string().min(4).max(80).optional(),
  category: z.string().min(2).max(40).optional(),
  description: z.string().max(2000).optional(),
  wagePerDay: z.number().int().min(1).max(100000).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  workersNeeded: z.number().int().min(1).max(100).optional(),
  requiredSkills: z.array(z.string().min(1).max(40)).max(10).optional(),
  paymentFrequency: z.enum(["daily", "weekly", "on-completion"]).optional(),
  safetyNotes: z.string().max(500).optional(),
  status: z.enum(["active", "draft", "completed", "closed"]).optional(),
});

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const { user, response } = await requireRole("contractor");
  if (!user) return response;
  const jobId = ctx.params.id;

  const parse = UpdateBody.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parse.data;

  const admin = getAdminClient();
  const { data: jobRows } = await admin.database
    .from("jobs").select("id, contractor_id, status, workers_needed, workers_hired")
    .eq("id", jobId).limit(1);
  if (!jobRows?.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (jobRows[0].contractor_id !== user.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (b.workersNeeded !== undefined && b.workersNeeded < jobRows[0].workers_hired) {
    return NextResponse.json({ error: "workersNeeded below already-hired count" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (b.title !== undefined) patch.title = b.title;
  if (b.category !== undefined) patch.category = b.category;
  if (b.description !== undefined) patch.description = b.description;
  if (b.wagePerDay !== undefined) patch.wage_per_day = b.wagePerDay;
  if (b.startDate !== undefined) patch.start_date = b.startDate;
  if (b.endDate !== undefined) patch.end_date = b.endDate;
  if (b.workersNeeded !== undefined) patch.workers_needed = b.workersNeeded;
  if (b.requiredSkills !== undefined) patch.required_skills = b.requiredSkills;
  if (b.paymentFrequency !== undefined) patch.payment_frequency = b.paymentFrequency;
  if (b.safetyNotes !== undefined) patch.safety_notes = b.safetyNotes;
  if (b.status !== undefined) patch.status = b.status;

  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data, error } = await admin.database
    .from("jobs").update(patch).eq("id", jobId)
    .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at");
  if (error || !data?.length) {
    return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
  }

  // Job completed → notify hired workers + create wage payments if none exist
  if (b.status === "completed") {
    const { data: hired } = await admin.database
      .from("applications").select("worker_id").eq("job_id", jobId).eq("status", "selected").limit(100);
    for (const h of hired ?? []) {
      await admin.database.from("notifications").insert([{
        user_id: h.worker_id, type: "job", title: "Job completed",
        message: `The job "${data[0].title}" is marked complete. Your wage record is being prepared.`,
        link: "/worker/income",
      }]);
    }
  }

  return NextResponse.json({ job: M.mapJob(data[0]) });
}
