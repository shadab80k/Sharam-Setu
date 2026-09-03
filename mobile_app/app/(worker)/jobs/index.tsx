/**
 * Worker Jobs — AI match-sorted feed with category filter chips
 * and saved-jobs toggle.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState, Tabs } from "@/components/ui/Feedback";
import { SkeletonRow } from "@/components/ui/Avatar";
import { C, T, R, S } from "@/theme/tokens";
import type { Job } from "@/types";

export default function WorkerJobs() {
  const router = useRouter();
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs);
  const contractorProfiles = useStore((s) => s.contractorProfiles);
  const applications = useStore((s) => s.applications);
  const savedJobIds = useStore((s) => s.savedJobIds);
  const user = useStore((s) => s.currentUser);
  const loading = useStore((s) => s.loading);
  const bootstrap = useStore((s) => s.bootstrap);

  const [tab, setTab] = useState("all");

  const city = CITIES.find((c) => c.id === user?.location) ?? CITIES[0];
  const workerLocation = { latitude: city.latitude, longitude: city.longitude };

  const appliedIds = useMemo(
    () => new Set(applications.filter((a) => a.workerId === user?.id).map((a) => a.jobId)),
    [applications, user]
  );

  const feed = useMemo(() => {
    if (!profile) return [] as { job: Job; matchScore: number; reasons: string[]; distanceKm: number }[];
    let list = jobs.filter((j) => j.status === "active" || (tab === "saved" && savedJobIds.includes(j.id)));
    if (tab === "saved") list = list.filter((j) => savedJobIds.includes(j.id));
    return list
      .map((j) => {
        const contractor = contractorProfiles.find((c) => c.userId === j.contractorId);
        return calculateMatchScore(j, profile, contractor, workerLocation);
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs, profile, contractorProfiles, workerLocation, tab, savedJobIds]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(jobs.filter((j) => j.status === "active").map((j) => j.category)))],
    [jobs]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.title}>Find Work</Text>
        <Text style={styles.sub}>Sorted by your AI match score</Text>
      </View>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "all", label: "All Jobs" },
          { value: "saved", label: `Saved (${savedJobIds.length})` },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && feed.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : feed.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>🧰</Text>}
            message={tab === "saved" ? "No saved jobs yet.\nTap ☆ on a job to save it for later." : "No open jobs right now.\nCheck back soon!"}
          />
        ) : (
          feed.map((m) => {
            const applied = appliedIds.has(m.job.id);
            const saved = savedJobIds.includes(m.job.id);
            return (
              <Pressable
                key={m.job.id}
                style={styles.card}
                onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: m.job.id } })}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{m.job.title}</Text>
                    <Text style={styles.jobMeta}>
                      {m.job.category} · {m.job.location}
                      {m.distanceKm > 0 ? ` · ${m.distanceKm} km` : ""}
                    </Text>
                  </View>
                  <View style={[styles.matchPill, { backgroundColor: m.matchScore >= 70 ? C.green100 : m.matchScore >= 40 ? C.orange100 : C.gray100 }]}>
                    <Text style={[styles.matchText, { color: m.matchScore >= 70 ? C.green600 : m.matchScore >= 40 ? C.orange600 : C.gray600 }]}>
                      {Math.round(m.matchScore)}% match
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <Text style={styles.wage}>{formatINR(m.job.wagePerDay)}/day</Text>
                  <Text style={styles.workers}>
                    {m.job.workersHired}/{m.job.workersNeeded} hired
                  </Text>
                  {applied ? (
                    <View style={[styles.stateChip, { backgroundColor: C.green100 }]}>
                      <Text style={[styles.stateText, { color: C.green600 }]}>Applied ✓</Text>
                    </View>
                  ) : saved ? (
                    <View style={[styles.stateChip, { backgroundColor: C.blue100 }]}>
                      <Text style={[styles.stateText, { color: C.blue600 }]}>★ Saved</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.sm, color: C.gray500, marginTop: 2 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: S.lg,
    gap: S.md,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: S.md },
  jobTitle: { fontSize: T.lg, fontWeight: "800", color: C.navy900 },
  jobMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  matchPill: { borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: S.xs + 2 },
  matchText: { fontSize: T.xs, fontWeight: "800" },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: S.md },
  wage: { fontSize: T.lg, fontWeight: "900", color: C.orange600 },
  workers: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  stateChip: { borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4, marginLeft: "auto" },
  stateText: { fontSize: T.xs, fontWeight: "800" },
});
