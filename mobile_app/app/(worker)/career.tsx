/**
 * Worker Career (V3) — wage-growth tile, roadmap timeline, AI coach card,
 * Skill India courses with real Enroll.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import {
  getProfession, professionSkills, professionJobKeywords,
  careerSuggestion as careerSuggestionProfessions,
} from "@/services/professions";
import { estimateWage } from "@/services/wageEstimator";
import { getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListRow } from "@/components/ui/ListRow";
import { Chip } from "@/components/ui/Chips";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S, shadow } from "@/theme/tokens";

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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        <View style={st.head}>
          <Text style={st.title}>Career Roadmap</Text>
          <Text style={st.sub}>
            {stages.length > 1
              ? `Grow from ${stages[0].name} to ${stages[stages.length - 1].name}.`
              : `You're at the top of the ${stages[0]?.name ?? "your"} ladder.`}
          </Text>
        </View>

        {stages.length === 0 ? (
          <EmptyState
            icon="rocket-outline"
            tone="primary"
            message="Set your profession in your profile to see your growth path."
          />
        ) : (
          <>
            {/* Wage growth summary */}
            {stages.length > 1 && (
              <View style={st.growthCard}>
                <Text style={st.growthLabel}>Potential wage growth in {city.name}</Text>
                <View style={st.growthRow}>
                  <Text style={st.growthFrom}>{formatINR(currentWage)}</Text>
                  <Icon name="arrow-forward" size={18} color={C.primary} />
                  <Text style={st.growthTo}>{formatINR(lastWage)}<Text style={st.growthUnit}>/day</Text></Text>
                </View>
                <Text style={st.growthSub}>
                  +{Math.round(((lastWage - currentWage) / Math.max(1, currentWage)) * 100)}% with training & experience
                </Text>
              </View>
            )}

            {/* Roadmap stages */}
            <Card>
              <CardHeader title="Your growth path" subtitle="Wages estimated for your city & experience" />
              {stages.map((s, i) => (
                <View key={s.name} style={st.stageRow}>
                  <View style={[st.stageNum, s.isCurrent && { backgroundColor: C.primary }]}>
                    <Text style={[st.stageNumText, s.isCurrent && { color: C.onPrimary }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={st.stageTop}>
                      <Text style={[st.stageName, s.isCurrent && { color: C.primary }]}>
                        {s.name} {s.isCurrent ? "(you)" : ""}
                      </Text>
                      <Text style={st.stageWage}>{formatINR(s.wage)}/day</Text>
                    </View>
                    {!s.isCurrent && s.weeks && (
                      <View style={st.stageMetaRow}>
                        <Icon name="time-outline" size={13} color={C.text3} />
                        <Text style={st.stageMeta}>~{s.weeks} weeks of training</Text>
                      </View>
                    )}
                    <View style={st.stageMetaRow}>
                      <Icon name="briefcase-outline" size={13} color={C.text3} />
                      <Text style={st.stageMeta}>
                        {s.openJobs} open job{s.openJobs === 1 ? "" : "s"} in {city.name}
                      </Text>
                    </View>
                    <View style={st.skillWrap}>
                      {s.skills.map((sk) => (
                        <Chip key={sk} label={sk} small />
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </Card>

            {/* AI suggestion */}
            {suggestion && (
              <Card>
                <View style={st.coachRow}>
                  <View style={st.coachIcon}>
                    <Icon name="sparkles" size={18} color={C.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.coachLabel}>AI Career Coach</Text>
                    {suggestion.underpaid ? (
                      <>
                        <Text style={st.coachText}>You may be underpaid</Text>
                        <Text style={st.coachSub}>
                          Market rate for your trade: {formatINR(suggestion.fairWage)}/day vs your {formatINR(suggestion.currentWage)}/day. Raise your expected wage to the fair rate.
                        </Text>
                      </>
                    ) : suggestion.nextProfession && suggestion.nextWage ? (
                      <>
                        <Text style={st.coachText}>Next step: {suggestion.nextProfession}</Text>
                        <Text style={st.coachSub}>
                          Estimated {formatINR(suggestion.nextWage)}/day{suggestion.nextWeeks ? ` after ~${suggestion.nextWeeks} weeks of training` : ""}.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={st.coachText}>You're at the top of your trade's ladder</Text>
                        <Text style={st.coachSub}>Your expected wage matches the estimated market rate. Keep building trust!</Text>
                      </>
                    )}
                  </View>
                </View>
              </Card>
            )}

            {/* Courses */}
            <Card style={{ marginBottom: S.xl }}>
              <CardHeader title="Free training courses" subtitle="Certified by Skill India & NSDC" />
              {COURSES.map((c, i) => {
                const enrolled = enrolledTitles.has(c.title);
                const relevant = c.forProfession === null || c.forProfession === profile.profession;
                return (
                  <ListRow
                    key={c.title}
                    icon="school-outline"
                    iconTone={enrolled ? "green" : "blue"}
                    title={c.title}
                    sub={`${c.provider} · ${c.duration}${relevant ? "" : " · other trades"}`}
                    style={relevant ? undefined : { opacity: 0.6 }}
                    trailing={
                      <Button
                        label={enrolled ? "Enrolled" : "Enroll"}
                        variant={enrolled ? "secondary" : "primary"}
                        size="sm"
                        disabled={enrolled}
                        onPress={() => enrollCourse(user!.id, c.title)}
                      />
                    }
                    divider={i < COURSES.length - 1}
                  />
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },
  head: { marginBottom: S.xs },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption + 1, color: C.text2, marginTop: 2 },
  growthCard: {
    backgroundColor: C.text,
    borderRadius: R.lg,
    padding: S.xl,
    gap: S.xs + 2,
    ...shadow,
  },
  growthLabel: { fontSize: T.tiny, color: "rgba(255,255,255,0.7)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  growthRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: 2 },
  growthFrom: { fontSize: T.body + 2, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  growthTo: { fontSize: T.title + 4, fontWeight: "800", color: C.white },
  growthUnit: { fontSize: T.caption, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  growthSub: { fontSize: T.caption, color: C.primarySoft, fontWeight: "700" },
  stageRow: { flexDirection: "row", gap: S.md, paddingVertical: S.md },
  stageNum: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.muted, alignItems: "center", justifyContent: "center",
  },
  stageNumText: { fontSize: T.caption, fontWeight: "800", color: C.text },
  stageTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: S.md },
  stageName: { fontSize: T.body, fontWeight: "800", color: C.text },
  stageWage: { fontSize: T.caption + 1, fontWeight: "800", color: C.primary },
  stageMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  stageMeta: { fontSize: T.tiny, color: C.text3 },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.sm },
  coachRow: { flexDirection: "row", gap: S.md, alignItems: "flex-start" },
  coachIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.purpleSoft, alignItems: "center", justifyContent: "center" },
  coachLabel: { fontSize: T.caption, fontWeight: "800", color: C.purple, textTransform: "uppercase", letterSpacing: 0.4 },
  coachText: { fontSize: T.body, fontWeight: "800", color: C.text, marginTop: 2 },
  coachSub: { fontSize: T.caption + 1, color: C.text2, marginTop: S.xs, lineHeight: 20 },
});
