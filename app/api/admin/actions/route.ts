import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";

/**
 * /api/admin/actions — governance operations (admin only, audited).
 * action: approve-verification | reject-verification | suspend-user |
 *         reactivate-user | resolve-report | update-report-status |
 *         resolve-fraud | recalc-trust | sweep-payments
 */
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve-verification"), verificationId: z.string().uuid() }),
  z.object({ action: z.literal("reject-verification"), verificationId: z.string().uuid() }),
  z.object({ action: z.literal("suspend-user"), userId: z.string().uuid() }),
  z.object({ action: z.literal("reactivate-user"), userId: z.string().uuid() }),
  z.object({ action: z.literal("update-report-status"), reportId: z.string().uuid(), status: z.enum(["open", "investigating", "resolved", "dismissed"]), resolution: z.string().max(1000).optional() }),
  z.object({ action: z.literal("resolve-fraud"), fraudId: z.string().uuid(), resolved: z.boolean() }),
  z.object({ action: z.literal("recalc-trust"), userId: z.string().uuid() }),
  z.object({ action: z.literal("sweep-payments") }),
]);

async function audit(admin: ReturnType<typeof getAdminClient>, actorId: string, action: string, targetType: string, targetId: string | null, details?: unknown) {
  await admin.database.from("admin_audit_log").insert([{
    actor_id: actorId, action, target_type: targetType, target_id: targetId,
    details: details ?? null,
  }]);
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("admin");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parse.data;
  const admin = getAdminClient();

  switch (b.action) {
    case "approve-verification": {
      const { data, error } = await admin.database.from("verifications")
        .update({ status: "verified", score: 95, verified_at: new Date().toISOString() })
        .eq("id", b.verificationId)
        .select("id, user_id, type");
      if (error || !data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await admin.database.from("notifications").insert([{
        user_id: data[0].user_id, type: "verification", title: "Verification approved",
        message: `Your ${data[0].type.replace("-", " ")} verification was approved. Trust score updated!`,
        link: "/worker/trust",
      }]);
      await audit(admin, user.id, "approve-verification", "verification", b.verificationId);
      return NextResponse.json({ ok: true });
    }

    case "reject-verification": {
      const { data, error } = await admin.database.from("verifications")
        .update({ status: "rejected" })
        .eq("id", b.verificationId)
        .select("id, user_id, type");
      if (error || !data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await admin.database.from("notifications").insert([{
        user_id: data[0].user_id, type: "verification", title: "Verification rejected",
        message: `Your ${data[0].type.replace("-", " ")} verification was rejected. Please re-submit with valid documents.`,
        link: "/worker/trust",
      }]);
      await audit(admin, user.id, "reject-verification", "verification", b.verificationId);
      return NextResponse.json({ ok: true });
    }

    case "suspend-user": {
      if (b.userId === user.id) return NextResponse.json({ error: "Cannot suspend yourself" }, { status: 400 });
      const { data, error } = await admin.database.from("users")
        .update({ status: "suspended" })
        .eq("id", b.userId)
        .select("id, name");
      if (error || !data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await audit(admin, user.id, "suspend-user", "user", b.userId);
      return NextResponse.json({ ok: true });
    }

    case "reactivate-user": {
      const { data, error } = await admin.database.from("users")
        .update({ status: "active" })
        .eq("id", b.userId)
        .select("id, name");
      if (error || !data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await audit(admin, user.id, "reactivate-user", "user", b.userId);
      return NextResponse.json({ ok: true });
    }

    case "update-report-status": {
      const { data, error } = await admin.database.from("safety_reports")
        .update({ status: b.status, resolution: b.resolution ?? null })
        .eq("id", b.reportId)
        .select("id, reporter_id, status");
      if (error || !data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await admin.database.from("notifications").insert([{
        user_id: data[0].reporter_id, type: "safety", title: `Report ${b.status}`,
        message: b.resolution ?? `Your report has been marked ${b.status}.`,
        link: "/worker/reports",
      }]);
      await audit(admin, user.id, "update-report-status", "safety_report", b.reportId, { status: b.status });
      return NextResponse.json({ ok: true });
    }

    case "resolve-fraud": {
      const { error } = await admin.database.from("fraud_signals")
        .update({ resolved: b.resolved }).eq("id", b.fraudId);
      if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
      await audit(admin, user.id, "resolve-fraud", "fraud_signal", b.fraudId, { resolved: b.resolved });
      return NextResponse.json({ ok: true });
    }

    case "recalc-trust": {
      const { error } = await admin.database.rpc("recalc_user_trust", { p_user_id: b.userId });
      if (error) return NextResponse.json({ error: "Recalc failed" }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case "sweep-payments": {
      const { data, error } = await admin.database.rpc("sweep_due_payments");
      if (error) return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
      await audit(admin, user.id, "sweep-payments", "payments", null, { swept: data });
      return NextResponse.json({ ok: true, swept: data });
    }
  }
}
