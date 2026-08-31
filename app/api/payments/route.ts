import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

// POST /api/payments — create a wage record (contractor) or income entry (worker)
const Body = z.object({
  jobId: z.string().uuid(),
  workerId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  amount: z.number().int().min(1).max(10_000_000),
  dueDate: z.string().datetime(),
  method: z.string().min(2).max(30).default("UPI"),
  notes: z.string().max(300).optional(),
  markPaid: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker", "contractor");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parse.data;
  const admin = getAdminClient();

  const { data: jobRows } = await admin.database
    .from("jobs").select("id, contractor_id, status, title").eq("id", b.jobId).limit(1);
  if (!jobRows?.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const job = jobRows[0];

  let workerId = b.workerId;
  let contractorId = b.contractorId ?? job.contractor_id;

  if (user.role === "worker") {
    // Worker records own income — must be hired/selected on the job
    workerId = user.id;
    const { data: apps } = await admin.database
      .from("applications").select("id").eq("job_id", b.jobId).eq("worker_id", user.id)
      .in("status", ["selected", "completed"]).limit(1);
    if (!apps?.length) {
      return NextResponse.json({ error: "You can only record income for jobs you were hired on" }, { status: 403 });
    }
  } else {
    if (job.contractor_id !== user.id) {
      return NextResponse.json({ error: "Not your job" }, { status: 403 });
    }
    if (!workerId) {
      return NextResponse.json({ error: "workerId required" }, { status: 400 });
    }
  }

  const { data, error } = await admin.database.from("payments").insert([{
    job_id: b.jobId, worker_id: workerId, contractor_id: contractorId,
    amount: b.amount, due_date: b.dueDate, method: b.method, notes: b.notes,
    status: b.markPaid ? "paid" : "pending",
    paid_date: b.markPaid ? new Date().toISOString() : null,
  }]).select("id, job_id, worker_id, contractor_id, amount, due_date, paid_date, status, method, notes");
  if (error || !data?.length) {
    return NextResponse.json({ error: "Payment record failed" }, { status: 500 });
  }

  // notify the other party
  if (user.role === "contractor") {
    await admin.database.from("notifications").insert([{
      user_id: workerId!, type: "payment", title: "Wage record created",
      message: `₹${b.amount} wage record created for ${job.title}. Due ${new Date(b.dueDate).toLocaleDateString("en-IN")}.`,
      link: "/worker/income",
    }]);
  }

  return NextResponse.json({ payment: M.mapPayment(data[0]) }, { status: 201 });
}
