/**
 * Contractor Applicants — pipeline tabs across all my jobs,
 * with shortlist/reject/hire + tel: call actions.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, EmptyState } from "@/components/ui/Feedback";
import { SkeletonRow } from "@/components/ui/Avatar";
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.title}>Applicants</Text>
        <Text style={styles.sub}>Across all your jobs</Text>
      </View>
      <Tabs value={tab} onChange={setTab} items={TABS} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && list.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>📋</Text>}
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
                <View style={styles.row}>
                  <Avatar src={u.avatar} name={u.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.match}>{Math.round(a.matchScore)}% match</Text>
                    <Text style={styles.meta}>
                      {w.profession} · {w.completedJobs} jobs · ★ {w.rating.toFixed(1)} · Trust {w.trustScore}
                    </Text>
                    {a.matchReasons.length > 0 && (
                      <Text style={styles.reasons} numberOfLines={2}>💡 {a.matchReasons.join(" · ")}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  <Button label="📞" variant="secondary" size="sm" onPress={() => Linking.openURL(`tel:${u.phone}`)} />
                  {canAct && (a.status === "applied" || a.status === "viewed") && (
                    <>
                      <Button label="Shortlist" size="sm" onPress={() => updateApp(a.id, "shortlisted")} />
                      <Button label="Reject" variant="ghost" size="sm" onPress={() => updateApp(a.id, "rejected")} />
                    </>
                  )}
                  {canAct && (a.status === "shortlisted" || a.status === "interview") && (
                    <Button label="Hire" variant="success" size="sm" onPress={() => confirmHire(a.id, u.name)} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.xs },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.sm, color: C.gray500, marginTop: 2 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  row: { flexDirection: "row", gap: S.md, alignItems: "center", marginBottom: S.md },
  match: { fontSize: T.sm, fontWeight: "900", color: C.orange600 },
  meta: { fontSize: T.xs, color: C.gray500, marginTop: 1 },
  reasons: { fontSize: T.xs, color: C.gray500, marginTop: 2, lineHeight: 16 },
  actions: { flexDirection: "row", gap: S.sm, flexWrap: "wrap" },
});
