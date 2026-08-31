import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/server/insforge";

/**
 * Cron endpoint for InsForge schedules. Protected by a shared secret header
 * (Authorization: Bearer <CRON_SECRET>) — the secret lives in InsForge
 * secrets and the deployment environment, never in client code.
 *
 * GET /api/cron?job=escrow-sweep   → sweep_due_payments()
 * GET /api/cron?job=trust-recompute → recalc all trust scores (nightly)
 */
const Job = z.enum(["escrow-sweep", "trust-recompute"]);

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = Job.safeParse(request.nextUrl.searchParams.get("job"));
  if (!job.success) return NextResponse.json({ error: "Unknown job" }, { status: 400 });
  const admin = getAdminClient();

  if (job.data === "escrow-sweep") {
    const { data, error } = await admin.database.rpc("sweep_due_payments");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ job: "escrow-sweep", swept: data, at: new Date().toISOString() });
  }

  // trust-recompute: all active users
  const { data: users } = await admin.database
    .from("users").select("id").eq("status", "active").limit(1000);
  let recalced = 0;
  const failed: string[] = [];
  for (const u of users ?? []) {
    const { error } = await admin.database.rpc("recalc_user_trust", { p_user_id: u.id });
    if (error) failed.push(u.id); else recalced++;
  }
  return NextResponse.json({
    job: "trust-recompute", recalced, failed: failed.length,
    at: new Date().toISOString(),
  });
}
