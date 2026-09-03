/**
 * Find Workers — search/filter + invite flow.
 * Tapping Invite opens a job-picker bottom sheet (single-modal pattern
 * from the web fix) listing open jobs; picking one shortlists the worker
 * via /api/applications/invite.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { PROFESSION_NAMES } from "@/services/professions";
import { formatINR } from "@/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet, Tabs, EmptyState } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { SkeletonRow } from "@/components/ui/Avatar";
import { C, T, R, S } from "@/theme/tokens";
import type { User, WorkerProfile } from "@/types";

type Row = { worker: WorkerProfile; user: User; verified: boolean };

export default function FindWorkers() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const verifications = useStore((s) => s.verifications);
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === s.currentUser?.id));
  const apps = useStore((s) => s.applications);
  const inviteWorker = useStore((s) => s.inviteWorker);
  const bootstrap = useStore((s) => s.bootstrap);
  const loading = useStore((s) => s.loading);

  const [search, setSearch] = useState("");
  const [profession, setProfession] = useState("all");
  const [inviteTarget, setInviteTarget] = useState<Row | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const enriched = useMemo<Row[]>(() => {
    return workers
      .map((worker) => {
        const u = users.find((x) => x.id === worker.userId);
        if (!u || u.status !== "active") return null;
        const verified = verifications.some(
          (v) => v.userId === worker.userId && v.type === "identity" && v.status === "verified"
        );
        return { worker, user: u, verified };
      })
      .filter((r): r is Row => r !== null);
  }, [workers, users, verifications]);

  const filtered = useMemo(() => {
    return enriched
      .filter(({ worker, user: u }) => {
        if (worker.availability === "unavailable") return false;
        if (search) {
          const q = search.toLowerCase();
          const match =
            u.name.toLowerCase().includes(q) ||
            worker.profession.toLowerCase().includes(q) ||
            worker.skills.some((s) => s.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (profession !== "all" && worker.profession !== profession) return false;
        return true;
      })
      .sort((a, b) => b.worker.trustScore - a.worker.trustScore);
  }, [enriched, search, profession]);

  // Open jobs with free positions — the invite picker list
  const openJobs = useMemo(
    () => jobs.filter((j) => j.status === "active" && j.workersHired < j.workersNeeded),
    [jobs]
  );

  const alreadyAppliedTo = (workerId: string) =>
    new Set(apps.filter((a) => a.workerId === workerId).map((a) => a.jobId));

  async function invite(jobId: string) {
    if (!inviteTarget) return;
    setBusyJobId(jobId);
    try {
      await inviteWorker(jobId, inviteTarget.worker.userId);
      setInviteTarget(null);
    } catch { /* store toasted (409 = already applied) */ } finally { setBusyJobId(null); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.title}>Find Workers</Text>
        <Text style={styles.sub}>{filtered.length} available · sorted by trust</Text>
      </View>

      <View style={styles.searchWrap}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, trade, skill…"
          style={{ marginBottom: 0 }}
        />
      </View>

      <Tabs
        value={profession}
        onChange={setProfession}
        items={[
          { value: "all", label: "All" },
          ...PROFESSION_NAMES.map((p) => ({ value: p, label: p })),
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && filtered.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : openJobs.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>👷</Text>}
            message="You need an open job with free positions before inviting workers."
            ctaLabel="Post a Job"
            onCta={() => router.push("/(contractor)/jobs/new")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Text style={{ fontSize: 40 }}>🔍</Text>} message="No workers match your search." />
        ) : (
          filtered.map(({ worker, user: u, verified }) => {
            const appliedTo = alreadyAppliedTo(worker.userId);
            return (
              <Card key={worker.userId}>
                <View style={styles.rowTop}>
                  <Avatar src={u.avatar} name={u.name} size={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {u.name} {verified ? "✅" : ""}
                    </Text>
                    <Text style={styles.meta}>
                      {worker.profession} · {worker.experienceYears} yrs · {formatINR(worker.expectedDailyWage)}/day
                    </Text>
                    <View style={styles.badgeRow}>
                      <Badge label={`Trust ${worker.trustScore}`} tone="green" />
                      {worker.rating > 0 && <Badge label={`★ ${worker.rating.toFixed(1)}`} tone="amber" />}
                      <Badge label={worker.availability === "available" ? "Available" : "Working"} tone={worker.availability === "available" ? "blue" : "amber"} />
                    </View>
                  </View>
                </View>
                {worker.skills.length > 0 && (
                  <View style={styles.skillWrap}>
                    {worker.skills.slice(0, 4).map((s) => (
                      <View key={s} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>
                    ))}
                  </View>
                )}
                <View style={styles.actions}>
                  <Button label="📞 Call" variant="secondary" size="sm" onPress={() => Linking.openURL(`tel:${u.phone}`)} />
                  <Button
                    label="Invite to Job"
                    size="sm"
                    onPress={() => setInviteTarget({ worker, user: u, verified })}
                  />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Job picker sheet — single-modal pattern */}
      <Sheet open={!!inviteTarget} onClose={() => setInviteTarget(null)} title={`Invite ${inviteTarget?.user.name ?? ""}`}>
        {inviteTarget && (
          <>
            <View style={styles.inviteHead}>
              <Avatar src={inviteTarget.user.avatar} name={inviteTarget.user.name} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteName}>{inviteTarget.user.name}</Text>
                <Text style={styles.inviteMeta}>
                  {inviteTarget.worker.profession} · Trust {inviteTarget.worker.trustScore} · ★ {inviteTarget.worker.rating.toFixed(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.pickerLabel}>Choose the job to shortlist them for</Text>
            {openJobs.map((j) => {
              const applied = alreadyAppliedTo(inviteTarget.worker.userId).has(j.id);
              return (
                <Pressable
                  key={j.id}
                  style={[styles.jobOpt, applied && { opacity: 0.5 }]}
                  disabled={applied || busyJobId !== null}
                  onPress={() => invite(j.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobOptTitle}>{j.title}</Text>
                    <Text style={styles.jobOptMeta}>
                      {formatINR(j.wagePerDay)}/day · {j.location} · {j.workersHired}/{j.workersNeeded} hired
                    </Text>
                  </View>
                  {applied ? (
                    <Badge label="Applied" tone="blue" />
                  ) : busyJobId === j.id ? (
                    <Text style={styles.inviting}>Inviting…</Text>
                  ) : (
                    <Text style={styles.jobOptGo}>Invite ›</Text>
                  )}
                </Pressable>
              );
            })}
            <Text style={styles.pickerNote}>They'll be shortlisted instantly and notified by SMS.</Text>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.sm, color: C.gray500, marginTop: 2 },
  searchWrap: { paddingHorizontal: S.lg, paddingBottom: S.sm },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  rowTop: { flexDirection: "row", gap: S.md, alignItems: "center" },
  name: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  meta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm, flexWrap: "wrap" },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.md },
  skillChip: { backgroundColor: C.blue100, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 3 },
  skillText: { color: C.blue600, fontSize: T.xs, fontWeight: "700" },
  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  inviteHead: { flexDirection: "row", alignItems: "center", gap: S.lg, marginBottom: S.lg },
  inviteName: { fontSize: T.lg, fontWeight: "900", color: C.navy900 },
  inviteMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  pickerLabel: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  jobOpt: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderRadius: R.md,
    padding: S.md, marginBottom: S.sm,
  },
  jobOptTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  jobOptMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  jobOptGo: { color: C.orange600, fontSize: T.sm, fontWeight: "800" },
  inviting: { color: C.gray500, fontSize: T.xs, fontWeight: "700" },
  pickerNote: { fontSize: T.xs, color: C.gray500, textAlign: "center", marginTop: S.sm },
});
