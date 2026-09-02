import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";

/**
 * POST /api/applications/invite — a contractor shortlists a worker directly
 * onto one of their open jobs (the "Hire"/"Invite" action from Find Workers).
 * Creates a real application row with status "shortlisted", a server-computed
 * match score, and notifies the worker — who can then confirm or withdraw.
 * The normal hire flow (hire_applicant RPC) takes it from there.
 */

const Body = z.object({
  jobId: z.string().uuid(),
  workerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("contractor");
  if (!user) return response;

  const parse = Body.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: "Select a job and a worker" }, { status: 400 });
  }
  const { jobId, workerId } = parse.data;
  const admin = getAdminClient();

  const [jobQ, workerQ, contractorQ] = await Promise.all([
    admin.database.from("jobs")
      .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at")
      .eq("id", jobId).limit(1),
    admin.database.from("worker_profiles")
      .select("user_id, profession, experience_years, expected_daily_wage, availability, bio, profile_completion, preferred_radius_km, languages, skills, trust_score, trust_label, rating, completed_jobs, certifications")
      .eq("user_id", workerId).limit(1),
    admin.database.from("contractor_profiles")
      .select("user_id, company_name, business_type, location, trust_score, trust_label, rating, payment_reliability, completed_jobs, complaint_count")
      .eq("user_id", user.id).limit(1),
  ]);

  if (!jobQ.data?.length) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const job = M.mapJob(jobQ.data[0]);
  if (job.contractorId !== user.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (job.status !== "active") {
    return NextResponse.json({ error: "This job is not accepting workers" }, { status: 400 });
  }
  if (job.workersHired >= job.workersNeeded) {
    return NextResponse.json({ error: "This job is already fully staffed" }, { status: 400 });
  }
  if (!workerQ.data?.length) {
    return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
  }
  const workerProfile = M.mapWorkerProfile(workerQ.data[0]);
  if (workerProfile.availability === "unavailable") {
    return NextResponse.json({ error: "This worker is currently marked unavailable" }, { status: 400 });
  }

  const dup = await admin.database
    .from("applications").select("id, status").eq("job_id", jobId).eq("worker_id", workerId).limit(1);
  if (dup.data?.length) {
    const label = dup.data[0].status === "shortlisted" ? "already shortlisted" : "already has an application";
    return NextResponse.json({ error: `This worker is ${label} for that job` }, { status: 409 });
  }

  const contractor = contractorQ.data?.length ? M.mapContractorProfile(contractorQ.data[0]) : undefined;
  const city = CITIES.find((c) => c.id === job.location);
  const m = calculateMatchScore(job, workerProfile, contractor, city ? { latitude: city.latitude, longitude: city.longitude } : undefined);

  const { data, error } = await admin.database.from("applications").insert([{
    job_id: jobId, worker_id: workerId, match_score: m.matchScore, status: "shortlisted",
    match_reasons: m.reasons,
  }]).select("id, job_id, worker_id, match_score, status, applied_at, match_reasons");
  if (error || !data?.length) {
    return NextResponse.json({ error: "Could not shortlist this worker" }, { status: 500 });
  }

  // Notify the worker — this is the whole point: the invite reaches them
  await admin.database.from("notifications").insert([{
    user_id: workerId, type: "application",
    title: "You've been shortlisted!",
    message: `${contractor?.companyName ?? "A contractor"} shortlisted you for ${job.title} (₹${job.wagePerDay}/day, ${job.location}). Confirm or withdraw any time.`,
    link: "/worker/applications",
  }]);

  return NextResponse.json({ application: M.mapApplication(data[0]) }, { status: 201 });
}
