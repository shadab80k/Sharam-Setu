/**
 * Worker Home (Swiggy-style) — green location header, dashed offer strip,
 * Blinkit category circles, money strip, restaurant-card job feed.
 * Same store logic: trust, availability, recommendations, checklist, AI tip.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { workerChecklist, workerNeedsOnboarding } from "@/services/onboarding";
import { careerSuggestion } from "@/services/professions";
import { CITIES, getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { toAppRoute } from "@/utils/routes";
import { Card } from "@/components/ui/Card";
import { TrustRing } from "@/components/ui/TrustRing";
import { DotText } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Icon } from "@/components/ui/Icon";
import { DashedDivider, OfferStrip, RatingPill } from "@/components/ui/Swiggy";
import { CitySheet } from "@/components/ui/CitySheet";
import { Fab } from "@/components/ui/Fab";
import { C, T, R, S, shadow } from "@/theme/tokens";
import type { Job } from "@/types";

type Match = ReturnType<typeof calculateMatchScore>;

/** Blinkit-style categories (icon per trade). */
const CATEGORIES: { value: string; label: string; icon: string; tone: "primary" | "blue" | "purple" | "green" | "amber" | "red" }[] = [
  { value: "all", label: "All", icon: "grid", tone: "primary" },
  { value: "Mason", label: "Mason", icon: "cube", tone: "blue" },
  { value: "Painter", label: "Painter", icon: "color-palette", tone: "purple" },
  { value: "Plumber", label: "Plumber", icon: "water", tone: "green" },
  { value: "Electrician", label: "Electrical", icon: "flash", tone: "amber" },
  { value: "Carpenter", label: "Carpenter", icon: "construct", tone: "red" },
];

export default function WorkerHome() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === s.currentUser?.id));
  const verifications = useStore((s) => s.verifications);
  const assessments = useStore((s) => s.assessments);
  const trustEvents = useStore((s) => s.trustEvents.filter((e) => e.userId === s.currentUser?.id));
  const contractorProfiles = useStore((s) => s.contractorProfiles);
  const contractorUsers = useStore((s) => s.users);
  const applications = useStore((s) => s.applications);
  const toggleAvailability = useStore((s) => s.toggleWorkerAvailability);
  const updateWorkerProfile = useStore((s) => s.updateWorkerProfile);
  const applyToJob = useStore((s) => s.applyToJob);
  const pushToast = useStore((s) => s.pushToast);
  const bootstrap = useStore((s) => s.bootstrap);
  const loading = useStore((s) => s.loading);

  const [cat, setCat] = useState("all");
  const [locOpen, setLocOpen] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const city = getCity(user?.location || "lucknow");
  const workerLocation = { latitude: city.latitude, longitude: city.longitude };

  const todaysIncome = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const next = new Date(start); next.setDate(start.getDate() + 1);
    return payments
      .filter((p) => p.status === "paid" && p.paidDate)
      .filter((p) => { const t = new Date(p.paidDate!); return t >= start && t < next; })
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const pendingTotal = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const activeApps = applications.filter((a) => a.workerId === user?.id && !["completed", "rejected"].includes(a.status)).length;

  const monthTrend = useMemo(() => {
    const snaps = trustEvents
      .filter((e) => /score updated/i.test(e.reason))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (!snaps.length || !profile) return undefined;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const before = snaps.filter((e) => new Date(e.createdAt) < monthStart);
    if (!before.length) return undefined;
    return profile.trustScore - before[before.length - 1].points;
  }, [trustEvents, profile]);

  const checklist = user && profile
    ? workerChecklist({ user, profile, verifications, assessments })
    : [];
  const checklistDone = checklist.filter((c) => c.done).length;

  const recommended = useMemo(() => {
    if (!profile) return [];
    const appliedIds = new Set(applications.filter((a) => a.workerId === profile.userId).map((a) => a.jobId));
    return jobs
      .filter((j) => !appliedIds.has(j.id))
      .filter((j) => cat === "all" || j.category === cat)
      .map((j) => {
        const contractor = contractorProfiles.find((c) => c.userId === j.contractorId);
        return calculateMatchScore(j, profile, contractor, workerLocation);
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
  }, [jobs, profile, contractorProfiles, workerLocation, applications, cat]);

  const careerTip = useMemo(() => {
    if (!profile || !user) return null;
    const sug = careerSuggestion({
      profession: profile.profession,
      experienceYears: profile.experienceYears,
      expectedDailyWage: profile.expectedDailyWage,
      cityId: user.location,
    });
    if (sug.underpaid) return `Market rate ${formatINR(sug.fairWage)}/day vs your ${formatINR(sug.currentWage)}/day — raise your wage.`;
    if (sug.nextProfession) return `Next step: ${sug.nextProfession}${sug.nextWage ? ` (est. ${formatINR(sug.nextWage)}/day)` : ""}.`;
    return "Your wage matches the market — keep building trust.";
  }, [profile, user]);

  async function changeCity(cityId: string) {
    if (!user) return;
    try {
      await updateWorkerProfile(user.id, { location: cityId });
      pushToast("success", `Location updated to ${getCity(cityId).name}`);
    } catch { /* store toasted */ }
  }

  async function quickApply(jobId: string) {
    setBusyJobId(jobId);
    try { await applyToJob(jobId); } finally { setBusyJobId(null); }
  }

  const needsOnboarding = !!user && !!profile && workerNeedsOnboarding(user, profile);

  useEffect(() => {
    if (needsOnboarding) router.replace("/(worker)/onboarding");
  }, [needsOnboarding]);

  if (!user || !profile) return null;
  if (needsOnboarding) return null;

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {/* ── Green location header (Swiggy) ── */}
        <View style={st.locBar}>
          <Pressable style={st.locLeft} onPress={() => setLocOpen(true)}>
            <Ionicons name="location" size={16} color={C.white} />
            <View style={{ flex: 1 }}>
              <Text style={st.locHome}>Home</Text>
              <Text style={st.locCity} numberOfLines={1}>{city.name} · {profile.profession}</Text>
            </View>
            <Ionicons name="chevron-down" size={15} color={C.white} />
          </Pressable>
          <Pressable onPress={() => router.push("/(worker)/trust")} style={st.trustBtn}>
            <Text style={st.trustNum}>{profile.trustScore}</Text>
            <Text style={st.trustLbl}>TRUST</Text>
          </Pressable>
        </View>

        {/* ── Availability chip row ── */}
        <Pressable onPress={() => toggleAvailability(user.id)} style={st.availRow}>
          <DotText
            text={profile.availability === "available" ? "Available for work" : "Working / Busy"}
            tone={profile.availability === "available" ? "green" : "amber"}
          />
          <Text style={st.availHint}>tap to change</Text>
          {monthTrend !== undefined && (
            <View style={st.trendRow}>
              <Ionicons name={monthTrend >= 0 ? "trending-up" : "trending-down"} size={13} color={monthTrend >= 0 ? C.green : C.red} />
              <Text style={[st.trendText, { color: monthTrend >= 0 ? C.green : C.red }]}>
                {Math.abs(monthTrend)} pts
              </Text>
            </View>
          )}
        </Pressable>

        {/* ── Money strip (Swiggy flat chips) ── */}
        <View style={st.moneyStrip}>
          <Pressable style={st.moneyCell} onPress={() => router.push("/(worker)/money")}>
            <Text style={st.moneyLbl}>Today</Text>
            <Text style={[st.moneyVal, { color: C.green }]}>{formatINR(todaysIncome)}</Text>
          </Pressable>
          <View style={st.moneySep} />
          <Pressable style={st.moneyCell} onPress={() => router.push("/(worker)/money")}>
            <Text style={st.moneyLbl}>Pending</Text>
            <Text style={[st.moneyVal, { color: C.amber }]}>{formatINR(pendingTotal)}</Text>
          </Pressable>
          <View style={st.moneySep} />
          <Pressable style={st.moneyCell} onPress={() => router.push("/(worker)/applications")}>
            <Text style={st.moneyLbl}>Applied</Text>
            <Text style={st.moneyVal}>{activeApps}</Text>
          </Pressable>
        </View>

        {/* ── Offer strip (AI tip) ── */}
        {careerTip && (
          <OfferStrip
            icon="sparkles"
            tone="purple"
            text={careerTip}
            onPress={() => router.push("/(worker)/career")}
          />
        )}

        {/* ── Category shelf (Blinkit circles) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.catScroll} contentContainerStyle={st.catRow}>
          {CATEGORIES.map((c) => (
            <CatCircle key={c.value} cat={c} active={cat === c.value} onPress={() => setCat(c.value)} />
          ))}
        </ScrollView>

        {/* ── Job feed (restaurant cards) ── */}
        <SectionHeader title={`${recommended.length} jobs for you`} action="See all" onAction={() => router.push("/(worker)/jobs")} />
        {recommended.length === 0 ? (
          <Card><Text style={st.emptyText}>No open jobs in this trade right now.</Text></Card>
        ) : (
          recommended.map((m, i) => (
            <JobCard
              key={m.job.id}
              match={m}
              contractorName={
                contractorProfiles.find((c) => c.userId === m.job.contractorId)?.companyName ?? "Contractor"
              }
              contractorRating={
                contractorProfiles.find((c) => c.userId === m.job.contractorId)?.rating ?? 0
              }
              isLast={i === recommended.length - 1}
              busy={busyJobId === m.job.id}
              onApply={() => quickApply(m.job.id)}
              onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: m.job.id } })}
            />
          ))
        )}

        {/* ── Profile completion (dashed card) ── */}
        {checklistDone < checklist.length && (
          <View style={st.progressCard}>
            <View style={st.progressTop}>
              <View style={{ flex: 1 }}>
                <Text style={st.progressTitle}>Complete your profile</Text>
                <Text style={st.progressSub}>{checklistDone} of {checklist.length} done — better matches</Text>
              </View>
              <Text style={st.progressPct}>{Math.round((checklistDone / checklist.length) * 100)}%</Text>
            </View>
            <ProgressBar value={(checklistDone / checklist.length) * 100} />
            <View style={{ marginTop: S.sm }}>
              {checklist.filter((c) => !c.done).slice(0, 3).map((c) => (
                <Pressable key={c.id} style={st.checkRow} onPress={() => router.push(toAppRoute(c.href) as never)}>
                  <Ionicons name="radio-button-off" size={17} color={C.text3} />
                  <Text style={st.checkText}>{c.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.text3} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* AI Sahayak floating button */}
      <Fab icon="chatbubble-ellipses" label="Sahayak" bottom={58} onPress={() => router.push("/(worker)/assistant")} />

      {/* Location change sheet */}
      <CitySheet
        open={locOpen}
        onClose={() => setLocOpen(false)}
        currentCityId={user.location || "lucknow"}
        onSelect={changeCity}
      />
    </SafeAreaView>
  );
}

/* ---------------- Swiggy restaurant-style job card ---------------- */

function JobCard({ match, contractorName, contractorRating, isLast, busy, onApply, onPress }: {
  match: Match;
  contractorName: string;
  contractorRating: number;
  isLast: boolean;
  busy?: boolean;
  onApply: () => void;
  onPress: () => void;
}) {
  const { job, matchScore, reasons, distanceKm } = match;
  const score = Math.round(matchScore);
  const tone = score >= 70 ? C.green : score >= 40 ? C.primary : C.text2;
  const toneSoft = score >= 70 ? C.greenSoft : score >= 40 ? C.primarySoft : C.muted;

  return (
    <Pressable style={st.jobCard} onPress={onPress}>
      {/* Header: wage (like price) + match pill */}
      <View style={st.jobTop}>
        <View style={{ flex: 1 }}>
          <Text style={st.jobWage}>
            {formatINR(job.wagePerDay)}
            <Text style={st.jobWageUnit}>/day</Text>
          </Text>
          <Text style={st.jobPay}>{job.paymentFrequency.replace("-", " ")} pay</Text>
        </View>
        <View style={[st.matchPill, { backgroundColor: toneSoft }]}>
          <Ionicons name="sparkles" size={12} color={tone} />
          <Text style={[st.matchText, { color: tone }]}>{score}% MATCH</Text>
        </View>
      </View>

      {/* Title + contractor */}
      <Text style={st.jobTitle} numberOfLines={1}>{job.title}</Text>
      <View style={st.jobMetaRow}>
        <Text style={st.jobMeta}>{contractorName}</Text>
        <RatingPill value={contractorRating} size="sm" />
      </View>

      {/* Dashed seam → meta row (Swiggy card footer) */}
      <DashedDivider style={{ marginVertical: S.sm }} />
      <View style={st.jobFoot}>
        <View style={st.footItem}>
          <Ionicons name="location-outline" size={13} color={C.text3} />
          <Text style={st.footText}>{job.location}{distanceKm > 0 ? ` · ${distanceKm} km` : ""}</Text>
        </View>
        <View style={st.footItem}>
          <Ionicons name="people-outline" size={13} color={C.text3} />
          <Text style={st.footText}>{job.workersHired}/{job.workersNeeded} hired</Text>
        </View>
        {reasons[0] ? (
          <View style={[st.footItem, { flex: 1 }]}>
            <Ionicons name="checkmark-circle" size={13} color={C.green} />
            <Text style={[st.footText, { color: C.text2 }]} numberOfLines={1}>{reasons[0]}</Text>
          </View>
        ) : null}
        <Pressable
          style={({ pressed }) => [st.applyPill, (busy || pressed) && { opacity: 0.75 }]}
          onPress={onApply}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={C.white} />
          ) : (
            <>
              <Text style={st.applyText}>APPLY</Text>
              <Ionicons name="arrow-forward" size={12} color={C.white} />
            </>
          )}
        </Pressable>
      </View>
      {!isLast ? <View style={st.cardGap} /> : null}
    </Pressable>
  );
}

/* Small local category circle (active states matter here). */
function CatCircle({ cat, active, onPress }: {
  cat: typeof CATEGORIES[number];
  active: boolean;
  onPress: () => void;
}) {
  const fg = cat.tone === "primary" ? C.primary : cat.tone === "blue" ? C.blue : cat.tone === "purple" ? C.purple : cat.tone === "green" ? C.green : cat.tone === "amber" ? C.amber : C.red;
  const bg = cat.tone === "primary" ? C.primarySoft : cat.tone === "blue" ? C.blueSoft : cat.tone === "purple" ? C.purpleSoft : cat.tone === "green" ? C.greenSoft : cat.tone === "amber" ? C.amberSoft : C.redSoft;
  return (
    <Pressable onPress={onPress} style={st.catWrap}>
      <View style={[st.catCircle, { backgroundColor: active ? fg : bg, borderColor: fg + "35" }]}>
        <Ionicons name={cat.icon as never} size={21} color={active ? C.white : fg} />
      </View>
      <Text style={[st.catLabel, active && { color: C.text, fontWeight: "700" }]} numberOfLines={1}>{cat.label}</Text>
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
  trustBtn: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.xs },
  trustNum: { color: C.white, fontSize: T.body + 1, fontWeight: "900" },
  trustLbl: { color: "rgba(255,255,255,0.8)", fontSize: 8.5, fontWeight: "800", letterSpacing: 0.8 },

  availRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginHorizontal: -S.xs },
  availHint: { fontSize: T.tiny, color: C.text3, fontWeight: "600" },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" },
  trendText: { fontSize: T.tiny, fontWeight: "800" },

  /* money strip */
  moneyStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingVertical: S.md,
    ...shadow,
  },
  moneyCell: { flex: 1, alignItems: "center", gap: 1 },
  moneySep: { width: 1, height: 30, backgroundColor: C.hairline },
  moneyLbl: { fontSize: T.tiny, color: C.text3, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  moneyVal: { fontSize: T.body + 1, fontWeight: "800", color: C.text },

  /* categories */
  catScroll: { flexGrow: 0, marginHorizontal: -S.lg },
  catRow: { paddingHorizontal: S.lg, gap: S.sm },
  catWrap: { alignItems: "center", width: 68, gap: S.xs },
  catCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  catLabel: { fontSize: T.tiny, color: C.text2, fontWeight: "600" },

  /* job card */
  jobCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    ...shadow,
  },
  jobTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: S.md },
  jobWage: { fontSize: T.title + 2, fontWeight: "900", color: C.text },
  jobWageUnit: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  jobPay: { fontSize: T.tiny, color: C.text3, fontWeight: "600", marginTop: 1, textTransform: "capitalize" },
  matchPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4,
  },
  matchText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  jobTitle: { fontSize: T.body + 1, fontWeight: "700", color: C.text, marginTop: S.sm },
  jobMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: S.md, marginTop: 2 },
  jobMeta: { fontSize: T.caption, color: C.text2, fontWeight: "500" },
  jobFoot: { flexDirection: "row", alignItems: "center", gap: S.md, flexWrap: "wrap" },
  footItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footText: { fontSize: T.tiny, color: C.text3, fontWeight: "600" },
  applyPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: S.md + 2, paddingVertical: 7,
    marginLeft: "auto",
  },
  applyText: { fontSize: 10.5, fontWeight: "900", color: C.white, letterSpacing: 0.6 },
  cardGap: { height: S.md },

  /* progress card */
  progressCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.hairline,
  },
  progressTop: { flexDirection: "row", alignItems: "center", marginBottom: S.sm },
  progressTitle: { fontSize: T.body, fontWeight: "700", color: C.text },
  progressSub: { fontSize: T.tiny, color: C.text3, marginTop: 1 },
  progressPct: { fontSize: T.body + 2, fontWeight: "900", color: C.primary },
  checkRow: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    paddingVertical: S.xs + 2,
  },
  checkText: { flex: 1, fontSize: T.caption, color: C.text2, fontWeight: "500" },
  emptyText: { color: C.text2, fontSize: T.body, lineHeight: 22, textAlign: "center", paddingVertical: S.md },
});
