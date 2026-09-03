/**
 * Contractor Job Detail — job info + applicant list with
 * shortlist / reject / hire actions (same status flow as web).
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Feedback";
import { C, T, R, S } from "@/theme/tokens";

export default function ContractorJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const job = useStore((s) => s.jobs.find((j) => j.id === id));
  const apps = useStore((s) => s.applications.filter((a) => a.jobId === id));
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const verifications = useStore((s) => s.verifications);
  const updateApp = useStore((s) => s.updateApplicationStatus);
  const hire = useStore((s) => s.hireWorker);

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← Back</Text></Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.gray500 }}>Job not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIdVerified = (workerId: string) =>
    verifications.some((v) => v.userId === workerId && v.type === "identity" && v.status === "verified");

  const sorted = [...apps].sort(
    (a, b) => b.matchScore - a.matchScore || new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );

  function confirmHire(appId: string, name: string) {
    Alert.alert("Hire this worker?", `${name} will be selected and notified.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Hire", style: "default", onPress: () => hire(appId) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.backText}>← Back</Text></Pressable>

        <Text style={styles.title}>{job.title}</Text>
        <View style={styles.metaRow}>
          <StatusBadge status={job.status} />
          <Text style={styles.meta}>{job.category} · {job.location}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.cell}><Text style={styles.cellLabel}>Daily wage</Text><Text style={[styles.cellValue, { color: C.orange600 }]}>{formatINR(job.wagePerDay)}</Text></View>
          <View style={styles.cell}><Text style={styles.cellLabel}>Payment</Text><Text style={styles.cellValue}>{job.paymentFrequency}</Text></View>
          <View style={styles.cell}><Text style={styles.cellLabel}>Duration</Text><Text style={styles.cellValue}>{formatDate(job.startDate)} →</Text></View>
          <View style={styles.cell}><Text style={styles.cellLabel}>Staffed</Text><Text style={styles.cellValue}>{job.workersHired}/{job.workersNeeded}</Text></View>
        </View>

        <Card>
          <CardHeader title="Description" />
          <Text style={styles.body}>{job.description || "No description provided."}</Text>
          {job.requiredSkills.length > 0 && (
            <View style={styles.skillWrap}>
              {job.requiredSkills.map((s) => (
                <View key={s} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Applicants (${apps.length})`}
            subtitle={apps.length ? "Sorted by AI match score" : undefined}
          />
          {sorted.length === 0 ? (
            <EmptyState icon={<Text style={{ fontSize: 36 }}>📭</Text>} message="No applications yet.\nTry inviting matched workers from Home." />
          ) : (
            sorted.map((a) => {
              const w = workers.find((x) => x.userId === a.workerId);
              const u = users.find((x) => x.id === a.workerId);
              if (!w || !u) return null;
              const open = job.status === "active" && a.status !== "rejected";
              return (
                <View key={a.id} style={styles.appRow}>
                  <Avatar src={u.avatar} name={u.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName}>
                      {u.name} {isIdVerified(u.id) ? "✅" : ""}{" "}
                      <Text style={styles.appMatch}>{Math.round(a.matchScore)}% match</Text>
                    </Text>
                    <Text style={styles.appMeta}>
                      {w.profession} · {w.completedJobs} jobs · ★ {w.rating.toFixed(1)} · Trust {w.trustScore}
                    </Text>
                    {a.matchReasons.length > 0 && (
                      <Text style={styles.appReasons} numberOfLines={2}>💡 {a.matchReasons.join(" · ")}</Text>
                    )}
                    <View style={{ marginTop: 4 }}>
                      <StatusBadge status={a.status} />
                    </View>
                  </View>
                  {open && (
                    <View style={styles.appActions}>
                      <Button label="📞" variant="secondary" size="sm" onPress={() => Linking.openURL(`tel:${u.phone}`)} />
                      {a.status === "applied" || a.status === "viewed" ? (
                        <>
                          <Button label="Shortlist" size="sm" onPress={() => updateApp(a.id, "shortlisted")} />
                          <Button label="Reject" variant="ghost" size="sm" onPress={() => updateApp(a.id, "rejected")} />
                        </>
                      ) : a.status === "shortlisted" || a.status === "interview" ? (
                        <Button label="Hire" variant="success" size="sm" onPress={() => confirmHire(a.id, u.name)} />
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  back: { padding: S.lg, paddingBottom: 0 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.lg },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xs },
  meta: { fontSize: T.sm, color: C.gray500, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  cell: {
    flexBasis: "47%", backgroundColor: C.white, borderRadius: R.md, borderWidth: 1,
    borderColor: C.gray200, padding: S.md, gap: 2,
  },
  cellLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  cellValue: { fontSize: T.md, fontWeight: "800", color: C.navy900, textTransform: "capitalize" },
  body: { fontSize: T.sm, color: C.gray600, lineHeight: 21 },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.sm },
  skillChip: { backgroundColor: C.blue100, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 3 },
  skillText: { color: C.blue600, fontSize: T.xs, fontWeight: "700" },
  appRow: {
    flexDirection: "row", gap: S.md, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.gray100, alignItems: "flex-start",
  },
  appName: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  appMatch: { fontSize: T.xs, color: C.orange600, fontWeight: "800" },
  appMeta: { fontSize: T.xs, color: C.gray500, marginTop: 1 },
  appReasons: { fontSize: T.xs, color: C.gray500, marginTop: 2, lineHeight: 16 },
  appActions: { gap: S.xs, alignItems: "flex-end" },
});
