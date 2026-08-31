import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import type { ApplicationStatus } from "@/lib/types";

// PATCH /api/applications/:id — contractor status transitions / hire; worker withdraw (DELETE)
const Body = z.object({
  status: z.enum(["viewed", "shortlisted", "interview", "selected", "rejected", "completed"]).optional(),
  hire: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const { user, response } = await requireRole("contractor");
  if (!user) return response;
  const appId = ctx.params.id;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success || (!parse.data.status && !parse.data.hire)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = getAdminClient();

  if (parse.data.hire || parse.data.status === "selected") {
    // Atomic hire via RPC (guards capacity, ownership, transitions + notifies)
    const { data, error } = await admin.database.rpc("hire_applicant", {
      p_application_id: appId,
      p_actor_id: user.id,
    });
    if (error) {
      return NextResponse.json({ error: error.message.replace("ERROR:", "").trim() }, { status: 400 });
    }
    const { data: appRows } = await admin.database
      .from("applications").select("id, job_id, worker_id, match_score, status, applied_at, match_reasons")
      .eq("id", appId).limit(1);
    return NextResponse.json({
      application: appRows?.length ? M.mapApplication(appRows[0]) : null,
      result: data,
    });
  }

  // Non-hire transitions (viewed/shortlisted/interview/rejected/completed)
  const { data: jobRows } = await admin.database
    .from("applications").select("id, job_id, worker_id, status, match_score, applied_at, match_reasons")
    .eq("id", appId).limit(1);
  if (!jobRows?.length) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const { data: jobs } = await admin.database
    .from("jobs").select("id, contractor_id, title").eq("id", jobRows[0].job_id).limit(1);
  if (!jobs?.length || jobs[0].contractor_id !== user.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }

  const { data, error } = await admin.database
    .from("applications").update({ status: parse.data.status as ApplicationStatus })
    .eq("id", appId)
    .select("id, job_id, worker_id, match_score, status, applied_at, match_reasons");
  if (error) {
    return NextResponse.json(
      { error: error.message.includes("Illegal application transition") ? "Illegal status transition" : "Update failed" },
      { status: 400 }
    );
  }

  await admin.database.from("notifications").insert([{
    user_id: jobRows[0].worker_id, type: "application",
    title: `Application ${parse.data.status}`,
    message: `Your application for ${jobs[0].title} is now ${parse.data.status}.`,
    link: "/worker/applications",
  }]);

  return NextResponse.json({ application: M.mapApplication(data![0]) });
}

// DELETE /api/applications/:id — worker withdraws
export async function DELETE(request: NextRequest, ctx: { params: { id: string } }) {
  const { user, response } = await requireRole("worker");
  if (!user) return response;
  const admin = getAdminClient();

  const { data: rows } = await admin.database
    .from("applications").select("id, worker_id, status")
    .eq("id", ctx.params.id).limit(1);
  if (!rows?.length) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (rows[0].worker_id !== user.id) return NextResponse.json({ error: "Not your application" }, { status: 403 });
  if (rows[0].status === "selected" || rows[0].status === "completed") {
    return NextResponse.json({ error: "Cannot withdraw a selected/completed application" }, { status: 400 });
  }

  const { error } = await admin.database.from("applications").delete().eq("id", ctx.params.id);
  if (error) return NextResponse.json({ error: "Withdraw failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
