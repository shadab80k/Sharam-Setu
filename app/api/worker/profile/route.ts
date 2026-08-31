import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";

// PATCH /api/worker/profile — update own worker profile fields
const Body = z.object({
  profession: z.string().min(2).max(40).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  expectedDailyWage: z.number().int().min(0).max(100000).optional(),
  availability: z.enum(["available", "working", "unavailable"]).optional(),
  bio: z.string().max(600).optional(),
  preferredRadiusKm: z.number().int().min(1).max(100).optional(),
  languages: z.array(z.string().min(2).max(20)).max(6).optional(),
  skills: z.array(z.string().min(2).max(40)).max(15).optional(),
  certifications: z.array(z.string().min(2).max(40)).max(10).optional(),
  name: z.string().min(2).max(60).optional(),
  location: z.string().min(2).max(30).optional(),
  avatar: z.string().url().max(500).optional(),
});

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireRole("worker");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parse.data;
  const admin = getAdminClient();

  const patch: Record<string, unknown> = {};
  if (b.profession !== undefined) patch.profession = b.profession;
  if (b.experienceYears !== undefined) patch.experience_years = b.experienceYears;
  if (b.expectedDailyWage !== undefined) patch.expected_daily_wage = b.expectedDailyWage;
  if (b.availability !== undefined) patch.availability = b.availability;
  if (b.bio !== undefined) patch.bio = b.bio;
  if (b.preferredRadiusKm !== undefined) patch.preferred_radius_km = b.preferredRadiusKm;
  if (b.languages !== undefined) patch.languages = b.languages;
  if (b.skills !== undefined) patch.skills = b.skills;
  if (b.certifications !== undefined) patch.certifications = b.certifications;

  if (Object.keys(patch).length) {
    const { error } = await admin.database.from("worker_profiles").update(patch).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }

  if (b.name !== undefined || b.location !== undefined || b.avatar !== undefined) {
    const userPatch: Record<string, unknown> = {};
    if (b.name !== undefined) userPatch.name = b.name;
    if (b.location !== undefined) userPatch.location = b.location;
    if (b.avatar !== undefined) userPatch.avatar = b.avatar;
    const { error } = await admin.database.from("users").update(userPatch).eq("id", user.id);
    if (error) return NextResponse.json({ error: "Account update failed" }, { status: 500 });
  }

  // Recalculate server-side (completion % + trust)
  const { error: recalcErr } = await admin.database.rpc("recalc_user_trust", { p_user_id: user.id });
  if (recalcErr) console.error("trust recalc", recalcErr.message);

  const [p, u] = await Promise.all([
    admin.database.from("worker_profiles")
      .select("user_id, profession, experience_years, expected_daily_wage, availability, bio, profile_completion, preferred_radius_km, languages, skills, trust_score, trust_label, rating, completed_jobs, certifications")
      .eq("user_id", user.id).limit(1),
    admin.database.from("users").select("id, role, name, email, phone, avatar, location, status, created_at").eq("id", user.id).limit(1),
  ]);
  return NextResponse.json({
    profile: p.data?.length ? M.mapWorkerProfile(p.data[0]) : null,
    user: u.data?.length ? M.mapUser(u.data[0]) : null,
  });
}
