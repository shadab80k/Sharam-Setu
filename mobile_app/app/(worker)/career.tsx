/**
 * Worker Career — profession roadmap stages with live wage estimates
 * and open-job counts, plus Skill India training courses.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import {
  getProfession, professionSkills, professionJobKeywords,
} from "@/services/professions";
import { estimateWage } from "@/services/wageEstimator";
import { careerSuggestion as careerSuggestionProfessions } from "@/services/professions";
import { getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { C, T, R, S } from "@/theme/tokens";

const COURSES: { title: string; provider: string; duration: string; forProfession: string | null }[] = [
  { title: "Tile Fitting Foundations", provider: "Skill India", duration: "6 weeks", forProfession: "Tile Fitter" },
  { title: "Advanced Masonry", provider: "NSDC", duration: "4 weeks", forProfession: "Mason" },
  { title: "Electrical Basics", provider: "NSDC", duration: "8 weeks", forProfession: "Electrician" },
  { title: "Site Safety Certification", provider: "BIS", duration: "2 weeks", forProfession: null },
];

interface Stage {
  name: string;
  isCurrent: boolean;
  wage: number;
  weeks: number | null;
  skills: string[];
  openJobs: number;
}

export default function WorkerCareer() {
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const enrolledCourses = useStore((s) => s.enrolledCourses);
  const enrollCourse = useStore((s) => s.enrollCourse);

  const cityId = user?.location || "lucknow";
  const city = getCity(cityId);

  const stages: Stage[] = useMemo(() => {
    if (!profile) return [];
    const start = getProfession(profile.profession);
    if (!start) return [];

    const build = (profName: string, isCurrent: boolean): Stage | null => {
      const prof = getProfession(profName);
      if (!prof) return null;
      const skills = professionSkills(profName);
      const keywords = professionJobKeywords(profName);
      const openJobs = jobs.filter((j) => {
        if (j.location !== cityId) return false;
        const title = j.title.toLowerCase();
        return skills.some((s) => j.requiredSkills.includes(s)) || keywords.some((k) => title.includes(k));
      }).length;
      return {
        name: prof.name,
        isCurrent,
        wage: estimateWage(prof.name, profile.experienceYears, cityId).recommended,
        weeks: isCurrent ? null : prof.nextStepWeeks,
        skills,
        openJobs,
      };
    };

    const list: Stage[] = [];
    const first = build(start.name, true);
    if (!first) return [];
    list.push(first);
    let cursor = start;
    while (cursor.nextStep && list.length < 4) {
      const stage = build(cursor.nextStep, false);
      if (!stage) break;
      list.push(stage);
      const next = getProfession(cursor.nextStep);
      if (!next) break;
      cursor = next;
    }
    return list;
  }, [profile, jobs, cityId]);

  const suggestion = useMemo(() => {
    if (!profile || !user) return null;
    return careerSuggestionProfessions({
      profession: profile.profession,
      experienceYears: profile.experienceYears,
      expectedDailyWage: profile.expectedDailyWage,
      cityId: user.location,
    });
  }, [profile, user]);

  const enrolledTitles = new Set(enrolledCourses.filter((c) => c.userId === user?.id).map((c) => c.courseTitle));

  if (!profile) return null;

  const currentWage = stages[0]?.wage ?? 0;
  const lastWage = stages.length ? stages[stages.length - 1].wage : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Text style={styles.title}>Career Roadmap</Text>
          <Text style={styles.sub}>
            {stages.length > 1
              ? `Grow from ${stages[0].name} to ${stages[stages.length - 1].name}.`
              : `You're at the top of the ${stages[0]?.name ?? "your"} ladder.`}
          </Text>
        </View>

        {stages.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>🚀</Text>}
            message="Set your profession in your profile to see your growth path."
          />
        ) : (
          <>
            {/* Wage growth summary */}
            {stages.length > 1 && (
              <View style={styles.growthCard}>
                <Text style={styles.growthLabel}>Potential wage growth in {city.name}</Text>
                <Text style={styles.growthValue}>
                  {formatINR(currentWage)} → {formatINR(lastWage)} / day
                </Text>
                <Text style={styles.growthSub}>
                  +{Math.round(((lastWage - currentWage) / Math.max(1, currentWage)) * 100)}% with training & experience
                </Text>
              </View>
            )}

            {/* Roadmap stages */}
            <Card>
              <CardHeader title="Your growth path" subtitle="Wages estimated for your city & experience" />
              {stages.map((s, i) => (
                <View key={s.name} style={styles.stageRow}>
                  <View style={[styles.stageNum, s.isCurrent && { backgroundColor: C.orange600 }]}>
                    <Text style={[styles.stageNumText, s.isCurrent && { color: C.white }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.stageTop}>
                      <Text style={[styles.stageName, s.isCurrent && { color: C.orange600 }]}>
                        {s.name} {s.isCurrent ? "(you)" : ""}
                      </Text>
                      <Text style={styles.stageWage}>{formatINR(s.wage)}/day</Text>
                    </View>
                    {!s.isCurrent && s.weeks && (
                      <Text style={styles.stageMeta}>⏱ ~{s.weeks} weeks of training</Text>
                    )}
                    <Text style={styles.stageMeta}>
                      {s.openJobs} open job{s.openJobs === 1 ? "" : "s"} in {city.name}
                    </Text>
                    <View style={styles.skillWrap}>
                      {s.skills.map((sk) => (
                        <View key={sk} style={styles.skillChip}><Text style={styles.skillText}>{sk}</Text></View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </Card>

            {/* AI suggestion */}
            {suggestion && (
              <Card style={{ backgroundColor: C.purple100, borderColor: C.purple100 }}>
                <Text style={styles.coachLabel}>✨ AI Career Coach</Text>
                {suggestion.underpaid ? (
                  <>
                    <Text style={styles.coachText}>You may be underpaid</Text>
                    <Text style={styles.coachSub}>
                      Market rate for your trade: {formatINR(suggestion.fairWage)}/day vs your {formatINR(suggestion.currentWage)}/day. Raise your expected wage to the fair rate.
                    </Text>
                  </>
                ) : suggestion.nextProfession && suggestion.nextWage ? (
                  <>
                    <Text style={styles.coachText}>Next step: {suggestion.nextProfession}</Text>
                    <Text style={styles.coachSub}>
                      Estimated {formatINR(suggestion.nextWage)}/day{suggestion.nextWeeks ? ` after ~${suggestion.nextWeeks} weeks of training` : ""}.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.coachText}>You're at the top of your trade's ladder</Text>
                    <Text style={styles.coachSub}>Your expected wage matches the estimated market rate. Keep building trust!</Text>
                  </>
                )}
              </Card>
            )}

            {/* Courses */}
            <Card>
              <CardHeader title="Free training courses" subtitle="Certified by Skill India & NSDC" />
              {COURSES.map((c) => {
                const enrolled = enrolledTitles.has(c.title);
                const relevant = c.forProfession === null || c.forProfession === profile.profession;
                return (
                  <View key={c.title} style={[styles.courseRow, !relevant && { opacity: 0.6 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseTitle}>{c.title}</Text>
                      <Text style={styles.courseMeta}>{c.provider} · {c.duration}{relevant ? "" : " · other trades"}</Text>
                    </View>
                    <Button
                      label={enrolled ? "Enrolled ✓" : "Enroll"}
                      variant={enrolled ? "secondary" : "primary"}
                      size="sm"
                      disabled={enrolled}
                      onPress={() => enrollCourse(user!.id, c.title)}
                    />
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.lg },
  head: { marginBottom: S.xs },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.sm, color: C.gray500, marginTop: 2 },
  growthCard: {
    backgroundColor: C.navy900,
    borderRadius: R.lg,
    padding: S.xl,
    gap: S.xs,
  },
  growthLabel: { fontSize: T.xs, color: "rgba(255,255,255,0.7)", fontWeight: "700" },
  growthValue: { fontSize: T.xl, fontWeight: "900", color: C.white },
  growthSub: { fontSize: T.xs, color: C.orange500, fontWeight: "700" },
  stageRow: { flexDirection: "row", gap: S.md, paddingVertical: S.md },
  stageNum: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.gray200, alignItems: "center", justifyContent: "center",
  },
  stageNumText: { fontSize: T.sm, fontWeight: "900", color: C.navy900 },
  stageTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: S.md },
  stageName: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  stageWage: { fontSize: T.sm, fontWeight: "900", color: C.orange600 },
  stageMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.sm },
  skillChip: { backgroundColor: C.blue100, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 3 },
  skillText: { color: C.blue600, fontSize: T.xs, fontWeight: "700" },
  coachLabel: { fontSize: T.sm, fontWeight: "800", color: C.purple600, marginBottom: S.xs },
  coachText: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  coachSub: { fontSize: T.sm, color: C.gray700, marginTop: S.xs, lineHeight: 19 },
  courseRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md },
  courseTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  courseMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
});
