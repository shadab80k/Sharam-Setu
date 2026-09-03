/**
 * Find Workers (V3) — search + profession chips, worker cards,
 * Invite → job-picker Sheet (single-modal pattern).
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
import { Sheet } from "@/components/ui/Sheet";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { SkeletonRow } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chips";
import { Icon } from "@/components/ui/Icon";
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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <Text style={st.title}>Find Workers</Text>
        <Text style={st.sub}>{filtered.length} available · sorted by trust</Text>
      </View>

      <View style={st.searchWrap}>
        <Field
          icon="search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, trade, skill…"
        />
      </View>

      <View style={st.tabWrap}>
        <Tabs
          scrollable
          value={profession}
          onChange={setProfession}
          items={[
            { value: "all", label: "All" },
            ...PROFESSION_NAMES.map((p) => ({ value: p, label: p })),
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && filtered.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : openJobs.length === 0 ? (
          <EmptyState
            icon="people-outline"
            tone="primary"
            message="You need an open job with free positions before inviting workers."
            ctaLabel="Post a Job"
            onCta={() => router.push("/(contractor)/jobs/new")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="search-outline" message="No workers match your search." />
        ) : (
          filtered.map(({ worker, user: u, verified }) => {
            const appliedTo = alreadyAppliedTo(worker.userId);
            return (
              <Card key={worker.userId}>
                <View style={st.rowTop}>
                  <Avatar src={u.avatar} name={u.name} size={52} />
                  <View style={{ flex: 1 }}>
                    <View style={st.nameRow}>
                      <Text style={st.name}>{u.name}</Text>
                      {verified && (
                        <View style={st.verifiedBadge}>
                          <Icon name="checkmark" size={10} color={C.onPrimary} />
                        </View>
                      )}
                    </View>
                    <Text style={st.meta}>
                      {worker.profession} · {worker.experienceYears} yrs · {formatINR(worker.expectedDailyWage)}/day
                    </Text>
                    <View style={st.badgeRow}>
                      <Badge label={`Trust ${worker.trustScore}`} tone="green" />
                      {worker.rating > 0 && <Badge label={`★ ${worker.rating.toFixed(1)}`} tone="amber" />}
                      <Badge label={worker.availability === "available" ? "Available" : "Working"} tone={worker.availability === "available" ? "blue" : "gray"} />
                    </View>
                  </View>
                </View>
                {worker.skills.length > 0 && (
                  <View style={st.skillWrap}>
                    {worker.skills.slice(0, 4).map((s) => (
                      <Chip key={s} label={s} small />
                    ))}
                  </View>
                )}
                <View style={st.actions}>
                  <Button label="Call" variant="secondary" size="sm" icon="call-outline" onPress={() => Linking.openURL(`tel:${u.phone}`)} />
                  <Button
                    label="Invite to Job"
                    size="sm"
                    icon="send-outline"
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
            <View style={st.inviteHead}>
              <Avatar src={inviteTarget.user.avatar} name={inviteTarget.user.name} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={st.inviteName}>{inviteTarget.user.name}</Text>
                <Text style={st.inviteMeta}>
                  {inviteTarget.worker.profession} · Trust {inviteTarget.worker.trustScore} · ★ {inviteTarget.worker.rating.toFixed(1)}
                </Text>
              </View>
            </View>
            <Text style={st.pickerLabel}>Choose the job to shortlist them for</Text>
            {openJobs.map((j) => {
              const applied = alreadyAppliedTo(inviteTarget.worker.userId).has(j.id);
              return (
                <Pressable
                  key={j.id}
                  style={[st.jobOpt, applied && { opacity: 0.5 }]}
                  disabled={applied || busyJobId !== null}
                  onPress={() => invite(j.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={st.jobOptTitle}>{j.title}</Text>
                    <Text style={st.jobOptMeta}>
                      {formatINR(j.wagePerDay)}/day · {j.location} · {j.workersHired}/{j.workersNeeded} hired
                    </Text>
                  </View>
                  {applied ? (
                    <Badge label="Applied" tone="blue" />
                  ) : busyJobId === j.id ? (
                    <Text style={st.inviting}>Inviting…</Text>
                  ) : (
                    <View style={st.jobOptGo}>
                      <Icon name="chevron-forward" size={16} color={C.primary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
            <Text style={st.pickerNote}>They'll be shortlisted instantly and notified by SMS.</Text>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  searchWrap: { paddingHorizontal: S.lg, paddingBottom: S.sm },
  tabWrap: { paddingHorizontal: S.lg, marginBottom: S.xs },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption + 1, color: C.text2, marginTop: 2 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  rowTop: { flexDirection: "row", gap: S.md, alignItems: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: S.xs },
  name: { fontSize: T.body, fontWeight: "700", color: C.text },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  meta: { fontSize: T.caption, color: C.text2, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm, flexWrap: "wrap" },
  skillWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.md },
  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  inviteHead: { flexDirection: "row", alignItems: "center", gap: S.lg, marginBottom: S.md },
  inviteName: { fontSize: T.body + 2, fontWeight: "800", color: C.text },
  inviteMeta: { fontSize: T.caption, color: C.text2, marginTop: 2 },
  pickerLabel: { fontSize: T.caption, fontWeight: "700", color: C.text, marginBottom: S.sm },
  jobOpt: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.muted, borderRadius: R.md,
    padding: S.md, marginBottom: S.sm,
  },
  jobOptTitle: { fontSize: T.caption + 1, fontWeight: "700", color: C.text },
  jobOptMeta: { fontSize: T.tiny, color: C.text2, marginTop: 2 },
  jobOptGo: { width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.primarySoft, alignItems: "center", justifyContent: "center" },
  inviting: { color: C.text3, fontSize: T.tiny, fontWeight: "700" },
  pickerNote: { fontSize: T.tiny, color: C.text3, textAlign: "center", marginTop: S.sm },
});
