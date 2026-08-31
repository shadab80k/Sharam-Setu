import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

// POST /api/reports — file a safety report / dispute (any signed-in user)
const Body = z.object({
  targetUserId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  category: z.enum(["unsafe-workplace", "payment-dispute", "fake-job", "fake-worker", "harassment", "fraud", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker", "contractor", "admin");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parse.data;
  if (b.targetUserId === user.id) {
    return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
  }
  const admin = getAdminClient();

  const { data, error } = await admin.database.from("safety_reports").insert([{
    reporter_id: user.id, target_user_id: b.targetUserId ?? null, job_id: b.jobId ?? null,
    category: b.category, severity: b.severity, description: b.description, status: "open",
  }]).select("id, reporter_id, target_user_id, job_id, category, severity, description, status, resolution, created_at");
  if (error) return NextResponse.json({ error: "Report failed" }, { status: 500 });

  // notify admins
  const { data: admins } = await admin.database
    .from("users").select("id").eq("role", "admin").eq("status", "active").limit(10);
  if (admins?.length) {
    await admin.database.from("notifications").insert(
      admins.map((a: any) => ({
        user_id: a.id, type: "safety", title: "New safety report",
        message: `${b.severity.toUpperCase()} severity · ${b.category} filed by ${user.name}.`,
        link: "/admin/reports",
      }))
    );
  }

  return NextResponse.json({ report: M.mapSafetyReport(data![0]) }, { status: 201 });
}
