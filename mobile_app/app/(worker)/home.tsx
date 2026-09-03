/**
 * Worker Home (V3) — hero card (TrustRing + availability), 3 StatTiles,
 * recommended job ListRows, profile-progress card, AI career tip.
 */
import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { workerChecklist, workerNeedsOnboarding } from "@/services/onboarding";
import { careerSuggestion } from "@/services/professions";
import { CITIES } from "@/utils/cities";
import { formatINR } from "@/utils";
import { toAppRoute } from "@/utils/routes";
import { Card, CardHeader } from "@/components/ui/Card";
import { TrustRing } from "@/components/ui/TrustRing";
import { DotText, Badge } from "@/components/ui/Badge";
import { StatTile, StatRow } from "@/components/ui/StatTile";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S, shadow } from "@/theme/tokens";

export default function WorkerHome() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === s.currentUser?.id));
  const verifications = useStore((s) => s.verifications);
  const assessments = useStore((s) => s.assessments);
  const trustEvents = useStore((s) => s.trustEvents.filter((e) => e.userId === s.currentUser?.id));
  const contractorProfiles = useStore((s) => s.contractorProfiles);
  const applications = useStore((s) => s.applications);
  const toggleAvailability = useStore((s) => s.toggleWorkerAvailability);
  const bootstrap = useStore((s) => s.bootstrap);
  const loading = useStore((s) => s.loading);

  const city = CITIES.find((c) => c.id === user?.location) ?? CITIES[0];
  const workerLocation = { latitude: city.latitude, longitude: city.longitude };

  const todaysIncome = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const next = new Date(start); next.setDate(start.getDate() + 1);
    return payments
      .filter((p) => p.status === "paid" && p.paidDate)
      .filter((p) => { const t = new Date(p.paidDate!); return t >= start && t < next; })
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const pendingTotal = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const activeApps = applications.filter((a) => a.workerId === user?.id && !["completed", "rejected"].includes(a.status)).length;

  const monthTrend = useMemo(() => {
    const snaps = trustEvents
      .filter((e) => /score updated/i.test(e.reason))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (!snaps.length || !profile) return undefined;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const before = snaps.filter((e) => new Date(e.createdAt) < monthStart);
    if (!before.length) return undefined;
    return profile.trustScore - before[before.length - 1].points;
  }, [trustEvents, profile]);

  const checklist = user && profile
    ? workerChecklist({ user, profile, verifications, assessments })
    : [];
  const checklistDone = checklist.filter((c) => c.done).length;

  const recommended = useMemo(() => {
    if (!profile) return [];
    const appliedIds = new Set(applications.filter((a) => a.workerId === profile.userId).map((a) => a.jobId));
    return jobs
      .filter((j) => !appliedIds.has(j.id))
      .map((j) => {
        const contractor = contractorProfiles.find((c) => c.userId === j.contractorId);
        return calculateMatchScore(j, profile, contractor, workerLocation);
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }, [jobs, profile, contractorProfiles, workerLocation, applications]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const careerTip = useMemo(() => {
    if (!profile || !user) return null;
    const sug = careerSuggestion({
      profession: profile.profession,
      experienceYears: profile.experienceYears,
      expectedDailyWage: profile.expectedDailyWage,
      cityId: user.location,
    });
    if (sug.underpaid) return `Market rate for your level is ${formatINR(sug.fairWage)}/day vs your ${formatINR(sug.currentWage)}/day — consider raising your wage.`;
    if (sug.nextProfession) return `Next step: ${sug.nextProfession}${sug.nextWage ? ` (est. ${formatINR(sug.nextWage)}/day)` : ""}.`;
    return "Your wage matches the market — keep building trust.";
  }, [profile, user]);

  const needsOnboarding = !!user && !!profile && workerNeedsOnboarding(user, profile);

  // New worker → guided setup. Navigation must happen in an effect — never during render.
  useEffect(() => {
    if (needsOnboarding) router.replace("/(worker)/onboarding");
  }, [needsOnboarding]);

  if (!user || !profile) return null;
  if (needsOnboarding) return null;

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {/* Hero — trust + availability */}
        <View style={st.hero}>
          <View style={{ flex: 1 }}>
            <Text style={st.greeting}>{greeting},</Text>
            <Text style={st.name}>{user.name.split(" ")[0]}</Text>
            <Pressable onPress={() => toggleAvailability(user.id)} style={st.availBtn} hitSlop={8}>
              <DotText
                text={profile.availability === "available" ? "Available for work" : "Working / Busy"}
                tone={profile.availability === "available" ? "green" : "amber"}
              />
              <Text style={st.availHint}>tap to change</Text>
            </Pressable>
            {monthTrend !== undefined && (
              <View style={st.trendRow}>
                <Icon
                  name={monthTrend >= 0 ? "trending-up" : "trending-down"}
                  size={13}
                  color={monthTrend >= 0 ? C.green : C.red}
                />
                <Text style={[st.trendText, { color: monthTrend >= 0 ? C.green : C.red }]}>
                  {Math.abs(monthTrend)} pts this month
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={() => router.push("/(worker)/trust")}>
            <TrustRing score={profile.trustScore} size={104} />
          </Pressable>
        </View>

        {/* Money snapshot */}
        <StatRow>
          <StatTile icon="wallet-outline" label="Today" value={formatINR(todaysIncome)} sub="income earned" tone="green" onPress={() => router.push("/(worker)/money")} />
          <StatTile icon="hourglass-outline" label="Pending" value={formatINR(pendingTotal)} sub="awaiting payment" tone="amber" onPress={() => router.push("/(worker)/money")} />
          <StatTile icon="documents-outline" label="Active" value={String(activeApps)} sub="applications" tone="blue" onPress={() => router.push("/(worker)/applications")} />
        </StatRow>

        {/* Profile completion */}
        {checklistDone < checklist.length && (
          <Card style={{ marginBottom: S.md }}>
            <CardHeader
              title="Complete your profile"
              subtitle={`${checklistDone} of ${checklist.length} done — earn trust & better matches`}
              right={<Text style={st.checkPct}>{Math.round((checklistDone / checklist.length) * 100)}%</Text>}
            />
            <ProgressBar value={(checklistDone / checklist.length) * 100} />
            <View style={{ marginTop: S.sm + 2 }}>
              {checklist.filter((c) => !c.done).slice(0, 3).map((c) => (
                <ListRow
                  key={c.id}
                  icon="ellipse-outline"
                  iconTone="muted"
                  title={c.label}
                  chevron
                  divider={false}
                  style={{ paddingVertical: S.xs + 2 }}
                  onPress={() => router.push(toAppRoute(c.href) as never)}
                />
              ))}
            </View>
          </Card>
        )}

        {/* Recommended jobs */}
        <SectionHeader title="Recommended for you" action="See all" onAction={() => router.push("/(worker)/jobs")} />
        {recommended.length === 0 ? (
          <Card><Text style={st.emptyText}>No open jobs right now — check back soon.</Text></Card>
        ) : (
          <View style={st.listCard}>
            {recommended.map((m, i) => (
              <ListRow
                key={m.job.id}
                icon="briefcase-outline"
                iconTone={m.matchScore >= 70 ? "green" : m.matchScore >= 40 ? "primary" : "muted"}
                title={m.job.title}
                sub={`${formatINR(m.job.wagePerDay)}/day · ${m.job.location}`}
                trailing={
                  <Badge
                    label={`${Math.round(m.matchScore)}%`}
                    tone={m.matchScore >= 70 ? "green" : m.matchScore >= 40 ? "orange" : "gray"}
                  />
                }
                divider={i < recommended.length - 1}
                onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: m.job.id } })}
              />
            ))}
          </View>
        )}

        {/* AI career tip */}
        {careerTip && (
          <Card style={{ marginBottom: S.xl }}>
            <CardHeader title="Grow your career" subtitle="Personalized for your skill level" />
            <View style={st.tipBox}>
              <View style={st.tipIcon}>
                <Icon name="sparkles" size={18} color={C.purple} />
              </View>
              <Text style={st.tipText}>{careerTip}</Text>
            </View>
            <Pressable onPress={() => router.push("/(worker)/career")} style={st.tipLink} hitSlop={8}>
              <Text style={st.tipLinkText}>Open career roadmap</Text>
              <Icon name="chevron-forward" size={14} color={C.primary} />
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    marginBottom: S.md,
  },
  greeting: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  name: { fontSize: T.title + 4, fontWeight: "800", color: C.text, marginBottom: S.xs },
  availBtn: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs },
  availHint: { fontSize: T.tiny, color: C.text3, fontWeight: "600" },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: S.xs },
  trendText: { fontSize: T.caption, fontWeight: "700" },
  checkPct: { fontSize: T.title, fontWeight: "800", color: C.primary },
  listCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    marginBottom: S.md,
    ...shadow,
  },
  tipBox: { flexDirection: "row", gap: S.md, alignItems: "flex-start" },
  tipIcon: {
    width: 36, height: 36,
    borderRadius: 11,
    backgroundColor: C.purpleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: { flex: 1, fontSize: T.body, color: C.text2, lineHeight: 22, fontWeight: "500" },
  tipLink: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: S.md },
  tipLinkText: { color: C.primary, fontSize: T.caption, fontWeight: "700" },
  emptyText: { color: C.text2, fontSize: T.body, lineHeight: 22 },
});
