/**
 * Job detail (V3) — match reasons checklist, detail rows, contractor card,
 * bottom Apply bar. Apply / Withdraw / Save all real API actions.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES } from "@/utils/cities";
import { formatINR, formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ListRow } from "@/components/ui/ListRow";
import { Chip } from "@/components/ui/Chips";
import { C, T, R, S } from "@/theme/tokens";

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      <SafeAreaView style={st.safe} edges={["top"]}>
        <TopBar onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.text2 }}>Job not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isClosed = job.status === "closed" || job.status === "completed";
  const isHired = myApp?.status === "selected" || myApp?.status === "completed";

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <TopBar onBack={() => router.back()} saved={saved} onToggleSave={() => toggleSaveJob(job.id)} />

      <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: 120 + insets.bottom }]}>
        {/* Title block */}
        <Text style={st.title}>{job.title}</Text>
        <View style={st.metaRow}>
          <StatusBadge status={job.status} />
          <Text style={st.meta} numberOfLines={1}>
            {job.category} · {job.location}{match && match.distanceKm > 0 ? ` (${match.distanceKm} km)` : ""}
          </Text>
        </View>

        {/* Match banner */}
        {match && !isClosed && (
          <View style={[st.matchBanner, { backgroundColor: match.matchScore >= 70 ? C.greenSoft : match.matchScore >= 40 ? C.primarySoft : C.muted }]}>
            <Text style={[st.matchBig, { color: match.matchScore >= 70 ? C.green : match.matchScore >= 40 ? C.primary : C.text2 }]}>
              {Math.round(match.matchScore)}%
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={st.matchLabel}>AI match for you</Text>
              {match.reasons.length > 0 && (
                <View style={st.reasons}>
                  {match.reasons.slice(0, 4).map((r, i) => (
                    <View key={i} style={st.reasonRow}>
                      <Icon name="checkmark-circle" size={14} color={C.green} />
                      <Text style={st.reasonText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Key facts */}
        <View style={st.grid}>
          <Fact icon="cash-outline" label="Daily wage" value={`${formatINR(job.wagePerDay)}`} tone="primary" />
          <Fact icon="calendar-outline" label="Payment" value={job.paymentFrequency} tone="blue" />
          <Fact icon="flag-outline" label="Starts" value={formatDate(job.startDate)} tone="purple" />
          <Fact icon="people-outline" label="Workers" value={`${job.workersHired}/${job.workersNeeded}`} tone="amber" />
        </View>

        {/* Description */}
        <Card>
          <CardHeader title="About this job" />
          <Text style={st.body}>{job.description}</Text>
          {job.requiredSkills.length > 0 && (
            <View style={st.skillWrap}>
              {job.requiredSkills.map((s) => (
                <Chip key={s} label={s} small />
              ))}
            </View>
          )}
        </Card>

        {/* Safety notes */}
        {job.safetyNotes && (
          <Card>
            <CardHeader
              title="Safety notes"
              right={<View style={st.safeIcon}><Icon name="shield-checkmark" size={16} color={C.green} /></View>}
            />
            {job.safetyNotes.split(".").filter(Boolean).map((note, i) => (
              <View key={i} style={st.reasonRow}>
                <Icon name="checkmark" size={13} color={C.green} />
                <Text style={st.body}>{note.trim()}.</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Contractor */}
        {contractor && contractorUser && (
          <Card>
            <CardHeader title="Posted by" />
            <ListRow
              avatar={{ src: contractorUser.avatar, name: contractor.companyName }}
              title={contractor.companyName}
              sub={`${contractor.businessType} · Trust ${contractor.trustScore}${contractor.rating > 0 ? ` · ★ ${contractor.rating.toFixed(1)}` : ""}`}
              trailing={<Button label="Call" variant="secondary" size="sm" icon="call-outline" onPress={() => Linking.openURL(`tel:${contractorUser.phone}`)} />}
              onPress={() => Linking.openURL(`tel:${contractorUser.phone}`)}
            />
          </Card>
        )}

        {/* My application status */}
        {myApp && (
          <Card>
            <CardHeader title="Your application" right={<StatusBadge status={myApp.status} />} />
            <Text style={st.body}>Applied {formatDate(myApp.appliedAt)} · Match {Math.round(myApp.matchScore)}%</Text>
          </Card>
        )}
      </ScrollView>

      {/* Bottom action bar — thumb zone */}
      <View style={st.actionBar}>
        {isClosed ? (
          <Text style={st.closedText}>This job is {job.status}.</Text>
        ) : isHired ? (
          <View style={st.hiredBox}>
            <Icon name="checkmark-circle" size={20} color={C.green} />
            <Text style={st.hiredText}>You were hired for this job!</Text>
          </View>
        ) : myApp ? (
          <Button label="Withdraw Application" variant="danger" onPress={handleWithdraw} loading={busy} fullWidth />
        ) : (
          <Button label="Apply for this Job" onPress={handleApply} loading={busy} fullWidth icon="send-outline" />
        )}
      </View>
    </SafeAreaView>
  );
}

function TopBar({ onBack, saved, onToggleSave }: { onBack: () => void; saved?: boolean; onToggleSave?: () => void }) {
  return (
    <View style={st.topBar}>
      <Pressable onPress={onBack} hitSlop={10} style={st.backBtn}>
        <Icon name="chevron-back" size={20} color={C.text} />
      </Pressable>
      <View style={{ flex: 1 }} />
      {onToggleSave ? (
        <Pressable onPress={onToggleSave} hitSlop={10} style={st.saveBtn}>
          <Icon name={saved ? "bookmark" : "bookmark-outline"} size={19} color={saved ? C.primary : C.text2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Fact({ icon, label, value, tone }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string; tone: "primary" | "blue" | "purple" | "amber" }) {
  const color = tone === "primary" ? C.primary : tone === "blue" ? C.blue : tone === "purple" ? C.purple : C.amber;
  return (
    <View style={st.fact}>
      <View style={st.factIcon}><Icon name={icon} size={16} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={st.factLabel}>{label}</Text>
        <Text style={st.factValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.md,
    paddingTop: S.sm,
    paddingBottom: S.xs,
    gap: S.sm,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    width: 38, height: 38,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { padding: S.lg, paddingTop: S.xs, gap: S.md },
  title: { fontSize: T.title, fontWeight: "800", color: C.text, lineHeight: 27 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: S.sm, flexWrap: "wrap" },
  meta: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  matchBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.lg,
    borderRadius: R.lg,
    padding: S.lg,
  },
  matchBig: { fontSize: T.title + 8, fontWeight: "800" },
  matchLabel: { fontSize: T.caption, color: C.text2, fontWeight: "700" },
  reasons: { marginTop: S.xs, gap: 4 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: S.xs + 2 },
  reasonText: { fontSize: T.tiny, color: C.text2, flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  fact: {
    width: "48.5%",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
  },
  factIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.muted, alignItems: "center", justifyContent: "center" },
  factLabel: { fontSize: T.tiny, color: C.text3, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  factValue: { fontSize: T.body, fontWeight: "700", color: C.text, textTransform: "capitalize", marginTop: 1 },
  body: { fontSize: T.caption + 1, color: C.text2, lineHeight: 22, flex: 1 },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.xs },
  safeIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center" },
  actionBar: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.md,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  closedText: { textAlign: "center", color: C.text2, fontWeight: "600", paddingVertical: S.md },
  hiredBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, paddingVertical: S.md },
  hiredText: { color: C.green, fontWeight: "800", fontSize: T.body },
});
