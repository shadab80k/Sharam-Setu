"use client";

import { useStore } from "@/lib/store";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, MapPin, Languages, Wallet, User, CheckCircle2, Shield, ArrowRight, ArrowLeft, LocateFixed, Star } from "lucide-react";
import { CITIES, getCity } from "@/lib/utils/cities";
import { estimateWage } from "@/lib/services/wageEstimator";
import { PROFESSION_NAMES, professionSkills, LANGUAGE_OPTIONS, AVAILABILITY_OPTIONS } from "@/lib/services/professions";
import { detectCity } from "@/lib/services/location";
import { workerNeedsOnboarding } from "@/lib/services/onboarding";

/**
 * First-time worker onboarding.
 * Shown only when the worker's profile is genuinely incomplete (see
 * workerNeedsOnboarding). Every step writes through the existing
 * PATCH /api/worker/profile API — no separate storage.
 */

const TOTAL_STEPS = 5;

export default function WorkerOnboardingPage() {
  const router = useRouter();
  const currentUserId = useStore((s) => s.currentUserId);
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const updateWorkerProfile = useStore((s) => s.updateWorkerProfile);
  const pushToast = useStore((s) => s.pushToast);
  const loaded = useStore((s) => s.loaded);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  const [profession, setProfession] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [wage, setWage] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [cityId, setCityId] = useState("");
  const [languages, setLanguages] = useState<string[]>(["Hindi"]);
  const [availability, setAvailability] = useState<"available" | "working" | "unavailable">("available");

  // initialise from existing (partial) profile so a half-finished onboarding resumes, never restarts
  useEffect(() => {
    if (!user || !profile) return;
    if (!cityId) setCityId(user.location || "lucknow");
    if (profession === "") setProfession(profile.profession && profile.profession !== "Helper" ? profile.profession : "");
    if (experienceYears === "" && profile.experienceYears > 0) setExperienceYears(String(profile.experienceYears));
    if (wage === "" && profile.expectedDailyWage > 0) setWage(String(profile.expectedDailyWage));
    if (skills.length === 0 && profile.skills.length) setSkills(profile.skills);
    if (profile.languages.length) setLanguages(profile.languages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.userId, loaded]);

  // Completed profiles go straight to the dashboard — the wizard is for genuinely new workers
  const needsOnboarding = workerNeedsOnboarding(user, profile);
  useEffect(() => {
    if (!loaded || !user) return;
    if (!needsOnboarding) router.replace("/worker/dashboard");
  }, [loaded, user, needsOnboarding, router]);

  if (!loaded || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading your profile…
      </div>
    );
  }
  if (!needsOnboarding) return null;

  const suggestedWage = useMemo(
    () => (profession && experienceYears ? estimateWage(profession, Number(experienceYears) || 0, cityId || "lucknow") : null),
    [profession, experienceYears, cityId]
  );

  const city = getCity(cityId || "lucknow");

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateWorkerProfile(user.id, {
        profession,
        experienceYears: Number(experienceYears) || 0,
        expectedDailyWage: Number(wage) || 0,
        availability,
        languages,
        skills,
        name: user.name,
        location: cityId,
      });
      pushToast("success", "Profile ready! Welcome to ShramSetu.");
      router.replace("/worker/dashboard");
    } catch {
      // updateWorkerProfile already toasts the API error; stay on the page so nothing is lost
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    switch (step) {
      case 0: return !!profession;
      case 1: return experienceYears !== "" && Number(experienceYears) >= 0 && Number(experienceYears) <= 60;
      case 2: return Number(wage) > 0;
      case 3: return !!cityId;
      case 4: return languages.length > 0;
      default: return false;
    }
  };

  const toggleSkill = (s: string) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleLang = (l: string) =>
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const useGps = async () => {
    setGpsBusy(true);
    const res = await detectCity(cityId || undefined);
    setGpsBusy(false);
    setCityId(res.city.id);
    if (res.via === "gps") pushToast("success", `Detected ${res.city.name} from your location`);
    else pushToast("error", `${res.error}. Select your city below.`);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start sm:items-center justify-center px-4 py-8 bg-cream-50">
      <div className="w-full max-w-md space-y-5">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-semibold text-navy-900">Set up your worker profile</span>
            <span>Step {step + 1} of {TOTAL_STEPS}</span>
          </div>
          <ProgressBar value={step + 1} max={TOTAL_STEPS} color="#F4511E" />
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-5 sm:p-6 space-y-5">
          {/* ---------- STEP 0: Profession ---------- */}
          {step === 0 && (
            <div className="space-y-4">
              <StepHeader icon={<Briefcase className="h-5 w-5" />} title="What work do you do?" subtitle="This decides which jobs we show you." />
              <div className="grid grid-cols-2 gap-2">
                {PROFESSION_NAMES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setProfession(p);
                      const profSkills = professionSkills(p);
                      setSkills((prev) => Array.from(new Set([...prev.filter((s) => profSkills.includes(s)), ...profSkills])));
                    }}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition text-left ${
                      profession === p ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-navy-900 hover:border-orange-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {profession && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Badge key={s} variant="blue" size="sm">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------- STEP 1: Experience ---------- */}
          {step === 1 && (
            <div className="space-y-4">
              <StepHeader icon={<Star className="h-5 w-5" />} title="How many years have you worked?" subtitle="More verified experience builds trust." />
              <Input
                label="Experience (years)"
                type="number"
                min={0}
                max={60}
                inputMode="numeric"
                placeholder="e.g. 5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                helper="Count helper/karigar years too."
              />
              <div className="flex gap-2 flex-wrap">
                {[0, 1, 3, 5, 10].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setExperienceYears(String(y))}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${experienceYears === String(y) ? "border-orange-500 bg-orange-50 text-orange-700 font-semibold" : "border-gray-200 text-gray-700"}`}
                  >
                    {y === 0 ? "New to work" : `${y}+ years`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------- STEP 2: Expected wage ---------- */}
          {step === 2 && (
            <div className="space-y-4">
              <StepHeader icon={<Wallet className="h-5 w-5" />} title="What daily wage do you expect?" subtitle="Contractors see this on your profile." />
              <Input
                label="Expected daily wage (₹)"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="e.g. 800"
                value={wage}
                onChange={(e) => setWage(e.target.value)}
              />
              {suggestedWage && (
                <button
                  type="button"
                  onClick={() => setWage(String(suggestedWage.recommended))}
                  className="w-full p-3 rounded-xl bg-green-50 border border-green-200 text-left text-sm hover:bg-green-100 transition"
                >
                  <span className="font-semibold text-green-700">Fair wage in {city.name}: ₹{suggestedWage.recommended}/day</span>
                  <span className="block text-xs text-gray-600 mt-0.5">Estimated from your trade, experience and city. Tap to use it.</span>
                </button>
              )}
            </div>
          )}

          {/* ---------- STEP 3: City ---------- */}
          {step === 3 && (
            <div className="space-y-4">
              <StepHeader icon={<MapPin className="h-5 w-5" />} title="Which city do you work in?" subtitle="Jobs are matched by distance from your city." />
              <Button variant="secondary" fullWidth onClick={useGps} disabled={gpsBusy} iconLeft={<LocateFixed className="h-4 w-4" />}>
                {gpsBusy ? "Detecting…" : "Use my location"}
              </Button>
              <Select
                label="Select your city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                options={CITIES.map((c) => ({ value: c.id, label: `${c.name} (${c.state})` }))}
              />
              {cityId && <p className="text-xs text-gray-600">Selected: <span className="font-semibold text-navy-900">{city.name}</span></p>}
            </div>
          )}

          {/* ---------- STEP 4: Languages + availability ---------- */}
          {step === 4 && (
            <div className="space-y-4">
              <StepHeader icon={<Languages className="h-5 w-5" />} title="Last step — languages" subtitle="Which languages can you speak?" />
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLang(l)}
                    className={`px-3 py-1.5 rounded-lg border text-sm ${languages.includes(l) ? "border-orange-500 bg-orange-50 text-orange-700 font-semibold" : "border-gray-200 text-gray-700"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <Select
                label="Are you available for work right now?"
                value={availability}
                onChange={(e) => setAvailability(e.target.value as any)}
                options={AVAILABILITY_OPTIONS.map((a) => ({ value: a.value, label: a.label }))}
              />
            </div>
          )}

          {/* ---------- Navigation ---------- */}
          <div className="flex gap-2 pt-1">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)} iconLeft={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()} className="flex-1" iconRight={<ArrowRight className="h-4 w-4" />}>
                Next
              </Button>
            ) : (
              <Button onClick={finish} disabled={!canNext() || saving} className="flex-1" iconLeft={<CheckCircle2 className="h-4 w-4" />}>
                {saving ? "Saving…" : "Finish setup"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 flex items-center justify-center gap-1.5 text-center">
          <Shield className="h-3.5 w-3.5 text-green-600" />
          Your details are saved securely and used only to match you with the right jobs.
        </p>
      </div>
    </div>
  );
}

function StepHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}
