/**
 * Contractor Job Detail (V3) — job facts + applicant ListRows with
 * Shortlist / Reject / Hire actions (same status flow as web).
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
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
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
      <SafeAreaView style={st.safe} edges={["top"]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.text2 }}>Job not found.</Text>
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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </Pressable>

        <Text style={st.title}>{job.title}</Text>
        <View style={st.metaRow}>
          <StatusBadge status={job.status} />
          <Text style={st.meta}>{job.category} · {job.location}</Text>
        </View>

        <View style={st.grid}>
          <Cell icon="cash-outline" label="Daily wage" value={formatINR(job.wagePerDay)} tone="primary" />
          <Cell icon="calendar-outline" label="Payment" value={job.paymentFrequency} tone="blue" />
          <Cell icon="flag-outline" label="Duration" value={`${formatDate(job.startDate)} →`} tone="purple" />
          <Cell icon="people-outline" label="Staffed" value={`${job.workersHired}/${job.workersNeeded}`} tone="amber" />
        </View>

        <Card>
          <CardHeader title="Description" />
          <Text style={st.body}>{job.description || "No description provided."}</Text>
          {job.requiredSkills.length > 0 && (
            <View style={st.skillWrap}>
              {job.requiredSkills.map((s) => (
                <View key={s} style={st.skillChip}><Text style={st.skillText}>{s}</Text></View>
              ))}
            </View>
          )}
        </Card>

        <Card style={{ marginBottom: S.xl, paddingHorizontal: S.md }}>
          <CardHeader title={`Applicants (${apps.length})`} subtitle={apps.length ? "Sorted by AI match score" : undefined} style={{ paddingHorizontal: 0 }} />
          {sorted.length === 0 ? (
            <EmptyState icon="documents-outline" tone="blue" message="No applications yet.\nTry inviting matched workers from Home." />
          ) : (
            sorted.map((a) => {
              const w = workers.find((x) => x.userId === a.workerId);
              const u = users.find((x) => x.id === a.workerId);
              if (!w || !u) return null;
              const open = job.status === "active" && a.status !== "rejected";
              return (
                <View key={a.id} style={st.appCard}>
                  <View style={st.appTop}>
                    <Avatar src={u.avatar} name={u.name} size={46} />
                    <View style={{ flex: 1 }}>
                      <View style={st.appNameRow}>
                        <Text style={st.appName}>{u.name}</Text>
                        {isIdVerified(u.id) ? (
                          <View style={st.verifiedBadge}><Icon name="checkmark" size={10} color={C.onPrimary} /></View>
                        ) : null}
                      </View>
                      <Text style={st.appMeta}>
                        {w.profession} · {w.completedJobs} jobs · ★ {w.rating.toFixed(1)} · Trust {w.trustScore}
                      </Text>
                    </View>
                    <Badge label={`${Math.round(a.matchScore)}%`} tone={a.matchScore >= 70 ? "green" : "orange"} />
                  </View>
                  {a.matchReasons.length > 0 && (
                    <View style={st.reasonRow}>
                      <Icon name="sparkles" size={13} color={C.purple} />
                      <Text style={st.reasonText} numberOfLines={2}>{a.matchReasons.join(" · ")}</Text>
                    </View>
                  )}
                  <View style={st.appFoot}>
                    <StatusBadge status={a.status} />
                    {open && (
                      <View style={st.appActions}>
                        <Button label="Call" variant="secondary" size="sm" icon="call-outline" onPress={() => Linking.openURL(`tel:${u.phone}`)} />
                        {a.status === "applied" || a.status === "viewed" ? (
                          <>
                            <Button label="Shortlist" size="sm" onPress={() => updateApp(a.id, "shortlisted")} />
                            <Button label="Reject" variant="danger" size="sm" onPress={() => updateApp(a.id, "rejected")} />
                          </>
                        ) : a.status === "shortlisted" || a.status === "interview" ? (
                          <Button label="Hire" size="sm" onPress={() => confirmHire(a.id, u.name)} />
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Cell({ icon, label, value, tone }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string; tone: "primary" | "blue" | "purple" | "amber" }) {
  const color = tone === "primary" ? C.primary : tone === "blue" ? C.blue : tone === "purple" ? C.purple : C.amber;
  return (
    <View style={st.cell}>
      <View style={st.cellIcon}><Icon name={icon} size={15} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={st.cellLabel}>{label}</Text>
        <Text style={st.cellValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  backBtn: { width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl, gap: S.md },
  title: { fontSize: T.title, fontWeight: "800", color: C.text, lineHeight: 26 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xs, flexWrap: "wrap" },
  meta: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  cell: {
    width: "48.5%",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
  },
  cellIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.muted, alignItems: "center", justifyContent: "center" },
  cellLabel: { fontSize: T.tiny, color: C.text3, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  cellValue: { fontSize: T.body, fontWeight: "700", color: C.text, textTransform: "capitalize", marginTop: 1 },
  body: { fontSize: T.caption + 1, color: C.text2, lineHeight: 21 },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.sm },
  skillChip: { backgroundColor: C.blueSoft, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 3 },
  skillText: { color: C.blue, fontSize: T.tiny, fontWeight: "700" },
  appCard: {
    paddingVertical: S.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
    gap: S.sm,
  },
  appTop: { flexDirection: "row", gap: S.md, alignItems: "center" },
  appNameRow: { flexDirection: "row", alignItems: "center", gap: S.xs },
  appName: { fontSize: T.caption + 1, fontWeight: "700", color: C.text },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  appMeta: { fontSize: T.tiny, color: C.text2, marginTop: 1 },
  reasonRow: { flexDirection: "row", gap: S.xs + 2, alignItems: "center" },
  reasonText: { fontSize: T.tiny, color: C.text2, flex: 1, lineHeight: 15 },
  appFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md, flexWrap: "wrap" },
  appActions: { flexDirection: "row", gap: S.sm, flexWrap: "wrap" },
});
