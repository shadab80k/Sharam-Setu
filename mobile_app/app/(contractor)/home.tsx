/**
 * Contractor Home (V3) — metrics StatTiles, pipeline card,
 * AI-recommended workers with one-tap invite Sheet.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { StatTile, StatRow } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S, shadow } from "@/theme/tokens";
import type { ApplicationStatus, Job, User, WorkerProfile } from "@/types";

const PIPELINE: { key: string; label: string; statuses: ApplicationStatus[] }[] = [
  { key: "new", label: "New", statuses: ["applied"] },
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted"] },
  { key: "selected", label: "On the job", statuses: ["selected"] },
  { key: "completed", label: "Done", statuses: ["completed"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
];

type Recommended = {
  worker: WorkerProfile;
  user: User;
  job: Job;
  match: ReturnType<typeof calculateMatchScore>;
};

export default function ContractorHome() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === s.currentUser?.id));
  const apps = useStore((s) => s.applications);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const verifications = useStore((s) => s.verifications);
  const payments = useStore((s) => s.payments.filter((p) => p.contractorId === s.currentUser?.id));
  const inviteWorker = useStore((s) => s.inviteWorker);
  const bootstrap = useStore((s) => s.bootstrap);
  const loading = useStore((s) => s.loading);

  const [inviteTarget, setInviteTarget] = useState<Recommended | null>(null);
  const [busy, setBusy] = useState(false);

  const city = CITIES.find((c) => c.id === user?.location) ?? CITIES[0];

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const applicants = apps.filter((a) => jobs.some((j) => j.id === a.jobId)).length;
  const hired = jobs.reduce((s, j) => s + j.workersHired, 0);
  const pendingPayments = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const myApps = apps.filter((a) => jobs.some((j) => j.id === a.jobId));

  const recommended = useMemo<Recommended[]>(() => {
    const openJobs = jobs.filter((j) => j.status === "active" && j.workersHired < j.workersNeeded);
    if (openJobs.length === 0 || !profile) return [];
    return workers
      .filter((w) => w.availability !== "unavailable")
      .map((w) => {
        let best: Recommended | null = null;
        for (const job of openJobs) {
          if (apps.some((a) => a.jobId === job.id && a.workerId === w.userId)) continue;
          const match = calculateMatchScore(job, w, profile, { latitude: city.latitude, longitude: city.longitude });
          if (!best || match.matchScore > best.match.matchScore) {
            const u = users.find((x) => x.id === w.userId);
            if (!u) continue;
            best = { worker: w, user: u, job, match };
          }
        }
        return best;
      })
      .filter((r): r is Recommended => r !== null)
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, 4);
  }, [workers, jobs, apps, profile, city, users]);

  const isIdVerified = (workerId: string) =>
    verifications.some((v) => v.userId === workerId && v.type === "identity" && v.status === "verified");

  async function handleShortlist(r: Recommended) {
    setBusy(true);
    try {
      await inviteWorker(r.job.id, r.worker.userId);
      setInviteTarget(null);
    } catch { /* store toasted */ } finally { setBusy(false); }
  }

  if (!user || !profile) return null;

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        <View style={st.head}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{profile.companyName}</Text>
            <Text style={st.sub}>{profile.businessType} · Trust {profile.trustScore} · ★ {profile.rating.toFixed(1)}</Text>
          </View>
          <Button label="Post Job" size="sm" icon="add" onPress={() => router.push("/(contractor)/jobs/new")} />
        </View>

        {/* Metrics */}
        <StatRow>
          <StatTile icon="briefcase-outline" label="Active" value={String(activeJobs)} sub="jobs" tone="primary" onPress={() => router.push("/(contractor)/jobs")} />
          <StatTile icon="documents-outline" label="Apps" value={String(applicants)} sub="total" tone="blue" onPress={() => router.push("/(contractor)/applicants")} />
          <StatTile icon="people-outline" label="Hired" value={String(hired)} sub="workers" tone="green" />
        </StatRow>

        {/* Pipeline */}
        <Card>
          <CardHeader title="Applicant pipeline" subtitle="Across all your jobs" />
          <View style={st.pipeline}>
            {PIPELINE.map((p) => {
              const count = myApps.filter((a) => p.statuses.includes(a.status)).length;
              return (
                <View
                  key={p.key}
                  style={st.pipeCell}
                  onTouchEnd={() => router.push({ pathname: "/(contractor)/applicants", params: { tab: p.key } } as never)}
                >
                  <Text style={st.pipeNum}>{count}</Text>
                  <Text style={st.pipeLabel}>{p.label}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Recommended workers */}
        <SectionHeader title="Recommended workers" action="Find more" onAction={() => router.push("/(contractor)/workers")} />
        {recommended.length === 0 ? (
          <Card style={{ marginBottom: S.md }}>
            <Text style={st.empty}>
              {jobs.filter((j) => j.status === "active").length === 0
                ? "Post a job to get AI worker recommendations."
                : "All open positions have applications — check the Applicants tab."}
            </Text>
          </Card>
        ) : (
          <View style={st.listCard}>
            {recommended.map((r, i) => (
              <View
                key={r.worker.userId}
                style={st.recRow}
                onTouchEnd={() => setInviteTarget(r)}
              >
                <Avatar src={r.user.avatar} name={r.user.name} size={46} />
                <View style={{ flex: 1 }}>
                  <View style={st.recNameRow}>
                    <Text style={st.recName}>{r.user.name}</Text>
                    {isIdVerified(r.worker.userId) ? (
                      <View style={st.verifiedBadge}><Icon name="checkmark" size={10} color={C.onPrimary} /></View>
                    ) : null}
                  </View>
                  <Text style={st.recMeta}>
                    {r.worker.profession} · {r.worker.completedJobs} jobs · ★ {r.worker.rating.toFixed(1)}
                  </Text>
                  <Text style={st.recJob} numberOfLines={1}>for: {r.job.title}</Text>
                </View>
                <Badge
                  label={`${Math.round(r.match.matchScore)}%`}
                  tone={r.match.matchScore >= 70 ? "green" : "orange"}
                />
                {i < recommended.length - 1 ? <View style={st.recDivider} /> : null}
              </View>
            ))}
          </View>
        )}

        {/* Unpaid nudge */}
        {pendingPayments > 0 && (
          <Card style={{ marginBottom: S.xl }}>
            <View style={st.pendingRow}>
              <View style={st.pendingIcon}>
                <Icon name="wallet-outline" size={18} color={C.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.pendingTitle}>{formatINR(pendingPayments)} unpaid</Text>
                <Text style={st.pendingSub}>Pay on time to keep your reliability high</Text>
              </View>
              <Button label="View" variant="secondary" size="sm" onPress={() => router.push("/(contractor)/payments")} />
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Invite confirm sheet */}
      <Sheet open={!!inviteTarget} onClose={() => setInviteTarget(null)} title="Invite Worker">
        {inviteTarget && (
          <>
            <View style={st.inviteHead}>
              <Avatar src={inviteTarget.user.avatar} name={inviteTarget.user.name} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={st.inviteName}>{inviteTarget.user.name}</Text>
                <Text style={st.inviteMeta}>
                  {inviteTarget.worker.profession} · {formatINR(inviteTarget.worker.expectedDailyWage)}/day · Trust {inviteTarget.worker.trustScore}
                </Text>
              </View>
            </View>
            <View style={st.inviteJob}>
              <Text style={st.inviteJobLabel}>Shortlist them for</Text>
              <Text style={st.inviteJobName}>{inviteTarget.job.title}</Text>
              <Text style={st.inviteJobMeta}>
                {formatINR(inviteTarget.job.wagePerDay)}/day · {inviteTarget.job.location} · {inviteTarget.job.workersHired}/{inviteTarget.job.workersNeeded} hired
              </Text>
              {inviteTarget.match.reasons.length > 0 && (
                <View style={st.reasonRow}>
                  <Icon name="sparkles" size={13} color={C.purple} />
                  <Text style={st.reasonText}>{inviteTarget.match.reasons.join(" · ")}</Text>
                </View>
              )}
            </View>
            <Button
              label={`Shortlist for this Job (${Math.round(inviteTarget.match.matchScore)}% match)`}
              onPress={() => handleShortlist(inviteTarget)}
              loading={busy}
              fullWidth
            />
            <Text style={st.inviteNote}>The worker gets a notification and can apply instantly.</Text>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md },
  title: { fontSize: T.title, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption, color: C.text2, marginTop: 2, fontWeight: "500" },
  pipeline: { flexDirection: "row", gap: S.sm },
  pipeCell: {
    flex: 1, backgroundColor: C.muted, borderRadius: R.md,
    padding: S.md, alignItems: "center", gap: 2,
  },
  pipeNum: { fontSize: T.title - 4, fontWeight: "800", color: C.text },
  pipeLabel: { fontSize: 10, color: C.text2, fontWeight: "700", textAlign: "center" },
  listCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    marginBottom: S.md,
    ...shadow,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: S.sm + 2,
    position: "relative",
  },
  recNameRow: { flexDirection: "row", alignItems: "center", gap: S.xs },
  recName: { fontSize: T.caption + 1, fontWeight: "700", color: C.text },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  recMeta: { fontSize: T.tiny, color: C.text2, marginTop: 1 },
  recJob: { fontSize: T.tiny, color: C.primary, fontWeight: "700", marginTop: 2 },
  recDivider: { position: "absolute", left: 46 + S.md, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: C.hairline },
  empty: { fontSize: T.caption + 1, color: C.text2, lineHeight: 21 },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  pendingIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: "center", justifyContent: "center" },
  pendingTitle: { fontSize: T.body + 1, fontWeight: "800", color: C.text },
  pendingSub: { fontSize: T.tiny, color: C.text2, marginTop: 1 },
  inviteHead: { flexDirection: "row", alignItems: "center", gap: S.lg, marginBottom: S.md },
  inviteName: { fontSize: T.body + 2, fontWeight: "800", color: C.text },
  inviteMeta: { fontSize: T.caption, color: C.text2, marginTop: 2 },
  inviteJob: { backgroundColor: C.muted, borderRadius: R.md, padding: S.md, gap: 3, marginBottom: S.md },
  inviteJobLabel: { fontSize: T.tiny, color: C.text2, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  inviteJobName: { fontSize: T.body + 1, fontWeight: "800", color: C.text },
  inviteJobMeta: { fontSize: T.caption, color: C.text2 },
  reasonRow: { flexDirection: "row", gap: S.xs + 2, alignItems: "center", marginTop: S.xs },
  reasonText: { fontSize: T.tiny, color: C.text2, flex: 1, lineHeight: 15 },
  inviteNote: { fontSize: T.tiny, color: C.text3, textAlign: "center", marginTop: S.md },
});
