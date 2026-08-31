import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/server/session";
import { getAdminClient } from "@/lib/server/insforge";
import * as M from "@/lib/server/mappers";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";

// POST /api/jobs — create job (contractor)
const CreateBody = z.object({
  title: z.string().min(4).max(80),
  category: z.string().min(2).max(40),
  description: z.string().max(2000).default(""),
  location: z.string().min(2).max(30), // city id
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  wagePerDay: z.number().int().min(1).max(100000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  workersNeeded: z.number().int().min(1).max(100),
  requiredSkills: z.array(z.string().min(1).max(40)).max(10).default([]),
  paymentFrequency: z.enum(["daily", "weekly", "on-completion"]),
  safetyNotes: z.string().max(500).default(""),
  status: z.enum(["active", "draft"]).default("active"),
});

export async function POST(request: NextRequest) {
  const { user, response } = await requireRole("contractor");
  if (!user) return response;

  const parse = CreateBody.safeParse(await request.json().catch(() => ({})));
  if (!parse.success) {
    return NextResponse.json({ error: parse.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const b = parse.data;
  if (new Date(b.endDate) <= new Date(b.startDate)) {
    return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
  }
  const city = CITIES.find((c) => c.id === b.location);
  if (!city) return NextResponse.json({ error: "Unknown city" }, { status: 400 });

  const admin = getAdminClient();
  const { data, error } = await admin.database.from("jobs").insert([{
    contractor_id: user.id,
    title: b.title, category: b.category, description: b.description,
    location: b.location,
    latitude: b.latitude ?? city.latitude, longitude: b.longitude ?? city.longitude,
    wage_per_day: b.wagePerDay, start_date: b.startDate, end_date: b.endDate,
    workers_needed: b.workersNeeded, status: b.status,
    required_skills: b.requiredSkills, payment_frequency: b.paymentFrequency,
    safety_notes: b.safetyNotes,
  }]).select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at");

  if (error || !data?.length) {
    return NextResponse.json({ error: error?.message ?? "Job creation failed" }, { status: 500 });
  }
  return NextResponse.json({ job: M.mapJob(data[0]) }, { status: 201 });
}

// GET /api/jobs?worker=<id> — recommended jobs with server-computed match scores
export async function GET(request: NextRequest) {
  const { user, response } = await requireRole("worker", "contractor", "admin");
  if (!user) return response;

  const admin = getAdminClient();
  const workerId = request.nextUrl.searchParams.get("worker") ?? user.id;

  const [jobsQ, profilesQ, contractorsQ] = await Promise.all([
    admin.database.from("jobs")
      .select("id, contractor_id, title, category, description, location, latitude, longitude, wage_per_day, start_date, end_date, workers_needed, workers_hired, status, required_skills, payment_frequency, safety_notes, created_at")
      .eq("status", "active").order("created_at", { ascending: false }).limit(200),
    admin.database.from("worker_profiles").select("user_id, profession, experience_years, expected_daily_wage, availability, bio, profile_completion, preferred_radius_km, languages, skills, trust_score, trust_label, rating, completed_jobs, certifications").eq("user_id", workerId).limit(1),
    admin.database.from("contractor_profiles").select("user_id, company_name, business_type, location, trust_score, trust_label, rating, payment_reliability, completed_jobs, response_rate, complaint_count").limit(500),
  ]);
  const jobs = (jobsQ.data ?? []).map(M.mapJob);
  const worker = workerQToWorker(profilesQ.data?.[0]);
  if (!worker) {
    return NextResponse.json({ matches: jobs.map((j) => ({ job: j, matchScore: 50, reasons: ["Browse all jobs"], distanceKm: 0 })) });
  }
  const contractorProfiles = (contractorsQ.data ?? []).map(M.mapContractorProfile);

  const matches = jobs.map((j) => {
    const contractor = contractorProfiles.find((c) => c.userId === j.contractorId);
    const city = CITIES.find((c) => c.id === j.location);
    const m = calculateMatchScore(j, worker, contractor, city ? { latitude: city.latitude, longitude: city.longitude } : undefined);
    return { job: j, matchScore: m.matchScore, reasons: m.reasons, distanceKm: m.distanceKm };
  });
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return NextResponse.json({ matches });
}

function workerQToWorker(r: any) {
  return r ? M.mapWorkerProfile(r) : null;
}
