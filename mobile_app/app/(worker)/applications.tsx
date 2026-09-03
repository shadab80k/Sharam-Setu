/**
 * My Applications — status timeline for every job the worker applied to.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { SkeletonRow } from "@/components/ui/Avatar";
import { C, T, R, S } from "@/theme/tokens";

const STATUS_STEPS = ["applied", "viewed", "shortlisted", "interview", "selected", "completed"];

export default function WorkerApplications() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const applications = useStore((s) => s.applications.filter((a) => a.workerId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs);
  const loading = useStore((s) => s.loading);

  if (!user) return null;

  // Latest first
  const sorted = [...applications].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.title}>My Applications</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && sorted.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>📋</Text>}
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
                  <View style={styles.timeline}>
                    {STATUS_STEPS.map((st, i) => {
                      const done = i <= stepIdx;
                      return (
                        <View key={st} style={styles.tlStep}>
                          <View style={[styles.tlDot, done && { backgroundColor: C.green600 }]} />
                          {i < STATUS_STEPS.length - 1 && (
                            <View style={[styles.tlBar, i < stepIdx && { backgroundColor: C.green600 }]} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                {a.matchReasons.length > 0 && (
                  <Text style={styles.reasons} numberOfLines={2}>💡 {a.matchReasons.join(" · ")}</Text>
                )}
                <Pressable onPress={() => router.push({ pathname: "/(worker)/jobs/[id]", params: { id: a.jobId } })}>
                  <Text style={styles.viewJob}>View job ›</Text>
                </Pressable>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  timeline: { flexDirection: "row", alignItems: "center", marginVertical: S.md },
  tlStep: { flex: 1, flexDirection: "row", alignItems: "center" },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.gray200 },
  tlBar: { flex: 1, height: 3, backgroundColor: C.gray200, marginHorizontal: 2 },
  reasons: { fontSize: T.xs, color: C.gray600, marginBottom: S.sm },
  viewJob: { color: C.orange600, fontSize: T.sm, fontWeight: "800" },
});
