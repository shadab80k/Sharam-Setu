/**
 * Contractor Home (Swiggy-style) — green location header, money strip,
 * applicant pipeline chips, restaurant-card AI worker feed with one-tap invite,
 * dashed offer strips. Same store logic.
 */
import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES, getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DashedDivider, OfferStrip, RatingPill } from "@/components/ui/Swiggy";
import { C, T, R, S, shadow } from "@/theme/tokens";
import type { ApplicationStatus, Job, User, WorkerProfile } from "@/types";

const PIPELINE: { key: string; label: string; statuses: ApplicationStatus[]; icon: string; color: string }[] = [
  { key: "new", label: "New", statuses: ["applied"], icon: "sparkles", color: C.primary },
  { key: "shortlisted", label: "Shortlist", statuses: ["shortlisted"], icon: "bookmark", color: C.blue },
  { key: "selected", label: "On job", statuses: ["selected"], icon: "hammer", color: C.green },
  { key: "completed", label: "Done", statuses: ["completed"], icon: "checkmark-done", color: C.green },
  { key: "rejected", label: "Passed", statuses: ["rejected"], icon: "close", color: C.text3 },
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

  const city = getCity(user?.location || "lucknow");

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
        {/* ── Green location header (Swiggy) ── */}
        <View style={st.locBar}>
          <Pressable style={st.locLeft} onPress={() => router.push("/(contractor)/profile")}>
            <Ionicons name="business" size={16} color={C.white} />
            <View style={{ flex: 1 }}>
              <Text style={st.locHome} numberOfLines={1}>{profile.companyName}</Text>
              <Text style={st.locCity} numberOfLines={1}>{city.name} · {profile.businessType}</Text>
            </View>
            <Ionicons name="chevron-down" size={15} color={C.white} />
          </Pressable>
          <View style={st.ratingBox}>
            <RatingPill value={profile.rating} count={0} size="sm" />
            <Text style={st.trustLbl}>TRUST {profile.trustScore}</Text>
          </View>
        </View>

        {/* ── Money strip ── */}
        <View style={st.moneyStrip}>
          <Pressable style={st.moneyCell} onPress={() => router.push("/(contractor)/jobs")}>
            <Text style={st.moneyVal}>{activeJobs}</Text>
            <Text style={st.moneyLbl}>Active jobs</Text>
          </Pressable>
          <View style={st.moneySep} />
          <Pressable style={st.moneyCell} onPress={() => router.push("/(contractor)/applicants")}>
            <Text style={st.moneyVal}>{applicants}</Text>
            <Text style={st.moneyLbl}>Applicants</Text>
          </Pressable>
          <View style={st.moneySep} />
          <Pressable style={st.moneyCell} onPress={() => router.push("/(contractor)/payments")}>
            <Text style={[st.moneyVal, { color: C.amber }]}>{formatINR(pendingPayments)}</Text>
            <Text style={st.moneyLbl}>Unpaid</Text>
          </Pressable>
        </View>

        {/* ── Post job CTA (Blinkit delivery banner) ── */}
        <Pressable style={st.postBanner} onPress={() => router.push("/(contractor)/jobs/new")}>
          <View style={st.postIcon}>
            <Ionicons name="add" size={22} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.postTitle}>Post a new job</Text>
            <Text style={st.postSub}>AI-matched workers within minutes</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </Pressable>

        {/* ── Pipeline (colored chips) ── */}
        <SectionHeader title="Applicant pipeline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -S.lg }} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.sm }}>
          {PIPELINE.map((p) => {
            const count = myApps.filter((a) => p.statuses.includes(a.status)).length;
            return (
              <Pressable
                key={p.key}
                style={st.pipeChip}
                onPress={() => router.push({ pathname: "/(contractor)/applicants", params: { tab: p.key } } as never)}
              >
                <View style={[st.pipeIcon, { backgroundColor: p.color }]}>
                  <Ionicons name={p.icon as never} size={14} color={C.white} />
                </View>
                <Text style={st.pipeNum}>{count}</Text>
                <Text style={st.pipeLbl}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Worker feed (restaurant cards) ── */}
        <SectionHeader
          title={`${recommended.length} workers for you`}
          action="Find more"
          onAction={() => router.push("/(contractor)/workers")}
        />
        {recommended.length === 0 ? (
          <Card>
            <Text style={st.emptyText}>
              {jobs.filter((j) => j.status === "active").length === 0
                ? "Post a job to get AI worker recommendations."
                : "All open positions have applications — check Applicants."}
            </Text>
          </Card>
        ) : (
          recommended.map((r, i) => (
            <WorkerCard
              key={r.worker.userId}
              r={r}
              verified={isIdVerified(r.worker.userId)}
              isLast={i === recommended.length - 1}
              onOpen={() => setInviteTarget(r)}
            />
          ))
        )}

        {/* ── Unpaid nudge ── */}
        {pendingPayments > 0 && (
          <OfferStrip
            icon="wallet"
            tone="amber"
            text={`${formatINR(pendingPayments)} unpaid — pay on time to keep reliability high`}
            onPress={() => router.push("/(contractor)/payments")}
          />
        )}
      </ScrollView>

      {/* ── Invite sheet (same flow) ── */}
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
              <Text style={st.inviteJobLabel}>SHORTLIST FOR</Text>
              <Text style={st.inviteJobName}>{inviteTarget.job.title}</Text>
              <Text style={st.inviteJobMeta}>
                {formatINR(inviteTarget.job.wagePerDay)}/day · {inviteTarget.job.location} · {inviteTarget.job.workersHired}/{inviteTarget.job.workersNeeded} hired
              </Text>
              {inviteTarget.match.reasons.length > 0 && (
                <Text style={st.inviteReasons}>{inviteTarget.match.reasons.join(" · ")}</Text>
              )}
            </View>
            <Button
              label={`Invite (${Math.round(inviteTarget.match.matchScore)}% match)`}
              onPress={() => handleShortlist(inviteTarget)}
              loading={busy}
              fullWidth
              icon="send-outline"
            />
            <Text style={st.inviteNote}>The worker gets a notification and can apply instantly.</Text>
          </>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

/* ---------------- Swiggy restaurant-style worker card ---------------- */

function WorkerCard({ r, verified, isLast, onOpen }: {
  r: Recommended;
  verified: boolean;
  isLast: boolean;
  onOpen: () => void;
}) {
  const score = Math.round(r.match.matchScore);
  const tone = score >= 70 ? C.green : C.primary;
  const toneSoft = score >= 70 ? C.greenSoft : C.primarySoft;

  return (
    <Pressable style={st.wCard} onPress={onOpen}>
      {/* Header: wage (price-style) + match pill */}
      <View style={st.wTop}>
        <View style={{ flex: 1 }}>
          <Text style={st.wWage}>
            {formatINR(r.worker.expectedDailyWage)}
            <Text style={st.wWageUnit}>/day</Text>
          </Text>
          <Text style={st.wExp}>{r.worker.experienceYears} yrs · {r.worker.completedJobs} jobs</Text>
        </View>
        <View style={[st.wMatchPill, { backgroundColor: toneSoft }]}>
          <Ionicons name="sparkles" size={12} color={tone} />
          <Text style={[st.wMatchText, { color: tone }]}>{score}%</Text>
        </View>
      </View>

      {/* Identity */}
      <View style={st.wIdRow}>
        <Avatar src={r.user.avatar} name={r.user.name} size={44} />
        <View style={{ flex: 1 }}>
          <View style={st.wNameRow}>
            <Text style={st.wName} numberOfLines={1}>{r.user.name}</Text>
            {verified && (
              <View style={st.wVerified}>
                <Ionicons name="checkmark" size={10} color={C.white} />
              </View>
            )}
            <RatingPill value={r.worker.rating} size="sm" />
            <View style={st.wTrust}>
              <Text style={st.wTrustText}>TRUST {r.worker.trustScore}</Text>
            </View>
          </View>
          <Text style={st.wProf}>{r.worker.profession} · {r.worker.availability === "available" ? "Available" : "Working"}</Text>
        </View>
      </View>

      {/* Dashed seam → job-for footer */}
      <DashedDivider style={{ marginVertical: S.sm }} />
      <View style={st.wFoot}>
        <Ionicons name="briefcase-outline" size={13} color={C.text3} />
        <Text style={st.wFootText} numberOfLines={1}>for {r.job.title} · {r.job.location}</Text>
        <View style={st.wInviteBtn}>
          <Text style={st.wInviteText}>INVITE</Text>
        </View>
      </View>
      {!isLast ? <View style={{ height: S.md }} /> : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },

  /* location bar */
  locBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    marginHorizontal: -S.lg, marginTop: -S.lg,
    paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.lg,
    backgroundColor: C.green,
  },
  locLeft: { flexDirection: "row", alignItems: "center", gap: S.xs + 2, flex: 1 },
  locHome: { color: C.white, fontSize: T.body + 1, fontWeight: "800" },
  locCity: { color: "rgba(255,255,255,0.85)", fontSize: T.caption, fontWeight: "600" },
  ratingBox: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: "rgba(255,255,255,0.16)", borderRadius: R.md,
    paddingHorizontal: S.md, paddingVertical: S.xs,
  },
  trustLbl: { color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },

  /* money strip */
  moneyStrip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.lg,
    paddingVertical: S.md,
    ...shadow,
  },
  moneyCell: { flex: 1, alignItems: "center", gap: 1 },
  moneySep: { width: 1, height: 34, backgroundColor: C.hairline },
  moneyVal: { fontSize: T.body + 2, fontWeight: "900", color: C.text },
  moneyLbl: { fontSize: T.tiny, color: C.text3, fontWeight: "700" },

  /* post banner */
  postBanner: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.primarySoft,
    borderRadius: R.lg,
    padding: S.md + 2,
  },
  postIcon: {
    width: 42, height: 42, borderRadius: R.pill,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  postTitle: { fontSize: T.body + 1, fontWeight: "800", color: C.text },
  postSub: { fontSize: T.caption, color: C.text2, marginTop: 1, fontWeight: "500" },

  /* pipeline chips */
  pipeChip: {
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.sm + 2,
    paddingHorizontal: S.md,
    gap: 2,
    minWidth: 64,
    ...shadow,
  },
  pipeIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  pipeNum: { fontSize: T.body + 1, fontWeight: "900", color: C.text },
  pipeLbl: { fontSize: 9.5, color: C.text3, fontWeight: "700" },

  /* worker card */
  wCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    ...shadow,
  },
  wTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: S.md },
  wWage: { fontSize: T.title + 2, fontWeight: "900", color: C.text },
  wWageUnit: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  wExp: { fontSize: T.tiny, color: C.text3, fontWeight: "600", marginTop: 1 },
  wMatchPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4,
  },
  wMatchText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  wIdRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.sm },
  wNameRow: { flexDirection: "row", alignItems: "center", gap: S.xs, flexShrink: 1 },
  wName: { fontSize: T.body, fontWeight: "700", color: C.text },
  wVerified: {
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
  },
  wTrust: {
    backgroundColor: C.muted,
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  wTrustText: { fontSize: 9, fontWeight: "800", color: C.text2, letterSpacing: 0.5 },
  wProf: { fontSize: T.tiny, color: C.text2, fontWeight: "500", marginTop: 2 },
  wFoot: { flexDirection: "row", alignItems: "center", gap: S.sm },
  wFootText: { flex: 1, fontSize: T.tiny, color: C.text3, fontWeight: "600" },
  wInviteBtn: {
    backgroundColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 5,
  },
  wInviteText: { fontSize: 10, fontWeight: "900", color: C.white, letterSpacing: 0.6 },

  /* invite sheet */
  inviteHead: { flexDirection: "row", alignItems: "center", gap: S.lg, marginBottom: S.md },
  inviteName: { fontSize: T.body + 2, fontWeight: "800", color: C.text },
  inviteMeta: { fontSize: T.caption, color: C.text2, marginTop: 2 },
  inviteJob: { backgroundColor: C.muted, borderRadius: R.md, padding: S.md, gap: 3, marginBottom: S.md },
  inviteJobLabel: { fontSize: T.tiny, color: C.text3, fontWeight: "800", letterSpacing: 0.6 },
  inviteJobName: { fontSize: T.body + 1, fontWeight: "800", color: C.text },
  inviteJobMeta: { fontSize: T.caption, color: C.text2 },
  inviteReasons: { fontSize: T.tiny, color: C.text2, marginTop: S.xs, lineHeight: 16 },
  inviteNote: { fontSize: T.tiny, color: C.text3, textAlign: "center", marginTop: S.md },
  emptyText: { color: C.text2, fontSize: T.body, lineHeight: 22, textAlign: "center", paddingVertical: S.md },
});
