import type { Job, WorkerProfile, ContractorProfile } from "@/types";
import { haversineKm, clamp } from "@/utils";
import { CITIES } from "@/utils/cities";

export interface JobMatch {
  job: Job;
  matchScore: number;
  reasons: string[];
  distanceKm: number;
}

export function calculateMatchScore(
  job: Job,
  worker: WorkerProfile,
  contractor?: ContractorProfile,
  workerLocation?: { latitude: number; longitude: number }
): JobMatch {
  const reasons: string[] = [];

  // Skill match (30%)
  const skillOverlap = job.requiredSkills.filter((s) => worker.skills.some((ws) => ws.toLowerCase() === s.toLowerCase()));
  const skillRatio = job.requiredSkills.length ? skillOverlap.length / job.requiredSkills.length : 0.5;
  const skillScore = skillRatio * 100;
  if (skillRatio >= 0.7) reasons.push(`${Math.round(skillRatio * 100)}% of required skills matched`);

  // Distance (20%)
  let distanceKm = 0;
  if (workerLocation) {
    distanceKm = haversineKm(workerLocation.latitude, workerLocation.longitude, job.latitude, job.longitude);
  } else {
    const city = CITIES.find((c) => c.name === job.location);
    const workerCity = CITIES.find((c) => c.id === (worker as any).locationId);
    if (city && workerCity) distanceKm = haversineKm(workerCity.latitude, workerCity.longitude, city.latitude, city.longitude);
  }
  const distanceScore = clamp(100 - (distanceKm / worker.preferredRadiusKm) * 100, 0, 100);
  if (distanceKm <= worker.preferredRadiusKm) reasons.push(`Within preferred radius (${distanceKm.toFixed(1)} km)`);

  // Wage attractiveness (15%)
  const wageRatio = job.wagePerDay / worker.expectedDailyWage;
  const wageScore = clamp((wageRatio - 0.7) * 200, 0, 100);
  if (wageRatio >= 1.0) reasons.push(`Above expected wage (₹${job.wagePerDay}/day)`);

  // Experience match (15%)
  const expScore = clamp((worker.experienceYears / 10) * 100, 30, 100);
  if (worker.experienceYears >= 3) reasons.push(`${worker.experienceYears}+ years experience`);

  // Contractor trust (10%)
  const trustScore = contractor?.trustScore ?? 75;
  const trustNorm = trustScore;

  // Availability (10%)
  const availScore = worker.availability === "available" ? 100 : worker.availability === "working" ? 50 : 20;
  if (worker.availability === "available") reasons.push("Available immediately");

  const matchScore = Math.round(
    skillScore * 0.3 +
      distanceScore * 0.2 +
      wageScore * 0.15 +
      expScore * 0.15 +
      trustNorm * 0.1 +
      availScore * 0.1
  );

  return { job, matchScore: clamp(matchScore, 0, 100), reasons, distanceKm: Math.round(distanceKm * 10) / 10 };
}
