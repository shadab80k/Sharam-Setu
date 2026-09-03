/**
 * Contractor Reviews (V3) — pending-review ListRows, star-pickers ×4 Sheet,
 * employer rating hero, given-ratings distribution bars.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field, TextArea } from "@/components/ui/Field";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";
import type { Application } from "@/types";

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name={i <= n ? "star" : "star-outline"}
          size={size}
          color={C.amber}
        />
      ))}
    </View>
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
    <View style={st.starRow}>
      <Text style={st.starLabel}>{label}</Text>
      <PressableStarRow value={form[key]} onChange={(n) => setForm({ ...form, [key]: n })} />
    </View>
  );

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        <Text style={st.title}>Reviews</Text>
        <Text style={st.sub}>Rate your workers and see your reputation</Text>

        {/* Pending reviews */}
        <Card>
          <CardHeader title="Workers to review" subtitle="Completed jobs awaiting your rating" />
          {pendingReview.length === 0 ? (
            <Text style={st.body}>Nothing pending — reviews you give build your employer reputation too.</Text>
          ) : (
            <View>
              {pendingReview.map((a, i) => {
                const w = users.find((u) => u.id === a.workerId);
                const job = myJobs.find((j) => j.id === a.jobId);
                if (!w) return null;
                return (
                  <ListRow
                    key={a.id}
                    avatar={{ src: w.avatar, name: w.name }}
                    title={w.name}
                    sub={job?.title}
                    trailing={<Button label="Review" size="sm" onPress={() => setTarget(a)} />}
                    divider={i < pendingReview.length - 1}
                  />
                );
              })}
            </View>
          )}
        </Card>

        {/* My rating (from workers) */}
        <Card>
          <CardHeader title="Your employer rating" subtitle="What workers say about you" />
          <View style={st.ratingHero}>
            <Text style={st.ratingNum}>{(profile?.rating ?? 0).toFixed(1)}</Text>
            <Stars n={Math.round(profile?.rating ?? 0)} size={19} />
            <Text style={st.ratingCount}>{receivedReviews.length} review{receivedReviews.length === 1 ? "" : "s"}</Text>
          </View>
          {receivedReviews.slice(0, 5).map((r) => {
            const w = users.find((u) => u.id === r.reviewerId);
            return (
              <View key={r.id} style={st.reviewRow}>
                <Text style={st.reviewName}>{w?.name ?? "Worker"}</Text>
                <Stars n={r.rating} />
                {r.comment ? <Text style={st.reviewComment}>{r.comment}</Text> : null}
                <Text style={st.reviewDate}>{formatDate(r.createdAt)}</Text>
              </View>
            );
          })}
        </Card>

        {/* Given distribution */}
        <Card style={{ marginBottom: S.xl }}>
          <CardHeader title="Your given ratings" subtitle={`${myReviews.length} review${myReviews.length === 1 ? "" : "s"} by you`} />
          {myReviews.length === 0 ? (
            <Text style={st.body}>No reviews given yet.</Text>
          ) : (
            ratingDist.map((d) => (
              <View key={d.star} style={st.distRow}>
                <Stars n={d.star} size={12} />
                <View style={{ flex: 1 }}>
                  <ProgressBar value={(d.count / maxDist) * 100} height={6} tone={C.amber} />
                </View>
                <Text style={st.distCount}>{d.count}</Text>
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
        <TextArea
          label="Comment (optional)"
          value={form.comment}
          onChangeText={(v: string) => setForm({ ...form, comment: v })}
          placeholder="Great work, on time every day…"
        />
        <Button label="Submit Review" onPress={submit} fullWidth />
      </Sheet>
    </SafeAreaView>
  );
}

function PressableStarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={st.pressRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} style={st.pressStar}>
          <Icon name={n <= value ? "star" : "star-outline"} size={26} color={n <= value ? C.amber : C.text3} />
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl, gap: S.md },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption + 1, color: C.text2, marginTop: 2 },
  body: { fontSize: T.caption + 1, color: C.text2, lineHeight: 21 },
  ratingHero: { alignItems: "center", gap: S.xs, paddingVertical: S.md },
  ratingNum: { fontSize: T.title + 6, fontWeight: "800", color: C.text },
  ratingCount: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  reviewRow: { paddingVertical: S.sm, gap: 3, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairline, marginTop: S.sm },
  reviewName: { fontSize: T.caption + 1, fontWeight: "700", color: C.text },
  reviewComment: { fontSize: T.caption, color: C.text2, lineHeight: 18 },
  reviewDate: { fontSize: T.tiny, color: C.text3, marginTop: 2 },
  distRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.xs },
  distCount: { fontSize: T.tiny, color: C.text2, fontWeight: "700", width: 20, textAlign: "right" },
  starRow: { marginBottom: S.lg, gap: S.xs },
  starLabel: { fontSize: T.caption + 1, fontWeight: "700", color: C.text },
  pressRow: { flexDirection: "row", gap: S.sm },
  pressStar: {},
});
