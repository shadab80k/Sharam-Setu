/**
 * Worker Jobs (V3) — search field, category chips, segmented All/Saved tabs,
 * match-sorted job cards with Applied/Saved states.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { ChipRow } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import { SkeletonRow } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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
    if (category !== "all") list = list.filter((j) => j.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((j) =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    return list
      .map((j) => {
        const contractor = contractorProfiles.find((c) => c.userId === j.contractorId);
        return calculateMatchScore(j, profile, contractor, workerLocation);
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs, profile, contractorProfiles, workerLocation, tab, savedJobIds, category, query]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(jobs.filter((j) => j.status === "active").map((j) => j.category)))],
    [jobs]
  );

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <Text style={st.title}>Find Work</Text>
        <Text style={st.sub}>Sorted by your AI match score</Text>
      </View>

      <View style={st.pad}>
        <Field
          icon="search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search jobs, skills, city…"
          returnKeyType="search"
        />
      </View>

      <View style={st.pad}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All Jobs", count: jobs.filter((j) => j.status === "active").length },
            { value: "saved", label: "Saved", count: savedJobIds.length },
          ]}
        />
      </View>

      {tab === "all" && (
        <View style={st.chipPad}>
          <ChipRow
            items={categories.map((c) => ({ value: c, label: c === "all" ? "All" : c }))}
            value={category}
            onChange={setCategory}
          />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && feed.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : feed.length === 0 ? (
          <EmptyState
            icon={tab === "saved" ? "bookmark-outline" : "briefcase-outline"}
            tone={tab === "saved" ? "primary" : "muted"}
            message={tab === "saved" ? "No saved jobs yet.\nTap the bookmark on a job to save it for later." : "No open jobs right now.\nCheck back soon!"}
          />
        ) : (
          feed.map((m) => {
            const applied = appliedIds.has(m.job.id);
            const saved = savedJobIds.includes(m.job.id);
            return (
              <Card
                key={m.job.id}
                onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: m.job.id } })}
              >
                <View style={st.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.jobTitle} numberOfLines={1}>{m.job.title}</Text>
                    <Text style={st.jobMeta} numberOfLines={1}>
                      {m.job.category} · {m.job.location}
                      {m.distanceKm > 0 ? ` · ${m.distanceKm} km` : ""}
                    </Text>
                  </View>
                  <Badge
                    label={`${Math.round(m.matchScore)}%`}
                    tone={m.matchScore >= 70 ? "green" : m.matchScore >= 40 ? "orange" : "gray"}
                  />
                </View>
                <View style={st.cardBottom}>
                  <Text style={st.wage}>{formatINR(m.job.wagePerDay)}<Text style={st.wageUnit}>/day</Text></Text>
                  <Text style={st.workers}>{m.job.workersHired}/{m.job.workersNeeded} hired</Text>
                  {applied ? <Badge label="Applied" tone="green" /> :
                   saved ? <Badge label="Saved" tone="blue" /> : null}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  pad: { paddingHorizontal: S.lg, marginBottom: S.sm },
  chipPad: { paddingHorizontal: S.lg, marginBottom: S.xs },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption, color: C.text2, marginTop: 2 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: S.md, marginBottom: S.md },
  jobTitle: { fontSize: T.body + 1, fontWeight: "700", color: C.text },
  jobMeta: { fontSize: T.caption, color: C.text2, marginTop: 2 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: S.md },
  wage: { fontSize: T.body + 3, fontWeight: "800", color: C.text },
  wageUnit: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  workers: { fontSize: T.caption, color: C.text3, fontWeight: "600" },
});
