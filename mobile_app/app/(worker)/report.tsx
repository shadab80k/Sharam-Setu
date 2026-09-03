/**
 * Report a Safety Issue — category, severity, description.
 * Uses POST /api/reports (same as web).
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Input, Chip } from "@/components/ui/Input";
import { C, T, R, S } from "@/theme/tokens";
import type { ReportCategory, ReportSeverity } from "@/types";

const CATEGORIES: { value: ReportCategory; label: string; emoji: string }[] = [
  { value: "unsafe-workplace", label: "Unsafe workplace", emoji: "⚠️" },
  { value: "payment-dispute", label: "Payment dispute", emoji: "💰" },
  { value: "fake-job", label: "Fake job", emoji: "🚫" },
  { value: "fake-worker", label: "Fake worker", emoji: "🧍" },
  { value: "harassment", label: "Harassment", emoji: "🚨" },
  { value: "fraud", label: "Fraud", emoji: "🎭" },
  { value: "other", label: "Other", emoji: "📦" },
];

const SEVERITIES: { value: ReportSeverity; label: string; tone: string }[] = [
  { value: "low", label: "Low", tone: C.gray600 },
  { value: "medium", label: "Medium", tone: C.amber500 },
  { value: "high", label: "High", tone: C.orange600 },
  { value: "critical", label: "Critical", tone: C.red600 },
];

export default function WorkerReport() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const jobs = useStore((s) => s.jobs);
  const users = useStore((s) => s.users);
  const submitReport = useStore((s) => s.submitReport);

  const [category, setCategory] = useState<ReportCategory>("unsafe-workplace");
  const [severity, setSeverity] = useState<ReportSeverity>("medium");
  const [description, setDescription] = useState("");
  const [jobId, setJobId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const myJobs = jobs.filter((j) => j.contractorId);
  const contractors = users.filter((u) => u.role === "contractor");

  async function submit() {
    if (description.trim().length < 10) return;
    setBusy(true);
    try {
      await submitReport({
        targetUserId: targetUserId || undefined,
        jobId: jobId || undefined,
        category,
        severity,
        description: description.trim(),
      });
      router.back();
    } catch { /* toast shown by store */ } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.title}>Report an Issue</Text>
        <Text style={styles.sub}>
          Your report is confidential. Admin reviews every report, and false reports reduce your trust score.
        </Text>

        <Text style={styles.label}>What happened?</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c.value} label={`${c.emoji} ${c.label}`} active={category === c.value} onPress={() => setCategory(c.value)} small />
          ))}
        </View>

        <Text style={styles.label}>How serious is it?</Text>
        <View style={styles.chipWrap}>
          {SEVERITIES.map((s) => (
            <Chip key={s.value} label={s.label} active={severity === s.value} onPress={() => setSeverity(s.value)} small />
          ))}
        </View>

        <Input
          label="Describe the issue (min 10 characters)"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Tell us what happened…"
          style={{ height: 110, textAlignVertical: "top" }}
        />

        <Text style={styles.label}>Related job (optional)</Text>
        <View style={styles.chipWrap}>
          <Chip label="None" active={jobId === ""} onPress={() => setJobId("")} small />
          {myJobs.slice(0, 8).map((j) => (
            <Chip key={j.id} label={j.title} active={jobId === j.id} onPress={() => setJobId(j.id)} small />
          ))}
        </View>

        <Text style={styles.label}>About a contractor? (optional)</Text>
        <View style={styles.chipWrap}>
          <Chip label="None" active={targetUserId === ""} onPress={() => setTargetUserId("")} small />
          {contractors.slice(0, 8).map((c) => (
            <Chip key={c.id} label={c.name} active={targetUserId === c.id} onPress={() => setTargetUserId(c.id)} small />
          ))}
        </View>

        <Button
          label="Submit Report"
          onPress={submit}
          loading={busy}
          disabled={description.trim().length < 10}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl, gap: S.md },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900, marginTop: S.sm },
  sub: { fontSize: T.sm, color: C.gray500, lineHeight: 19, marginBottom: S.md },
  label: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginTop: S.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
});
