/**
 * My Applications (V3) — status timeline dots for every applied job.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRow } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";

const STATUS_STEPS = ["applied", "viewed", "shortlisted", "interview", "selected", "completed"];

export default function WorkerApplications() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const applications = useStore((s) => s.applications.filter((a) => a.workerId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs);
  const loading = useStore((s) => s.loading);

  if (!user) return null;

  const sorted = [...applications].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={st.title}>My Applications</Text>
      </View>
      <ScrollView contentContainerStyle={st.scroll}>
        {loading && sorted.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="documents-outline"
            tone="blue"
            message="You haven't applied to any jobs yet."
            ctaLabel="Find Jobs"
            onCta={() => router.push("/(worker)/jobs")}
          />
        ) : (
          sorted.map((a) => {
            const job = jobs.find((j) => j.id === a.jobId);
            const stepIdx = STATUS_STEPS.indexOf(a.status);
            return (
              <Card key={a.id}>
                <CardHeader
                  title={job?.title ?? "Job"}
                  subtitle={`Applied ${formatDate(a.appliedAt)} · Match ${Math.round(a.matchScore)}%`}
                  right={<StatusBadge status={a.status} />}
                />
                {a.status !== "rejected" && (
                  <View style={st.timeline}>
                    {STATUS_STEPS.map((s2, i) => {
                      const done = i <= stepIdx;
                      return (
                        <View key={s2} style={st.tlStep}>
                          <View style={[st.tlDot, done && { backgroundColor: C.primary }]} />
                          {i < STATUS_STEPS.length - 1 && (
                            <View style={[st.tlBar, i < stepIdx && { backgroundColor: C.primary }]} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                {a.matchReasons.length > 0 && (
                  <View style={st.reasons}>
                    <Icon name="sparkles" size={13} color={C.purple} />
                    <Text style={st.reasonsText} numberOfLines={2}>{a.matchReasons.join(" · ")}</Text>
                  </View>
                )}
                <Pressable onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: a.jobId } })} hitSlop={8}>
                  <Text style={st.viewJob}>View job</Text>
                </Pressable>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  backBtn: { width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: T.title + 2, fontWeight: "800", color: C.text },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  timeline: { flexDirection: "row", alignItems: "center", marginVertical: S.md },
  tlStep: { flex: 1, flexDirection: "row", alignItems: "center" },
  tlDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: C.muted },
  tlBar: { flex: 1, height: 3, backgroundColor: C.muted, marginHorizontal: 2 },
  reasons: { flexDirection: "row", gap: S.xs + 2, alignItems: "center", marginBottom: S.sm },
  reasonsText: { fontSize: T.tiny, color: C.text2, flex: 1, lineHeight: 16 },
  viewJob: { color: C.primary, fontSize: T.caption + 1, fontWeight: "800" },
});
