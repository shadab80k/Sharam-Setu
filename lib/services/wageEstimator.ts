import { CITIES } from "@/lib/utils/cities";

export interface WageEstimate {
  low: number;
  recommended: number;
  high: number;
  confidence: number;
  factors: string[];
}

export function estimateWage(
  profession: string,
  experienceYears: number,
  cityId: string,
  skillLevel: "beginner" | "intermediate" | "advanced" | "expert" = "intermediate"
): WageEstimate {
  const city = CITIES.find((c) => c.id === cityId) || CITIES[0];
  const base = city.wageBase;

  const skillMultiplier: Record<string, number> = {
    beginner: 0.75,
    intermediate: 1.0,
    advanced: 1.18,
    expert: 1.35,
  };

  const expBoost = Math.min(0.3, experienceYears * 0.02);
  const professionBoost: Record<string, number> = {
    "Mason": 1.0,
    "Painter": 0.92,
    "Plumber": 1.12,
    "Electrician": 1.18,
    "Carpenter": 1.05,
    "Tile Fitter": 1.15,
    "Helper": 0.7,
  };

  const recommended = Math.round(
    base * (professionBoost[profession] ?? 1.0) * skillMultiplier[skillLevel] * (1 + expBoost)
  );

  return {
    low: Math.round(recommended * 0.85),
    recommended,
    high: Math.round(recommended * 1.2),
    confidence: 0.78,
    factors: [
      `${city.name} market rate`,
      `${experienceYears} years experience`,
      `${skillLevel} skill level`,
      `${profession} demand`,
    ],
  };
}
