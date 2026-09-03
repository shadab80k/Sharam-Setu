/**
 * Worker onboarding — 5-step wizard mirroring the web flow:
 * profession → experience → wage (with AI estimate) → city → languages + skills.
 * Saves everything via updateWorkerProfile in one patch.
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
import { Chip } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/Feedback";
import { C, T, R, S } from "@/theme/tokens";

const TOTAL_STEPS = 5;

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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={{ gap: S.xs, marginBottom: S.lg }}>
          <View style={styles.progressRow}>
            <Text style={styles.progressTitle}>Set up your worker profile</Text>
            <Text style={styles.progressStep}>Step {step + 1} of {TOTAL_STEPS}</Text>
          </View>
          <ProgressBar value={((step + 1) / TOTAL_STEPS) * 100} />
        </View>

        <View style={styles.card}>
          {/* STEP 0: Profession */}
          {step === 0 && (
            <>
              <Text style={styles.stepTitle}>What work do you do?</Text>
              <Text style={styles.stepSub}>Pick your main profession</Text>
              <View style={styles.chipWrap}>
                {PROFESSION_NAMES.map((p) => (
                  <Chip key={p} label={p} active={profession === p} onPress={() => { setProfession(p); setSkills([]); }} />
                ))}
              </View>
            </>
          )}

          {/* STEP 1: Experience */}
          {step === 1 && (
            <>
              <Text style={styles.stepTitle}>How many years have you worked?</Text>
              <Text style={styles.stepSub}>Experience builds your trust score</Text>
              <View style={styles.bigInputWrap}>
                {[0, 1, 2, 3, 5, 8, 10, 15, 20, 30].map((n) => (
                  <Chip key={n} label={n === 0 ? "New" : `${n}+ yrs`} active={Number(experienceYears) === n} onPress={() => setExperienceYears(String(n))} />
                ))}
              </View>
              {estimate && (
                <View style={styles.estimateBox}>
                  <Text style={styles.estimateLabel}>💡 Typical wage for your level in {getCity(cityId || "lucknow").name}</Text>
                  <Text style={styles.estimateValue}>{formatINR(estimate.low)} – {formatINR(estimate.high)} / day</Text>
                </View>
              )}
            </>
          )}

          {/* STEP 2: Wage */}
          {step === 2 && (
            <>
              <Text style={styles.stepTitle}>What wage do you expect?</Text>
              <Text style={styles.stepSub}>Per day, in ₹</Text>
              <View style={styles.wageRow}>
                {[200, 400, 600, 800, 1000].map((w) => (
                  <Chip key={w} label={`₹${w}`} active={Number(wage) === w} onPress={() => setWage(String(w))} />
                ))}
              </View>
              <View style={styles.customWage}>
                <Chip label="Custom" active={![200, 400, 600, 800, 1000].includes(Number(wage))} onPress={() => setWage(String(estimate ? estimate.low : 500))} />
                {wage !== "" && <Text style={styles.wageChosen}>{formatINR(Number(wage))}/day selected</Text>}
              </View>
              {estimate && (
                <View style={styles.estimateBox}>
                  <Text style={styles.estimateLabel}>AI estimate for a {profession} with {experienceYears || 0} yrs in {getCity(cityId || "lucknow").name}</Text>
                  <Text style={styles.estimateValue}>{formatINR(estimate.low)} – {formatINR(estimate.high)} / day</Text>
                </View>
              )}
            </>
          )}

          {/* STEP 3: City */}
          {step === 3 && (
            <>
              <Text style={styles.stepTitle}>Which city do you work in?</Text>
              <Text style={styles.stepSub}>We'll show jobs near you</Text>
              <View style={styles.chipWrap}>
                {CITIES.map((c) => (
                  <Chip key={c.id} label={c.name} active={cityId === c.id} onPress={() => setCityId(c.id)} />
                ))}
              </View>
            </>
          )}

          {/* STEP 4: Languages + skills + availability */}
          {step === 4 && (
            <>
              <Text style={styles.stepTitle}>Languages you speak</Text>
              <View style={styles.chipWrap}>
                {LANGUAGE_OPTIONS.map((l) => (
                  <Chip key={l} label={l} active={languages.includes(l)} onPress={() => toggleLang(l)} />
                ))}
              </View>

              <Text style={[styles.stepTitle, { marginTop: S.lg }]}>Your skills</Text>
              <Text style={styles.stepSub}>From {profession || "your profession"}</Text>
              <View style={styles.chipWrap}>
                {professionSkills(profession || "Helper").map((s) => (
                  <Chip key={s} label={s} active={skills.includes(s)} onPress={() => toggleSkill(s)} small />
                ))}
              </View>

              <Text style={[styles.stepTitle, { marginTop: S.lg }]}>Availability</Text>
              <View style={styles.chipWrap}>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <Chip key={a.value} label={a.label} active={availability === a.value} onPress={() => setAvailability(a.value)} />
                ))}
              </View>
            </>
          )}
        </View>

        {/* Nav */}
        <View style={styles.navRow}>
          {step > 0 ? (
            <Button label="Back" variant="secondary" onPress={() => setStep(step - 1)} />
          ) : (
            <Pressable onPress={() => router.back()} style={styles.skipBtn}>
              <Text style={styles.skipText}>Cancel</Text>
            </Pressable>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button label="Next" onPress={() => setStep(step + 1)} disabled={!canNext()} />
          ) : (
            <Button label="Finish Setup" onPress={finish} loading={saving} disabled={!canNext()} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  progressStep: { fontSize: T.xs, color: C.gray600, fontWeight: "600" },
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.gray100,
    padding: S.xl,
  },
  stepTitle: { fontSize: T.lg, fontWeight: "900", color: C.navy900 },
  stepSub: { fontSize: T.sm, color: C.gray500, marginTop: 2, marginBottom: S.lg },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  bigInputWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  estimateBox: {
    backgroundColor: C.orange100,
    borderRadius: R.md,
    padding: S.md,
    gap: 4,
    marginTop: S.lg,
  },
  estimateLabel: { fontSize: T.xs, color: C.orange600, fontWeight: "700" },
  estimateValue: { fontSize: T.md, fontWeight: "900", color: C.navy900 },
  wageRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  customWage: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.sm },
  wageChosen: { fontSize: T.sm, fontWeight: "800", color: C.green600 },
  navRow: { flexDirection: "row", gap: S.md, marginTop: S.xl },
  skipBtn: { justifyContent: "center", padding: S.md },
  skipText: { color: C.gray500, fontSize: T.sm, fontWeight: "700" },
});
