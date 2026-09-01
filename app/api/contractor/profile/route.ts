import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

// PATCH /api/contractor/profile — update own contractor profile
const Body = z.object({
  companyName: z.string().min(2).max(80).optional(),
  businessType: z.string().min(2).max(40).optional(),
  location: z.string().min(2).max(30).optional(),
  name: z.string().min(2).max(60).optional(),
  avatar: z.string().url().max(500).optional(),
});

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireRole("contractor");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const b = parse.data;
  const admin = getAdminClient();

  const patch: Record<string, unknown> = {};
  if (b.companyName !== undefined) patch.company_name = b.companyName;
  if (b.businessType !== undefined) patch.business_type = b.businessType;
  if (b.location !== undefined) patch.location = b.location;

  if (Object.keys(patch).length) {
    const { error } = await admin.database.from("contractor_profiles").update(patch).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }

  const userPatch: Record<string, unknown> = {};
  if (b.name !== undefined) userPatch.name = b.name;
  if (b.location !== undefined) userPatch.location = b.location;
  if (b.avatar !== undefined) userPatch.avatar = b.avatar;
  if (Object.keys(userPatch).length) {
    const { error } = await admin.database.from("users").update(userPatch).eq("id", user.id);
    if (error) return NextResponse.json({ error: "Account update failed" }, { status: 500 });
  }

  await admin.database.rpc("recalc_user_trust", { p_user_id: user.id }).then(
    () => undefined,
    (e: unknown) => console.error("trust recalc", e)
  );

  const [p, u, paidQ] = await Promise.all([
    admin.database.from("contractor_profiles")
      .select("user_id, company_name, business_type, location, trust_score, trust_label, rating, payment_reliability, completed_jobs, complaint_count")
      .eq("user_id", user.id).limit(1),
    admin.database.from("users").select("id, role, name, email, phone, avatar, location, status, created_at").eq("id", user.id).limit(1),
    // Paid-payment count so the UI can hide reliability when there's no history
    admin.database.from("payments").select("id").eq("contractor_id", user.id).eq("status", "paid").limit(1000),
  ]);
  const profile = p.data?.length ? M.mapContractorProfile(p.data[0]) : null;
  if (profile) profile.paidPayments = paidQ.data?.length ?? 0;
  return NextResponse.json({
    profile,
    user: u.data?.length ? M.mapUser(u.data[0]) : null,
  });
}
