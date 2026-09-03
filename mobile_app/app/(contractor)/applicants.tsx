/**
 * Contractor Applicants (V3) — segmented pipeline tabs across all jobs,
 * shortlist/reject/hire + call actions.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Linking, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRow } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";

const TABS = [
  { value: "new", label: "New", statuses: ["applied", "viewed"] },
  { value: "shortlisted", label: "Shortlisted", statuses: ["shortlisted", "interview"] },
  { value: "selected", label: "On Job", statuses: ["selected", "completed"] },
  { value: "rejected", label: "Rejected", statuses: ["rejected"] },
];

export default function ContractorApplicants() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const user = useStore((s) => s.currentUser);
  const myJobs = useStore((s) => s.jobs.filter((j) => j.contractorId === s.currentUser?.id));
  const jobIds = useMemo(() => new Set(myJobs.map((j) => j.id)), [myJobs]);
  const apps = useStore((s) => s.applications.filter((a) => jobIds.has(a.jobId)));
  const jobs = useStore((s) => s.jobs);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const updateApp = useStore((s) => s.updateApplicationStatus);
  const hire = useStore((s) => s.hireWorker);
  const loading = useStore((s) => s.loading);

  const [tab, setTab] = useState(params.tab && TABS.some((t) => t.value === params.tab) ? params.tab : "new");

  const active = TABS.find((t) => t.value === tab) ?? TABS[0];
  const list = apps
    .filter((a) => active.statuses.includes(a.status))
    .sort((a, b) => b.matchScore - a.matchScore);

  function confirmHire(appId: string, name: string) {
    Alert.alert("Hire this worker?", `${name} will be selected and notified.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Hire", style: "default", onPress: () => hire(appId) },
    ]);
  }

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <Text style={st.title}>Applicants</Text>
        <Text style={st.sub}>Across all your jobs</Text>
      </View>
      <View style={st.tabWrap}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ ...t, count: apps.filter((a) => t.statuses.includes(a.status)).length }))}
        />
      </View>
      <ScrollView contentContainerStyle={st.scroll}>
        {loading && list.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : list.length === 0 ? (
          <EmptyState
            icon="documents-outline"
            tone="blue"
            message={`No ${active.label.toLowerCase()} applicants right now.`}
            ctaLabel="Find Workers"
            onCta={() => router.push("/(contractor)/workers")}
          />
        ) : (
          list.map((a) => {
            const w = workers.find((x) => x.userId === a.workerId);
            const u = users.find((x) => x.id === a.workerId);
            const job = jobs.find((j) => j.id === a.jobId);
            if (!w || !u || !job) return null;
            const canAct = job.status === "active";
            return (
              <Card key={a.id}>
                <CardHeader
                  title={u.name}
                  subtitle={`${job.title} · applied ${formatDate(a.appliedAt)}`}
                  right={<StatusBadge status={a.status} />}
                />
                <View style={st.row}>
                  <Avatar src={u.avatar} name={u.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Badge label={`${Math.round(a.matchScore)}% match`} tone={a.matchScore >= 70 ? "green" : "orange"} />
                    <Text style={st.meta}>
                      {w.profession} · {w.completedJobs} jobs · ★ {w.rating.toFixed(1)} · Trust {w.trustScore}
                    </Text>
                    {a.matchReasons.length > 0 && (
                      <View style={st.reasons}>
                        <Icon name="sparkles" size={12} color={C.purple} />
                        <Text style={st.reasonsText} numberOfLines={2}>{a.matchReasons.join(" · ")}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={st.actions}>
                  <Button label="Call" variant="secondary" size="sm" icon="call-outline" onPress={() => Linking.openURL(`tel:${u.phone}`)} />
                  {canAct && (a.status === "applied" || a.status === "viewed") && (
                    <>
                      <Button label="Shortlist" size="sm" onPress={() => updateApp(a.id, "shortlisted")} />
                      <Button label="Reject" variant="danger" size="sm" onPress={() => updateApp(a.id, "rejected")} />
                    </>
                  )}
                  {canAct && (a.status === "shortlisted" || a.status === "interview") && (
                    <Button label="Hire" size="sm" onPress={() => confirmHire(a.id, u.name)} />
                  )}
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
  tabWrap: { paddingHorizontal: S.lg, marginBottom: S.sm },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption + 1, color: C.text2, marginTop: 2 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  row: { flexDirection: "row", gap: S.md, alignItems: "center", marginBottom: S.md },
  meta: { fontSize: T.tiny, color: C.text2, marginTop: S.xs },
  reasons: { flexDirection: "row", gap: S.xs, alignItems: "center", marginTop: S.xs },
  reasonsText: { fontSize: T.tiny, color: C.text3, flex: 1, lineHeight: 15 },
  actions: { flexDirection: "row", gap: S.sm, flexWrap: "wrap" },
});
