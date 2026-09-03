/**
 * Job detail — full job info, AI match reasons, contractor card,
 * apply / withdraw / save actions.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES } from "@/utils/cities";
import { formatINR, formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { C, T, R, S } from "@/theme/tokens";

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const job = useStore((s) => s.jobs.find((j) => j.id === id));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const contractor = useStore((s) => s.contractorProfiles.find((c) => c.userId === job?.contractorId));
  const contractorUser = useStore((s) => s.users.find((u) => u.id === job?.contractorId));
  const myApp = useStore((s) => s.applications.find((a) => a.jobId === id && a.workerId === s.currentUser?.id));
  const savedJobIds = useStore((s) => s.savedJobIds);
  const applyToJob = useStore((s) => s.applyToJob);
  const withdrawApplication = useStore((s) => s.withdrawApplication);
  const toggleSaveJob = useStore((s) => s.toggleSaveJob);

  const [busy, setBusy] = useState(false);

  const city = CITIES.find((c) => c.id === user?.location) ?? CITIES[0];

  const match = useMemo(() => {
    if (!job || !profile) return null;
    return calculateMatchScore(job, profile, contractor, { latitude: city.latitude, longitude: city.longitude });
  }, [job, profile, contractor, city]);

  const saved = job ? savedJobIds.includes(job.id) : false;

  async function handleApply() {
    if (!job) return;
    setBusy(true);
    try { await applyToJob(job.id); } finally { setBusy(false); }
  }

  async function handleWithdraw() {
    if (!myApp) return;
    setBusy(true);
    try { await withdrawApplication(myApp.id); } finally { setBusy(false); }
  }

  if (!job || !profile || !user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← Back</Text></Pressable>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.gray500 }}>Job not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isClosed = job.status === "closed" || job.status === "completed";
  const isHired = myApp?.status === "selected" || myApp?.status === "completed";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.backText}>← Back</Text></Pressable>
        <Pressable onPress={() => toggleSaveJob(job.id)} hitSlop={12}>
          <Text style={styles.saveStar}>{saved ? "★" : "☆"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Match banner */}
        {match && !isClosed && (
          <View style={[styles.matchBanner, { backgroundColor: match.matchScore >= 70 ? C.green100 : match.matchScore >= 40 ? C.orange100 : C.gray100 }]}>
            <Text style={[styles.matchBig, { color: match.matchScore >= 70 ? C.green600 : match.matchScore >= 40 ? C.orange600 : C.gray600 }]}>
              {Math.round(match.matchScore)}%
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchLabel}>AI match score for you</Text>
              {match.reasons.length > 0 && (
                <Text style={styles.matchReasons} numberOfLines={3}>{match.reasons.join(" · ")}</Text>
              )}
            </View>
          </View>
        )}

        <Text style={styles.title}>{job.title}</Text>
        <View style={styles.metaRow}>
          <StatusBadge status={job.status} />
          <Text style={styles.meta}>{job.category}</Text>
          <Text style={styles.meta}>·</Text>
          <Text style={styles.meta}>{job.location}{match && match.distanceKm > 0 ? ` (${match.distanceKm} km)` : ""}</Text>
        </View>

        {/* Wage + dates grid */}
        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Daily wage</Text>
            <Text style={[styles.gridValue, { color: C.orange600 }]}>{formatINR(job.wagePerDay)}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Payment</Text>
            <Text style={styles.gridValue}>{job.paymentFrequency}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Starts</Text>
            <Text style={styles.gridValue}>{formatDate(job.startDate)}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.gridLabel}>Workers</Text>
            <Text style={styles.gridValue}>{job.workersHired}/{job.workersNeeded} hired</Text>
          </View>
        </View>

        {/* Description */}
        <Card>
          <CardHeader title="About this job" />
          <Text style={styles.body}>{job.description}</Text>
          {job.requiredSkills.length > 0 && (
            <View style={styles.skillWrap}>
              {job.requiredSkills.map((s) => (
                <View key={s} style={styles.skillChip}>
                  <Text style={styles.skillText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Safety notes */}
        {job.safetyNotes && (
          <Card>
            <CardHeader title="🦺 Safety notes" />
            {job.safetyNotes.split(".").filter(Boolean).map((note, i) => (
              <Text key={i} style={styles.body}>• {note.trim()}.</Text>
            ))}
          </Card>
        )}

        {/* Contractor */}
        {contractor && contractorUser && (
          <Card>
            <CardHeader title="Posted by" />
            <View style={styles.contractorRow}>
              <Avatar src={contractorUser.avatar} name={contractor.companyName} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contractorName}>{contractor.companyName}</Text>
                <Text style={styles.contractorSub}>
                  {contractor.businessType} · Trust {contractor.trustScore}
                  {contractor.rating > 0 ? ` · ★ ${contractor.rating.toFixed(1)}` : ""}
                </Text>
              </View>
              <Button
                label="Call"
                variant="secondary"
                size="sm"
                onPress={() => Linking.openURL(`tel:${contractorUser.phone}`)}
              />
            </View>
          </Card>
        )}

        {/* My application status */}
        {myApp && (
          <Card>
            <CardHeader title="Your application" right={<StatusBadge status={myApp.status} />} />
            <Text style={styles.body}>Applied {formatDate(myApp.appliedAt)} · Match {Math.round(myApp.matchScore)}%</Text>
          </Card>
        )}
      </ScrollView>

      {/* Bottom action bar — thumb zone */}
      <View style={styles.actionBar}>
        {isClosed ? (
          <Text style={styles.closedText}>This job is {job.status}.</Text>
        ) : isHired ? (
          <Text style={styles.hiredText}>🎉 You were hired for this job!</Text>
        ) : myApp ? (
          <Button label="Withdraw Application" variant="destructive" onPress={handleWithdraw} loading={busy} fullWidth />
        ) : (
          <Button label="Apply for this Job" onPress={handleApply} loading={busy} fullWidth />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  back: { padding: S.lg, paddingBottom: 0 },
  topBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.xs,
  },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  saveStar: { fontSize: 26, color: C.orange600 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.lg },
  matchBanner: {
    flexDirection: "row", alignItems: "center", gap: S.lg,
    borderRadius: R.lg, padding: S.lg,
  },
  matchBig: { fontSize: T.xxl, fontWeight: "900" },
  matchLabel: { fontSize: T.xs, color: C.gray600, fontWeight: "700" },
  matchReasons: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xs },
  meta: { fontSize: T.sm, color: C.gray500, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  gridCell: {
    flexBasis: "47%",
    backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md, gap: 2,
  },
  gridLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  gridValue: { fontSize: T.md, fontWeight: "800", color: C.navy900, textTransform: "capitalize" },
  body: { fontSize: T.sm, color: C.gray700, lineHeight: 22, marginBottom: S.sm },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.xs },
  skillChip: { backgroundColor: C.blue100, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4 },
  skillText: { color: C.blue600, fontSize: T.xs, fontWeight: "700" },
  contractorRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.xs },
  contractorName: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  contractorSub: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  actionBar: {
    paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.xl,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray200,
  },
  closedText: { textAlign: "center", color: C.gray600, fontWeight: "700", paddingVertical: S.md },
  hiredText: { textAlign: "center", color: C.green600, fontWeight: "800", fontSize: T.base, paddingVertical: S.md },
});
