import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

/**
 * PATCH /api/payments/:id — escrow state transitions.
 *  contractor/admin: { action: "mark-paid" }
 *  worker:           { action: "mark-received" }
 */
const Body = z.object({ action: z.enum(["mark-paid", "mark-received"]) });

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  const { user, response } = await requireRole("worker", "contractor");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const admin = getAdminClient();
  const paymentId = ctx.params.id;
  const { data: rows } = await admin.database
    .from("payments").select("id, job_id, worker_id, contractor_id, amount, due_date, paid_date, status, method, notes")
    .eq("id", paymentId).limit(1);
  if (!rows?.length) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  const pay = rows[0];

  // RBAC matrix for this payment
  const isPayingContractor = user.role === "contractor" && pay.contractor_id === user.id;
  const isReceivingWorker = user.role === "worker" && pay.worker_id === user.id;
  if (parse.data.action === "mark-paid" && !isPayingContractor) {
    return NextResponse.json({ error: "Only the paying contractor can mark paid" }, { status: 403 });
  }
  if (parse.data.action === "mark-received" && !isReceivingWorker) {
    return NextResponse.json({ error: "Only the receiving worker can confirm" }, { status: 403 });
  }

  const rpcName = parse.data.action === "mark-paid" ? "mark_payment_paid" : "mark_payment_received";
  const { error } = await admin.database.rpc(rpcName, {
    p_payment_id: paymentId,
    p_actor_id: user.id,
  });
  if (error) {
    const msg = error.message.replace("ERROR:", "").trim();
    return NextResponse.json({ error: msg || "Transition failed" }, { status: 400 });
  }

  // A new paid payment changes the contractor's on-time % — keep it derived-live
  if (parse.data.action === "mark-paid") {
    await admin.database.rpc("recalc_contractor_metrics", { p_contractor_id: pay.contractor_id }).then(
      () => undefined,
      (e: unknown) => console.error("contractor metrics recalc", e)
    );
  }

  const { data: updated } = await admin.database
    .from("payments")
    .select("id, job_id, worker_id, contractor_id, amount, due_date, paid_date, status, method, notes")
    .eq("id", paymentId).limit(1);
  return NextResponse.json({ payment: updated?.length ? M.mapPayment(updated[0]) : null });
}
