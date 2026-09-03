/**
 * Worker onboarding (V3) — 5-step wizard, same save contract as web:
 * profession → experience (AI wage hint) → wage (fair-pay estimate) → city →
 * languages + skills + availability. Finish = updateWorkerProfile (real API).
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { estimateWage } from "@/services/wageEstimator";
import {
  PROFESSION_NAMES, professionSkills, LANGUAGE_OPTIONS, AVAILABILITY_OPTIONS,
} from "@/services/professions";
import { CITIES, getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chips";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Picker } from "@/components/ui/Picker";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";

const TOTAL_STEPS = 5;

const STEP_TITLES = ["Profession", "Experience", "Expected wage", "City", "Languages & skills"];

export default function WorkerOnboarding() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const updateWorkerProfile = useStore((s) => s.updateWorkerProfile);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profession, setProfession] = useState(profile?.profession && profile.profession !== "Helper" ? profile.profession : "");
  const [experienceYears, setExperienceYears] = useState(profile?.experienceYears ? String(profile.experienceYears) : "");
  const [wage, setWage] = useState(profile?.expectedDailyWage ? String(profile.expectedDailyWage) : "");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [cityId, setCityId] = useState(user?.location ?? "");
  const [languages, setLanguages] = useState<string[]>(profile?.languages?.length ? profile.languages : ["Hindi"]);
  const [availability, setAvailability] = useState<"available" | "working" | "unavailable">("available");

  const estimate = useMemo(
    () => (profession && experienceYears ? estimateWage(profession, Number(experienceYears) || 0, cityId || "lucknow") : null),
    [profession, experienceYears, cityId]
  );

  function canNext() {
    switch (step) {
      case 0: return !!profession;
      case 1: return experienceYears !== "" && Number(experienceYears) >= 0 && Number(experienceYears) <= 60;
      case 2: return Number(wage) > 0;
      case 3: return !!cityId;
      case 4: return languages.length > 0;
      default: return false;
    }
  }

  function toggleSkill(s: string) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function toggleLang(l: string) {
    setLanguages((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  }

  async function finish() {
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
      router.replace("/(worker)/home");
    } catch {
      // updateWorkerProfile already toasted the error; stay so nothing is lost
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={st.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={{ gap: S.xs + 2, marginBottom: S.lg }}>
          <View style={st.progressRow}>
            <Pressable onPress={() => (step > 0 ? setStep(step - 1) : router.back())} hitSlop={10} style={st.stepBack}>
              <Icon name="chevron-back" size={18} color={step > 0 ? C.text : "transparent"} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={st.stepTitle}>{STEP_TITLES[step]}</Text>
              <Text style={st.stepCount}>Step {step + 1} of {TOTAL_STEPS}</Text>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={10} style={st.stepBack}>
              <Text style={st.cancelText}>Cancel</Text>
            </Pressable>
          </View>
          <ProgressBar value={((step + 1) / TOTAL_STEPS) * 100} />
        </View>

        <View style={st.card}>
          {/* STEP 0: Profession */}
          {step === 0 && (
            <>
              <StepHead title="What work do you do?" sub="Pick your main profession" />
              <View style={st.chipWrap}>
                {PROFESSION_NAMES.map((p) => (
                  <Chip key={p} label={p} active={profession === p} onPress={() => { setProfession(p); setSkills([]); }} />
                ))}
              </View>
            </>
          )}

          {/* STEP 1: Experience */}
          {step === 1 && (
            <>
              <StepHead title="How many years have you worked?" sub="Experience builds your trust score" />
              <View style={st.chipWrap}>
                {[0, 1, 2, 3, 5, 8, 10, 15, 20, 30].map((n) => (
                  <Chip key={n} label={n === 0 ? "New" : `${n}+ yrs`} active={Number(experienceYears) === n} onPress={() => setExperienceYears(String(n))} />
                ))}
              </View>
              {estimate && <EstimateBox label={`Typical wage for your level in ${getCity(cityId || "lucknow").name}`} low={estimate.low} high={estimate.high} />}
            </>
          )}

          {/* STEP 2: Wage */}
          {step === 2 && (
            <>
              <StepHead title="What wage do you expect?" sub="Per day, in ₹" />
              <View style={st.chipWrap}>
                {[200, 400, 600, 800, 1000].map((w) => (
                  <Chip key={w} label={`₹${w}`} active={Number(wage) === w} onPress={() => setWage(String(w))} />
                ))}
              </View>
              <Field
                label="Or enter your own amount"
                value={wage}
                onChangeText={(t: string) => setWage(t.replace(/\D/g, "").slice(0, 6))}
                placeholder="e.g. 750"
                keyboardType="number-pad"
              />
              {estimate && <EstimateBox label={`AI estimate for a ${profession} with ${experienceYears || 0} yrs in ${getCity(cityId || "lucknow").name}`} low={estimate.low} high={estimate.high} />}
              {estimate && Number(wage) > 0 && Number(wage) < estimate.low && (
                <View style={st.warnBox}>
                  <Icon name="warning" size={15} color={C.amber} />
                  <Text style={st.warnText}>Your wage is below the market range — jobs may pay you less than you deserve.</Text>
                </View>
              )}
            </>
          )}

          {/* STEP 3: City */}
          {step === 3 && (
            <>
              <StepHead title="Which city do you work in?" sub="We'll show jobs near you" />
              <Picker
                value={CITIES.find((c) => c.id === cityId)?.name ?? ""}
                options={CITIES.map((c) => ({ value: c.name, label: c.name, sub: c.state }))}
                onChange={(name) => setCityId(CITIES.find((c) => c.name === name)?.id ?? "")}
                placeholder="Select your city"
              />
            </>
          )}

          {/* STEP 4: Languages + skills + availability */}
          {step === 4 && (
            <>
              <StepHead title="Languages you speak" />
              <View style={st.chipWrap}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <Chip key={l} label={l} active={languages.includes(l)} onPress={() => toggleLang(l)} />
                ))}
              </View>

              <StepHead title="Your skills" sub={`From ${profession || "your profession"}`} style={{ marginTop: S.lg }} />
              <View style={st.chipWrap}>
                {professionSkills(profession || "Helper").map((s) => (
                  <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} small />
                ))}
              </View>

              <StepHead title="Availability" style={{ marginTop: S.lg }} />
              <View style={st.chipWrap}>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <Chip key={a.value} label={a.label} active={availability === a.value} onPress={() => setAvailability(a.value)} />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Nav */}
        <View style={st.navRow}>
          {step > 0 && (
            <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button label="Next" onPress={() => setStep(step + 1)} disabled={!canNext()} style={{ flex: step > 0 ? 1 : 0, ...st.flex1 }} />
          ) : (
            <Button label="Finish Setup" onPress={finish} loading={saving} disabled={!canNext()} style={{ flex: 1 }} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StepHead({ title, sub, style }: { title: string; sub?: string; style?: object }) {
  return (
    <View style={style}>
      <Text style={st.title}>{title}</Text>
      {sub ? <Text style={st.sub}>{sub}</Text> : null}
    </View>
  );
}

function EstimateBox({ label, low, high }: { label: string; low: number; high: number }) {
  return (
    <View style={st.estimateBox}>
      <View style={st.estimateIcon}>
        <Icon name="sparkles" size={15} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.estimateLabel}>{label}</Text>
        <Text style={st.estimateValue}>{formatINR(low)} – {formatINR(high)} / day</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl },
  progressRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  stepBack: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: T.body + 1, fontWeight: "800", color: C.text },
  stepCount: { fontSize: T.tiny, color: C.text3, fontWeight: "600", marginTop: 1 },
  cancelText: { color: C.text3, fontSize: T.caption, fontWeight: "700" },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.xl,
  },
  title: { fontSize: T.body + 3, fontWeight: "800", color: C.text, lineHeight: 25 },
  sub: { fontSize: T.caption, color: C.text2, marginTop: 2, marginBottom: S.lg },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  estimateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.primarySoft,
    borderRadius: R.md,
    padding: S.md,
    marginTop: S.lg,
  },
  estimateIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  estimateLabel: { fontSize: T.tiny, color: C.text2, fontWeight: "600" },
  estimateValue: { fontSize: T.body + 1, fontWeight: "800", color: C.text, marginTop: 1 },
  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.amberSoft,
    borderRadius: R.md,
    padding: S.md,
    marginTop: S.md,
  },
  warnText: { flex: 1, fontSize: T.caption, color: C.amber, fontWeight: "600", lineHeight: 19 },
  navRow: { flexDirection: "row", gap: S.md, marginTop: S.xl },
  flex1: { alignSelf: "stretch" as never },
});
