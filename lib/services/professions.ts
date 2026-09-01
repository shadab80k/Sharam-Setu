import { CITIES, getCity } from "@/lib/utils/cities";

/**
 * Shared profession catalogue — single source of truth for onboarding,
 * profile editing, career roadmap, skill assessments and the dashboard
 * suggestion card. Server (API fallbacks) and client both import this.
 */

export interface Profession {
  name: string;
  /** Primary trade skills used by onboarding, roadmap and assessments */
  skills: string[];
  /** Nearby higher-wage profession to grow into (null when none) */
  nextStep: string | null;
  /** Approximate learning time for the next step (informational copy only) */
  nextStepWeeks: number | null;
}

const PROFESSIONS: Profession[] = [
  { name: "Mason", skills: ["Masonry", "Brickwork", "Plastering"], nextStep: "Tile Fitter", nextStepWeeks: 6 },
  { name: "Painter", skills: ["Painting", "Wall Prep", "Polish"], nextStep: "Tile Fitter", nextStepWeeks: 6 },
  { name: "Plumber", skills: ["Plumbing", "Pipe Fitting", "Drainage"], nextStep: "Electrician", nextStepWeeks: 10 },
  { name: "Electrician", skills: ["Wiring", "Lighting", "Repair"], nextStep: null, nextStepWeeks: null },
  { name: "Carpenter", skills: ["Carpentry", "Furniture", "Doors"], nextStep: "Tile Fitter", nextStepWeeks: 6 },
  { name: "Tile Fitter", skills: ["Tiling", "Grouting", "Tile Cutting"], nextStep: "Site Supervisor", nextStepWeeks: 16 },
  { name: "Helper", skills: ["Material Handling", "Site Cleaning"], nextStep: "Mason", nextStepWeeks: 8 },
  { name: "Site Supervisor", skills: ["Site Management", "Quality Control", "Safety"], nextStep: null, nextStepWeeks: null },
];

export const PROFESSION_NAMES = PROFESSIONS.map((p) => p.name);

export function getProfession(name: string): Profession | null {
  const lower = name.trim().toLowerCase();
  return PROFESSIONS.find((p) => p.name.toLowerCase() === lower) ?? null;
}

export function professionSkills(name: string): string[] {
  return getProfession(name)?.skills ?? [];
}

/**
 * Wage-based growth suggestion for a worker — deterministic, no invented
 * percentages. Uses the existing estimateWage logic for real numbers.
 */
export interface CareerSuggestion {
  /** True when the worker's current expected wage is at/below the estimated fair wage */
  underpaid: boolean;
  /** Estimated fair wage from the existing estimator */
  fairWage: number;
  /** Worker's own expectation */
  currentWage: number;
  /** Suggested next profession (null for top-of-ladder) */
  nextProfession: string | null;
  /** Estimated wage for the next profession */
  nextWage: number | null;
  /** Learning-time copy from the catalogue (informational, not a promise) */
  nextWeeks: number | null;
  /** What data the suggestion was derived from — shown to the user for honesty */
  basis: "wage-gap" | "career-ladder" | "profile-incomplete" | "complete";
}

export function careerSuggestion(args: {
  profession: string;
  experienceYears: number;
  expectedDailyWage: number;
  cityId: string;
}): CareerSuggestion {
  const { profession, experienceYears, expectedDailyWage, cityId } = args;
  const city = getCity(cityId);

  // Deterministic estimate for the CURRENT profession via the existing estimator
  const currentEst = estimateWageLocal(profession, experienceYears, city);
  const prof = getProfession(profession);

  if (!prof || expectedDailyWage <= 0) {
    return {
      underpaid: false,
      fairWage: currentEst,
      currentWage: expectedDailyWage,
      nextProfession: prof?.nextStep ?? "Mason",
      nextWage: prof ? estimateWageLocal(prof.nextStep ?? "Mason", experienceYears, city) : null,
      nextWeeks: prof?.nextStepWeeks ?? null,
      basis: "profile-incomplete",
    };
  }

  const nextName = prof.nextStep;
  const nextWage = nextName ? estimateWageLocal(nextName, experienceYears, city) : null;

  if (expectedDailyWage < currentEst) {
    // Worker is asking below the estimated market rate for their own trade
    return {
      underpaid: true,
      fairWage: currentEst,
      currentWage: expectedDailyWage,
      nextProfession: null,
      nextWage: null,
      nextWeeks: null,
      basis: "wage-gap",
    };
  }

  return {
    underpaid: false,
    fairWage: currentEst,
    currentWage: expectedDailyWage,
    nextProfession: nextName,
    nextWage,
    nextWeeks: prof.nextStepWeeks,
    basis: nextName ? "career-ladder" : "complete",
  };
}

/** Local mirror of wageEstimator's formula (kept in sync with estimateWage) */
function estimateWageLocal(profession: string, experienceYears: number, city: (typeof CITIES)[number]): number {
  const skillMultiplier = { beginner: 0.75, intermediate: 1.0, advanced: 1.18, expert: 1.35 } as const;
  const expBoost = Math.min(0.3, experienceYears * 0.02);
  const professionBoost: Record<string, number> = {
    Mason: 1.0, Painter: 0.92, Plumber: 1.12, Electrician: 1.18,
    Carpenter: 1.05, "Tile Fitter": 1.15, Helper: 0.7, "Site Supervisor": 1.3,
  };
  return Math.round(
    city.wageBase * (professionBoost[profession] ?? 1.0) * skillMultiplier.intermediate * (1 + expBoost)
  );
}

/** All languages offered in the app (kept to what onboarding/profile use) */
export const LANGUAGE_OPTIONS = ["Hindi", "English", "Bhojpuri", "Punjabi", "Marwari", "Bengali", "Marathi"];

/** Availability options as used by the DB/API */
export const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available for work" },
  { value: "working", label: "Currently working" },
  { value: "unavailable", label: "Not available" },
] as const;

/**
 * Title keywords used to count how many open jobs on the platform are
 * relevant to a profession. Combined with the profession's own skills,
 * this lets pages report REAL job counts instead of invented demand labels.
 */
export function professionJobKeywords(name: string): string[] {
  switch (name.trim().toLowerCase()) {
    case "mason": return ["mason", "brick", "plaster"];
    case "painter": return ["paint"];
    case "plumber": return ["plumb", "pipe", "bathroom"];
    case "electrician": return ["electric", "wiring", "wire"];
    case "carpenter": return ["carpent", "door", "window", "furniture"];
    case "tile fitter": return ["tile", "floor"];
    case "helper": return ["helper", "labour", "labor"];
    case "site supervisor": return ["supervisor", "site management"];
    default: return [name.trim().toLowerCase()];
  }
}
