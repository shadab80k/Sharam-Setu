/**
 * Contractor Home — metrics, applicant pipeline, AI-recommended workers
 * with one-tap invite (job already picked by the match).
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
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Feedback";
import { Avatar } from "@/components/ui/Avatar";
import { C, T, R, S } from "@/theme/tokens";
import type { ApplicationStatus, Job, User, WorkerProfile, ContractorProfile } from "@/types";

const PIPELINE: { key: string; label: string; statuses: ApplicationStatus[] }[] = [
  { key: "new", label: "New", statuses: ["applied"] },
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted"] },
  { key: "selected", label: "On the job", statuses: ["selected"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
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

  // Best match for each worker across ALL active jobs with open positions
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        <View style={styles.head}>
          <View>
            <Text style={styles.title}>{profile.companyName}</Text>
            <Text style={styles.sub}>{profile.businessType} · Trust {profile.trustScore} · ★ {profile.rating.toFixed(1)}</Text>
          </View>
          <Button label="+ Post Job" size="sm" onPress={() => router.push("/(contractor)/jobs/new")} />
        </View>

        {/* Metrics */}
        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricNum}>{activeJobs}</Text><Text style={styles.metricLabel}>Active jobs</Text></View>
          <View style={styles.metric}><Text style={styles.metricNum}>{applicants}</Text><Text style={styles.metricLabel}>Applicants</Text></View>
          <View style={styles.metric}><Text style={styles.metricNum}>{hired}</Text><Text style={styles.metricLabel}>Hired</Text></View>
          <View style={styles.metric}><Text style={[styles.metricNum, { fontSize: T.base }]}>{formatINR(pendingPayments)}</Text><Text style={styles.metricLabel}>Unpaid</Text></View>
        </View>

        {/* Pipeline */}
        <Card>
          <CardHeader title="Applicant pipeline" subtitle="Across all your jobs" />
          <View style={styles.pipeline}>
            {PIPELINE.map((p) => {
              const count = myApps.filter((a) => p.statuses.includes(a.status)).length;
              return (
                <Pressable
                  key={p.key}
                  style={styles.pipeCell}
                  onPress={() => router.push({ pathname: "/(contractor)/applicants", params: { tab: p.key } } as never)}
                >
                  <Text style={styles.pipeNum}>{count}</Text>
                  <Text style={styles.pipeLabel}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Recommended workers */}
        <Card>
          <CardHeader
            title="Recommended workers"
            subtitle="AI-matched to your open jobs"
            right={<Button label="Find more" variant="link" size="sm" onPress={() => router.push("/(contractor)/workers")} />}
          />
          {recommended.length === 0 ? (
            <Text style={styles.empty}>
              {jobs.filter((j) => j.status === "active").length === 0
                ? "Post a job to get AI worker recommendations."
                : "All open positions have applications — check the Applicants tab."}
            </Text>
          ) : (
            recommended.map((r) => (
              <Pressable
                key={r.worker.userId}
                style={styles.recRow}
                onPress={() => setInviteTarget(r)}
              >
                <Avatar src={r.user.avatar} name={r.user.name} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>
                    {r.user.name} {isIdVerified(r.worker.userId) ? "✅" : ""}
                  </Text>
                  <Text style={styles.recMeta}>
                    {r.worker.profession} · {r.worker.completedJobs} jobs · ★ {r.worker.rating.toFixed(1)}
                  </Text>
                  <Text style={styles.recJob} numberOfLines={1}>for: {r.job.title}</Text>
                </View>
                <View style={[styles.matchPill, { backgroundColor: r.match.matchScore >= 70 ? C.green100 : C.orange100 }]}>
                  <Text style={[styles.matchText, { color: r.match.matchScore >= 70 ? C.green600 : C.orange600 }]}>
                    {Math.round(r.match.matchScore)}%
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Invite confirm sheet */}
      <Sheet open={!!inviteTarget} onClose={() => setInviteTarget(null)} title="Invite Worker">
        {inviteTarget && (
          <>
            <View style={styles.inviteHead}>
              <Avatar src={inviteTarget.user.avatar} name={inviteTarget.user.name} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteName}>{inviteTarget.user.name}</Text>
                <Text style={styles.inviteMeta}>
                  {inviteTarget.worker.profession} · {formatINR(inviteTarget.worker.expectedDailyWage)}/day · Trust {inviteTarget.worker.trustScore}
                </Text>
              </View>
            </View>
            <View style={styles.inviteJob}>
              <Text style={styles.inviteJobLabel}>Shortlist them for</Text>
              <Text style={styles.inviteJobName}>{inviteTarget.job.title}</Text>
              <Text style={styles.inviteJobMeta}>
                {formatINR(inviteTarget.job.wagePerDay)}/day · {inviteTarget.job.location} · {inviteTarget.job.workersHired}/{inviteTarget.job.workersNeeded} hired
              </Text>
              {inviteTarget.match.reasons.length > 0 && (
                <Text style={styles.inviteReasons}>💡 {inviteTarget.match.reasons.join(" · ")}</Text>
              )}
            </View>
            <Button
              label={`Shortlist for this Job (${Math.round(inviteTarget.match.matchScore)}% match)`}
              onPress={() => handleShortlist(inviteTarget)}
              loading={busy}
              fullWidth
            />
            <Text style={styles.inviteNote}>The worker gets a notification and can apply instantly.</Text>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.lg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.xs, color: C.gray500, marginTop: 2, fontWeight: "600" },
  metricRow: { flexDirection: "row", gap: S.sm },
  metric: {
    flex: 1, backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md, alignItems: "center", gap: 2,
  },
  metricNum: { fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  metricLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600", textAlign: "center" },
  pipeline: { flexDirection: "row", gap: S.sm },
  pipeCell: {
    flex: 1, backgroundColor: C.cream50, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md, alignItems: "center", gap: 2,
  },
  pipeNum: { fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  pipeLabel: { fontSize: 10, color: C.gray500, fontWeight: "700", textAlign: "center" },
  recRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  recName: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  recMeta: { fontSize: T.xs, color: C.gray500, marginTop: 1 },
  recJob: { fontSize: T.xs, color: C.orange600, fontWeight: "700", marginTop: 2 },
  matchPill: { borderRadius: R.sm, paddingHorizontal: S.md, paddingVertical: S.xs },
  matchText: { fontSize: T.sm, fontWeight: "800" },
  empty: { fontSize: T.sm, color: C.gray600, lineHeight: 20 },
  inviteHead: { flexDirection: "row", alignItems: "center", gap: S.lg, marginBottom: S.lg },
  inviteName: { fontSize: T.lg, fontWeight: "900", color: C.navy900 },
  inviteMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  inviteJob: { backgroundColor: C.cream100, borderRadius: R.md, padding: S.md, gap: 4, marginBottom: S.lg },
  inviteJobLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "700" },
  inviteJobName: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  inviteJobMeta: { fontSize: T.xs, color: C.gray600 },
  inviteReasons: { fontSize: T.xs, color: C.gray600, marginTop: S.xs, lineHeight: 17 },
  inviteNote: { fontSize: T.xs, color: C.gray500, textAlign: "center", marginTop: S.md },
});
