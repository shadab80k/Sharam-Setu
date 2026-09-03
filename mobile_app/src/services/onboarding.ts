import type { User, WorkerProfile, Verification, Assessment } from "@/types";

/**
 * Data-driven onboarding detection.
 *
 * A freshly signed-up worker gets a profile row with schema defaults
 * (profession "Helper", expected_daily_wage 0, no skills). The onboarding
 * wizard always ends with a chosen profession and a wage > 0, so this
 * combination is a reliable "never onboarded" marker — no localStorage flag
 * needed, which keeps refresh / re-login / cross-device behaviour correct.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  /** Where to go to complete it */
  href: string;
}

export function workerNeedsOnboarding(user: User | undefined, profile: WorkerProfile | undefined): boolean {
  if (!user || user.role !== "worker" || !profile) return false;
  return profile.profession === "Helper" && profile.expectedDailyWage === 0 && profile.skills.length === 0;
}

/**
 * Dashboard checklist mapped to the real server-side completion formula
 * (compute_profile_completion): avatar, bio, skills, experience, wage,
 * phone/email verification, work history, certifications. Assessment is
 * included because it directly feeds the trust score.
 */
export function workerChecklist(args: {
  user: User;
  profile: WorkerProfile;
  verifications: Verification[];
  assessments: Assessment[];
}): ChecklistItem[] {
  const { user, profile, verifications, assessments } = args;
  const phoneVerified = verifications.some((v) => v.userId === user.id && v.type === "phone" && v.status === "verified");
  const hasPhoto = !!user.avatar && !user.avatar.startsWith("https://api.dicebear.com");

  return [
    { id: "phone", label: "Phone number verified", done: phoneVerified, href: "/worker/trust" },
    { id: "profession", label: "Select your profession", done: profile.profession !== "Helper" || profile.expectedDailyWage > 0, href: "/worker/profile" },
    { id: "photo", label: "Add a profile photo", done: hasPhoto, href: "/worker/profile" },
    { id: "skills", label: "Add your skills", done: profile.skills.length > 0, href: "/worker/profile" },
    { id: "experience", label: "Add work experience", done: profile.experienceYears > 0, href: "/worker/profile" },
    { id: "wage", label: "Set your expected wage", done: profile.expectedDailyWage > 0, href: "/worker/profile" },
    { id: "bio", label: "Write a short bio", done: profile.bio.trim().length >= 20, href: "/worker/profile" },
    { id: "assessment", label: "Complete a skill assessment", done: assessments.some((a) => a.workerId === user.id), href: "/worker/trust" },
  ];
}
