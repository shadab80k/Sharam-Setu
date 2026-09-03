/**
 * Contractor Reviews — rate completed workers (rating + reliability/skill/safety),
 * see given & received reviews with rating distribution.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet, EmptyState, ProgressBar } from "@/components/ui/Feedback";
import { Chip, Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { C, T, R, S } from "@/theme/tokens";
import type { Application } from "@/types";

function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: C.amber500 }}>
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </Text>
  );
}

export default function ContractorReviews() {
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === s.currentUser?.id));
  const myJobs = useStore((s) => s.jobs.filter((j) => j.contractorId === s.currentUser?.id));
  const jobIds = useMemo(() => new Set(myJobs.map((j) => j.id)), [myJobs]);
  const myApps = useStore((s) => s.applications.filter((a) => jobIds.has(a.jobId)));
  const reviews = useStore((s) => s.reviews);
  const users = useStore((s) => s.users);
  const reviewWorker = useStore((s) => s.reviewWorker);

  const [target, setTarget] = useState<Application | null>(null);
  const [form, setForm] = useState({ rating: 5, reliability: 5, skill: 5, safety: 5, comment: "" });

  const completed = myApps.filter((a) => a.status === "completed");
  const pendingReview = completed.filter(
    (a) => !reviews.some((r) => r.reviewerId === user?.id && r.jobId === a.jobId && r.revieweeId === a.workerId)
  );
  const myReviews = reviews.filter((r) => r.reviewerId === user?.id);
  const receivedReviews = reviews.filter((r) => r.revieweeId === user?.id);

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: myReviews.filter((r) => r.rating === star).length,
  }));
  const maxDist = Math.max(1, ...ratingDist.map((d) => d.count));

  function submit() {
    if (!target || !user) return;
    reviewWorker({
      reviewerId: user.id,
      revieweeId: target.workerId,
      jobId: target.jobId,
      rating: form.rating,
      comment: form.comment,
      reliability: form.reliability,
      skill: form.skill,
      safety: form.safety,
    });
    setTarget(null);
    setForm({ rating: 5, reliability: 5, skill: 5, safety: 5, comment: "" });
  }

  const starRow = (key: "rating" | "reliability" | "skill" | "safety", label: string) => (
    <View style={styles.starRow}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.chipWrap}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} label={"★".repeat(n)} active={form[key] === n} onPress={() => setForm({ ...form, [key]: n })} small />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Reviews</Text>
        <Text style={styles.sub}>Rate your workers and see your reputation</Text>

        {/* Pending reviews */}
        <Card>
          <CardHeader title="Workers to review" subtitle="Completed jobs awaiting your rating" />
          {pendingReview.length === 0 ? (
            <Text style={styles.body}>Nothing pending — reviews you give build your employer reputation too.</Text>
          ) : (
            pendingReview.map((a) => {
              const w = users.find((u) => u.id === a.workerId);
              const job = myJobs.find((j) => j.id === a.jobId);
              if (!w) return null;
              return (
                <View key={a.id} style={styles.pendingRow}>
                  <Avatar src={w.avatar} name={w.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>{w.name}</Text>
                    <Text style={styles.pendingJob} numberOfLines={1}>{job?.title}</Text>
                  </View>
                  <Button
                    label="Review"
                    size="sm"
                    onPress={() => setTarget(a)}
                  />
                </View>
              );
            })
          )}
        </Card>

        {/* My rating (from workers) */}
        <Card>
          <CardHeader title="Your employer rating" subtitle="What workers say about you" />
          <View style={styles.ratingHero}>
            <Text style={styles.ratingNum}>{(profile?.rating ?? 0).toFixed(1)}</Text>
            <Stars n={Math.round(profile?.rating ?? 0)} size={20} />
            <Text style={styles.ratingCount}>{receivedReviews.length} review{receivedReviews.length === 1 ? "" : "s"}</Text>
          </View>
          {receivedReviews.slice(0, 5).map((r) => {
            const w = users.find((u) => u.id === r.reviewerId);
            return (
              <View key={r.id} style={styles.reviewRow}>
                <Text style={styles.reviewName}>{w?.name ?? "Worker"}</Text>
                <Stars n={r.rating} />
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
              </View>
            );
          })}
        </Card>

        {/* Given distribution */}
        <Card>
          <CardHeader title="Your given ratings" subtitle={`${myReviews.length} review${myReviews.length === 1 ? "" : "s"} by you`} />
          {myReviews.length === 0 ? (
            <Text style={styles.body}>No reviews given yet.</Text>
          ) : (
            ratingDist.map((d) => (
              <View key={d.star} style={styles.distRow}>
                <Stars n={d.star} size={13} />
                <View style={{ flex: 1 }}>
                  <ProgressBar value={(d.count / maxDist) * 100} height={6} tone={C.amber500} />
                </View>
                <Text style={styles.distCount}>{d.count}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Review sheet */}
      <Sheet open={!!target} onClose={() => setTarget(null)} title={`Review ${users.find((u) => u.id === target?.workerId)?.name ?? "worker"}`}>
        {starRow("rating", "Overall rating")}
        {starRow("reliability", "Reliability")}
        {starRow("skill", "Skill")}
        {starRow("safety", "Safety")}
        <Input
          label="Comment (optional)"
          value={form.comment}
          onChangeText={(v) => setForm({ ...form, comment: v })}
          multiline
          placeholder="Great work, on time every day…"
          style={{ height: 80, textAlignVertical: "top" }}
        />
        <Button label="Submit Review" onPress={submit} fullWidth />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl, gap: S.lg },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.sm, color: C.gray500, marginTop: 2 },
  body: { fontSize: T.sm, color: C.gray600, lineHeight: 20 },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
  pendingName: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  pendingJob: { fontSize: T.xs, color: C.gray500, marginTop: 1 },
  ratingHero: { alignItems: "center", gap: S.xs, paddingVertical: S.md },
  ratingNum: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  ratingCount: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  reviewRow: { paddingVertical: S.sm, gap: 2, borderTopWidth: 1, borderTopColor: C.gray100, marginTop: S.sm },
  reviewName: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  reviewComment: { fontSize: T.xs, color: C.gray600, lineHeight: 17 },
  reviewDate: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  distRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.xs },
  distCount: { fontSize: T.xs, color: C.gray600, fontWeight: "700", width: 20, textAlign: "right" },
  starRow: { marginBottom: S.lg },
  starLabel: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
});
