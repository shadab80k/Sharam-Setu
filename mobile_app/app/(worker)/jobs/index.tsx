/**
 * Worker Jobs (Swiggy-style) — pill search bar, Blinkit category circles,
 * restaurant-card feed with wage-first cards, match pills, dashed seams,
 * Applied/Saved states. Same match logic.
 */
import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, TextInput, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/store";
import { calculateMatchScore } from "@/services/jobMatching";
import { CITIES, getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRow } from "@/components/ui/Avatar";
import { DashedDivider } from "@/components/ui/Swiggy";
import { C, T, R, S, shadow } from "@/theme/tokens";
import type { Job } from "@/types";

const CATEGORIES: { value: string; label: string; icon: string; tone: "primary" | "blue" | "purple" | "green" | "amber" | "red" }[] = [
  { value: "all", label: "All", icon: "grid", tone: "primary" },
  { value: "Mason", label: "Mason", icon: "cube", tone: "blue" },
  { value: "Painter", label: "Painter", icon: "color-palette", tone: "purple" },
  { value: "Plumber", label: "Plumber", icon: "water", tone: "green" },
  { value: "Electrician", label: "Electrical", icon: "flash", tone: "amber" },
  { value: "Carpenter", label: "Carpenter", icon: "construct", tone: "red" },
];

const TONE_FG: Record<string, string> = {
  primary: C.primary, blue: C.blue, purple: C.purple, green: C.green, amber: C.amber, red: C.red,
};
const TONE_BG: Record<string, string> = {
  primary: C.primarySoft, blue: C.blueSoft, purple: C.purpleSoft, green: C.greenSoft, amber: C.amberSoft, red: C.redSoft,
};

export default function WorkerJobs() {
  const router = useRouter();
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs);
  const contractorProfiles = useStore((s) => s.contractorProfiles);
  const applications = useStore((s) => s.applications);
  const savedJobIds = useStore((s) => s.savedJobIds);
  const user = useStore((s) => s.currentUser);
  const loading = useStore((s) => s.loading);
  const bootstrap = useStore((s) => s.bootstrap);
  const applyToJob = useStore((s) => s.applyToJob);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showSaved, setShowSaved] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const city = getCity(user?.location || "lucknow");
  const workerLocation = { latitude: city.latitude, longitude: city.longitude };

  const appliedIds = useMemo(
    () => new Set(applications.filter((a) => a.workerId === user?.id).map((a) => a.jobId)),
    [applications, user]
  );

  const feed = useMemo(() => {
    if (!profile) return [] as { job: Job; matchScore: number; reasons: string[]; distanceKm: number }[];
    let list = showSaved
      ? jobs.filter((j) => savedJobIds.includes(j.id))
      : jobs.filter((j) => j.status === "active" || savedJobIds.includes(j.id));
    if (category !== "all" && !showSaved) list = list.filter((j) => j.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((j) =>
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    return list
      .map((j) => {
        const contractor = contractorProfiles.find((c) => c.userId === j.contractorId);
        return calculateMatchScore(j, profile, contractor, workerLocation);
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs, profile, contractorProfiles, workerLocation, category, query, savedJobIds, showSaved]);

  const savedCount = savedJobIds.length;

  async function quickApply(jobId: string) {
    setBusyJobId(jobId);
    try { await applyToJob(jobId); } finally { setBusyJobId(null); }
  }

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      {/* ── Search (Swiggy pill) ── */}
      <View style={st.searchWrap}>
        <View style={st.searchBar}>
          <Ionicons name="search" size={17} color={C.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search jobs, skills, city…"
            placeholderTextColor={C.text3}
            style={st.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close" size={16} color={C.text3} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ── Category circles (Blinket shelf) ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.catScroll} contentContainerStyle={st.catRow}>
        {CATEGORIES.map((c) => (
          <Pressable key={c.value} style={st.catWrap} onPress={() => setCategory(c.value)}>
            <View style={[st.catCircle, { backgroundColor: category === c.value ? TONE_FG[c.tone] : TONE_BG[c.tone], borderColor: TONE_FG[c.tone] + "35" }]}>
              <Ionicons name={c.icon as never} size={21} color={category === c.value ? C.white : TONE_FG[c.tone]} />
            </View>
            <Text style={[st.catLabel, category === c.value && { color: C.text, fontWeight: "700" }]} numberOfLines={1}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Saved chip row ── */}
      <View style={st.chipRow}>
        <Text style={st.resultCount}>
          {showSaved ? `${feed.length} saved jobs` : category === "all" && !query ? `${feed.length} open jobs` : `${feed.length} results`}
        </Text>
        <Pressable
          style={({ pressed }) => [st.savedChip, showSaved && st.savedChipActive, pressed && { opacity: 0.75 }]}
          onPress={() => setShowSaved((v) => !v)}
        >
          <Ionicons name={showSaved ? "bookmark" : "bookmark-outline"} size={13} color={showSaved ? C.primary : C.text3} />
          <Text style={showSaved ? st.savedActive : st.savedText}>{savedCount} saved</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && feed.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : feed.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            tone="primary"
            message="No open jobs right now.\nCheck back soon!"
          />
        ) : (
          feed.map((m) => {
            const applied = appliedIds.has(m.job.id);
            const saved = savedJobIds.includes(m.job.id);
            return (
              <JobCard
                key={m.job.id}
                job={m.job}
                contractor={
                  contractorProfiles.find((c) => c.userId === m.job.contractorId) ?? null
                }
                matchScore={m.matchScore}
                reasons={m.reasons}
                distanceKm={m.distanceKm}
                applied={applied}
                saved={saved}
                busy={busyJobId === m.job.id}
                onApply={() => quickApply(m.job.id)}
                onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: m.job.id } })}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Swiggy restaurant-style job card ---------------- */

function JobCard({
  job, contractor, matchScore, reasons, distanceKm, applied, saved, busy, onApply, onPress,
}: {
  job: Job;
  contractor: { companyName: string; rating: number; trustScore: number } | null;
  matchScore: number;
  reasons: string[];
  distanceKm: number;
  applied: boolean;
  saved: boolean;
  busy?: boolean;
  onApply: () => void;
  onPress: () => void;
}) {
  const score = Math.round(matchScore);
  const tone = score >= 70 ? C.green : score >= 40 ? C.primary : C.text2;
  const toneSoft = score >= 70 ? C.greenSoft : score >= 40 ? C.primarySoft : C.muted;

  return (
    <Pressable style={st.card} onPress={onPress}>
      {/* Top row: wage (price-first) + match pill */}
      <View style={st.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={st.wage}>
            {formatINR(job.wagePerDay)}
            <Text style={st.wageUnit}>/day</Text>
          </Text>
          <Text style={st.payFreq}>{job.paymentFrequency.replace("-", " ")} pay</Text>
        </View>
        <View style={[st.matchPill, { backgroundColor: toneSoft }]}>
          <Ionicons name="sparkles" size={12} color={tone} />
          <Text style={[st.matchText, { color: tone }]}>{score}% MATCH</Text>
        </View>
      </View>

      {/* Title + contractor + rating */}
      <Text style={st.title} numberOfLines={1}>{job.title}</Text>
      <View style={st.metaRow}>
        {contractor ? (
          <>
            <Text style={st.contractorName} numberOfLines={1}>{contractor.companyName}</Text>
            {contractor.rating > 0 ? (
              <View style={st.ratingPill}>
                <Text style={st.ratingText}>{contractor.rating.toFixed(1)}</Text>
                <Ionicons name="star" size={9} color={C.white} />
              </View>
            ) : null}
          </>
        ) : (
          <Text style={st.contractorName}>{job.category}</Text>
        )}
      </View>

      {/* Dashed seam → footer */}
      <DashedDivider style={{ marginVertical: S.sm }} />
      <View style={st.cardFoot}>
        <View style={st.footItem}>
          <Ionicons name="location-outline" size={13} color={C.text3} />
          <Text style={st.footText}>{job.location}{distanceKm > 0 ? ` · ${distanceKm} km` : ""}</Text>
        </View>
        <View style={st.footItem}>
          <Ionicons name="people-outline" size={13} color={C.text3} />
          <Text style={st.footText}>{job.workersHired}/{job.workersNeeded} hired</Text>
        </View>
        {saved && !applied ? (
          <View style={[st.footItem, { marginLeft: "auto" }]}>
            <Ionicons name="bookmark" size={13} color={C.blue} />
          </View>
        ) : null}
        <View style={[st.footItem, { marginLeft: "auto" }]}>
          {applied ? (
            <View style={[st.statePill, { backgroundColor: C.greenSoft }]}>
              <Ionicons name="checkmark" size={11} color={C.green} />
              <Text style={[st.stateText, { color: C.green }]}>APPLIED</Text>
            </View>
          ) : (
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
          )}
        </View>
      </View>
      {reasons[0] ? (
        <View style={[st.footItem, { marginTop: S.xs }]}>
          <Ionicons name="checkmark-circle" size={13} color={C.green} />
          <Text style={[st.footText, { color: C.text2 }]} numberOfLines={1}>{reasons[0]}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  searchWrap: { paddingHorizontal: S.lg, paddingTop: S.md, paddingBottom: S.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.muted,
    borderRadius: R.pill,
    paddingHorizontal: S.lg,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: T.body, color: C.text, paddingVertical: 0 },
  catScroll: { flexGrow: 0, marginHorizontal: -S.lg },
  catRow: { paddingHorizontal: S.lg, gap: S.sm },
  catWrap: { alignItems: "center", width: 68, gap: S.xs },
  catCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  catLabel: { fontSize: T.tiny, color: C.text2, fontWeight: "600" },
  chipRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingBottom: S.sm,
  },
  resultCount: { fontSize: T.caption + 1, fontWeight: "800", color: C.text },
  savedChip: { flexDirection: "row", alignItems: "center", gap: S.xs, backgroundColor: C.muted, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 5 },
  savedText: { fontSize: T.tiny, fontWeight: "700", color: C.text2 },
  savedChipActive: { backgroundColor: C.primarySoft },
  savedActive: { fontSize: T.tiny, fontWeight: "700", color: C.primary },
  scroll: { padding: S.lg, paddingTop: S.xs, paddingBottom: S.xxxl, gap: S.md },

  /* card */
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    ...shadow,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: S.md },
  wage: { fontSize: T.title + 2, fontWeight: "900", color: C.text },
  wageUnit: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  payFreq: { fontSize: T.tiny, color: C.text3, fontWeight: "600", marginTop: 1, textTransform: "capitalize" },
  matchPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4,
  },
  matchText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  title: { fontSize: T.body + 1, fontWeight: "700", color: C.text, marginTop: S.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: 3 },
  contractorName: { fontSize: T.caption, color: C.text2, fontWeight: "500", flexShrink: 1 },
  ratingPill: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: C.green, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { color: C.white, fontSize: T.tiny, fontWeight: "800" },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: S.md, flexWrap: "wrap" },
  footItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footText: { fontSize: T.tiny, color: C.text3, fontWeight: "600" },
  statePill: {
    borderRadius: R.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  stateText: { fontSize: 9.5, fontWeight: "900", letterSpacing: 0.5 },
  applyPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: S.md + 2, paddingVertical: 7,
  },
  applyText: { fontSize: 10.5, fontWeight: "900", color: C.white, letterSpacing: 0.6 },
});
