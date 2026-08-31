import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";

// POST /api/applications — worker applies to a job (server computes match score)
const Body = z.object({ jobId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("worker");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  const { jobId } = parse.data;
  const admin = getAdminClient();

  const [jobQ, profileQ, contractorQ] = await Promise.all([
    admin.database.from("jobs")
      .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at")
      .eq("id", jobId).limit(1),
    admin.database.from("worker_profiles")
      .select("user_id, profession, experience_years, expected_daily_wage, availability, bio, profile_completion, preferred_radius_km, languages, skills, trust_score, trust_label, rating, completed_jobs, certifications")
      .eq("user_id", user.id).limit(1),
    admin.database.from("contractor_profiles")
      .select("user_id, company_name, business_type, location, trust_score, trust_label, rating, payment_reliability, completed_jobs, response_rate, complaint_count")
      .limit(500),
  ]);
  if (!jobQ.data?.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const job = M.mapJob(jobQ.data[0]);
  if (job.status !== "active") {
    return NextResponse.json({ error: "This job is not accepting applications" }, { status: 400 });
  }
  if (job.workersHired >= job.workersNeeded) {
    return NextResponse.json({ error: "This job is fully staffed" }, { status: 400 });
  }
  if (!profileQ.data?.length) {
    return NextResponse.json({ error: "Worker profile missing" }, { status: 400 });
  }
  const profile = M.mapWorkerProfile(profileQ.data[0]);
  if (profile.availability === "unavailable") {
    return NextResponse.json({ error: "Your availability is set to unavailable" }, { status: 400 });
  }

  const dup = await admin.database
    .from("applications").select("id").eq("job_id", jobId).eq("worker_id", user.id).limit(1);
  if (dup.data?.length) {
    return NextResponse.json({ error: "You have already applied to this job" }, { status: 409 });
  }

  const contractor = (contractorQ.data ?? []).map(M.mapContractorProfile)
    .find((c) => c.userId === job.contractorId);
  const city = CITIES.find((c) => c.id === job.location);
  const m = calculateMatchScore(job, profile, contractor, city ? { latitude: city.latitude, longitude: city.longitude } : undefined);

  const { data, error } = await admin.database.from("applications").insert([{
    job_id: jobId, worker_id: user.id, match_score: m.matchScore, status: "applied",
    match_reasons: m.reasons,
  }]).select("id, job_id, worker_id, match_score, status, applied_at, match_reasons");
  if (error || !data?.length) {
    return NextResponse.json({ error: "Application failed" }, { status: 500 });
  }

  // Notify contractor
  await admin.database.from("notifications").insert([{
    user_id: job.contractorId, type: "application", title: "New application",
    message: `${user.name} applied to ${job.title} (${m.matchScore}% match).`,
    link: "/contractor/applicants",
  }]);

  return NextResponse.json({ application: M.mapApplication(data[0]), matchScore: m.matchScore, reasons: m.reasons }, { status: 201 });
}
