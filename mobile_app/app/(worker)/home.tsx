/**
 * Worker Home — trust ring, availability toggle, today's income,
 * onboarding checklist, AI-recommended jobs.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { workerChecklist, workerNeedsOnboarding } from "@/services/onboarding";
import { careerSuggestion } from "@/services/professions";
import { CITIES } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { TrustRing } from "@/components/ui/TrustRing";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { C, T, R, S } from "@/theme/tokens";

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

  if (!user || !profile) return null;
  if (workerNeedsOnboarding(user, profile)) {
    // New worker → guided setup instead of an empty dashboard
    router.replace("/(worker)/onboarding");
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}, {user.name.split(" ")[0]} 👋</Text>
            <Pressable onPress={() => toggleAvailability(user.id)} style={styles.availBtn}>
              <Badge
                label={profile.availability === "available" ? "● Available for work" : "● Working / Busy"}
                tone={profile.availability === "available" ? "green" : "amber"}
              />
              <Text style={styles.availHint}>tap to change</Text>
            </Pressable>
          </View>
          <TrustRing score={profile.trustScore} size={92} />
        </View>
        {monthTrend !== undefined && (
          <Text style={styles.trend}>
            {monthTrend >= 0 ? "↑" : "↓"} {Math.abs(monthTrend)} trust points this month
          </Text>
        )}

        {/* Money snapshot */}
        <View style={styles.moneyRow}>
          <View style={styles.moneyCard}>
            <Text style={styles.moneyLabel}>Today's income</Text>
            <Text style={[styles.moneyValue, { color: C.green600 }]}>{formatINR(todaysIncome)}</Text>
          </View>
          <View style={styles.moneyCard}>
            <Text style={styles.moneyLabel}>Pending payments</Text>
            <Text style={[styles.moneyValue, { color: C.orange600 }]}>{formatINR(pendingTotal)}</Text>
          </View>
          <View style={styles.moneyCard}>
            <Text style={styles.moneyLabel}>Active applications</Text>
            <Text style={styles.moneyValue}>{activeApps}</Text>
          </View>
        </View>

        {/* Onboarding checklist */}
        {checklistDone < checklist.length && (
          <Card style={{ marginBottom: S.lg }}>
            <CardHeader
              title="Complete your profile"
              subtitle={`${checklistDone} of ${checklist.length} done — earn trust & better matches`}
              right={<Text style={styles.checkPct}>{Math.round((checklistDone / checklist.length) * 100)}%</Text>}
            />
            <ProgressBar value={(checklistDone / checklist.length) * 100} />
            <View style={{ gap: S.md, marginTop: S.md }}>
              {checklist.filter((c) => !c.done).map((c) => (
                <Pressable key={c.id} onPress={() => router.push(c.href as never)}>
                  <Text style={styles.checkItem}>○ {c.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {/* Recommended jobs */}
        <Card style={{ marginBottom: S.lg }}>
          <CardHeader
            title="Recommended for you"
            subtitle={`AI-matched jobs near ${city.name}`}
            right={<Button label="See all" variant="link" size="sm" onPress={() => router.push("/(worker)/jobs")} />}
          />
          {recommended.length === 0 ? (
            <Text style={styles.emptyText}>No open jobs right now — check back soon.</Text>
          ) : (
            recommended.map((m) => (
              <Pressable key={m.job.id} style={styles.recRow} onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: m.job.id } })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recTitle} numberOfLines={1}>{m.job.title}</Text>
                  <Text style={styles.recSub}>
                    {formatINR(m.job.wagePerDay)}/day · {m.job.location}
                  </Text>
                </View>
                <View style={[styles.matchBadge, { backgroundColor: m.matchScore >= 70 ? C.green100 : m.matchScore >= 40 ? C.orange100 : C.gray100 }]}>
                  <Text style={[styles.matchText, { color: m.matchScore >= 70 ? C.green600 : m.matchScore >= 40 ? C.orange600 : C.gray600 }]}>
                    {Math.round(m.matchScore)}%
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>

        {/* Career suggestion */}
        <Card style={{ marginBottom: S.xl }}>
          <CardHeader title="Grow your career" subtitle="Personalized for your skill level" />
          {(() => {
            const sug = careerSuggestion({
              profession: profile.profession,
              experienceYears: profile.experienceYears,
              expectedDailyWage: profile.expectedDailyWage,
              cityId: user.location,
            });
            return (
              <Text style={styles.emptyText}>
                {sug.underpaid
                  ? `You may be underpaid — market rate is ${formatINR(sug.fairWage)}/day vs your ${formatINR(sug.currentWage)}/day.`
                  : sug.nextProfession
                    ? `Next step: ${sug.nextProfession}${sug.nextWage ? ` (est. ${formatINR(sug.nextWage)}/day)` : ""}.`
                    : "Your wage matches the market rate — keep building trust!"}
              </Text>
            );
          })()}
          <Button label="Open Career Roadmap" variant="secondary" onPress={() => router.push("/(worker)/career")} fullWidth />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl },
  header: { flexDirection: "row", alignItems: "center", gap: S.lg, marginBottom: S.md },
  greeting: { fontSize: T.xl, fontWeight: "900", color: C.navy900, marginBottom: S.sm },
  availBtn: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingVertical: S.xs },
  availHint: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  trend: { fontSize: T.xs, color: C.gray600, fontWeight: "700", marginBottom: S.lg, marginLeft: 2 },
  moneyRow: { flexDirection: "row", gap: S.sm, marginBottom: S.lg },
  moneyCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: S.md,
    gap: 4,
  },
  moneyLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  moneyValue: { fontSize: T.lg, fontWeight: "900", color: C.navy900 },
  checkPct: { fontSize: T.xl, fontWeight: "900", color: C.orange600 },
  checkItem: { fontSize: T.sm, color: C.navy800, fontWeight: "600", lineHeight: 24 },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  recTitle: { fontSize: T.base, fontWeight: "700", color: C.navy900 },
  recSub: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  matchBadge: { borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.xs },
  matchText: { fontSize: T.sm, fontWeight: "800" },
  emptyText: { fontSize: T.sm, color: C.gray600, lineHeight: 20, marginBottom: S.md },
});
