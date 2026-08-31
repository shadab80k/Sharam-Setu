import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

// POST /api/reviews — contractor reviews a hired worker (recalc via DB triggers)
const Body = z.object({
  workerId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(""),
  reliability: z.number().int().min(1).max(5),
  skill: z.number().int().min(1).max(5),
  safety: z.number().int().min(1).max(5),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("contractor");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parse.data;
  const admin = getAdminClient();

  // Contractor may review only workers hired by them (selected/completed application)
  const appFilter = b.jobId
    ? { job_id: b.jobId, worker_id: b.workerId }
    : { worker_id: b.workerId };
  let query = admin.database
    .from("applications")
    .select("id, job_id, worker_id, status");
  query = query.eq("worker_id", b.workerId);
  if (b.jobId) query = query.eq("job_id", b.jobId);
  const { data: apps } = await query.in("status", ["selected", "completed"]).limit(1);

  let valid = false;
  if (apps?.length) {
    const { data: job } = await admin.database
      .from("jobs").select("contractor_id").eq("id", apps[0].job_id).limit(1);
    valid = job?.length === 1 && job[0].contractor_id === user.id;
  }
  if (!valid) {
    return NextResponse.json(
      { error: "You can only review workers you hired" },
      { status: 403 }
    );
  }

  const { data, error } = await admin.database.from("reviews").insert([{
    reviewer_id: user.id, reviewee_id: b.workerId, job_id: b.jobId ?? null,
    rating: b.rating, comment: b.comment,
    reliability: b.reliability, skill: b.skill, safety: b.safety,
  }]).select("id, reviewer_id, reviewee_id, job_id, rating, comment, reliability, skill, safety, created_at");
  if (error) return NextResponse.json({ error: "Review failed" }, { status: 500 });

  // triggers recalc rating + trust automatically
  await admin.database.from("notifications").insert([{
    user_id: b.workerId, type: "trust", title: "New review received",
    message: `You received a ${b.rating}★ review. Trust score updated.`,
    link: "/worker/trust",
  }]);

  return NextResponse.json({ review: M.mapReview(data![0]) }, { status: 201 });
}
