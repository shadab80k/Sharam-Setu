/**
 * Report a Safety Issue (V3) — category/severity Pickers + TextArea,
 * optional job/contractor chips. Same POST /api/reports contract.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chips";
import { Field, TextArea } from "@/components/ui/Field";
import { Picker } from "@/components/ui/Picker";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";
import type { ReportCategory, ReportSeverity } from "@/types";

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "unsafe-workplace", label: "Unsafe workplace" },
  { value: "payment-dispute", label: "Payment dispute" },
  { value: "fake-job", label: "Fake job" },
  { value: "fake-worker", label: "Fake worker" },
  { value: "harassment", label: "Harassment" },
  { value: "fraud", label: "Fraud" },
  { value: "other", label: "Other" },
];

const SEVERITIES: ReportSeverity[] = ["low", "medium", "high", "critical"];

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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <View style={st.titleRow}>
          <View style={st.titleIcon}>
            <Icon name="shield-outline" size={22} color={C.red} />
          </View>
          <Text style={st.title}>Report an Issue</Text>
        </View>
        <Text style={st.sub}>
          Your report is confidential. Admin reviews every report, and false reports reduce your trust score.
        </Text>

        <Picker
          label="What happened?"
          value={CATEGORIES.find((c) => c.value === category)?.label ?? ""}
          options={CATEGORIES.map((c) => ({ value: c.label, label: c.label }))}
          onChange={(label) => setCategory(CATEGORIES.find((c) => c.label === label)?.value ?? "other")}
        />

        <Picker
          label="How serious is it?"
          value={severity}
          options={SEVERITIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
          onChange={(v) => setSeverity(v as ReportSeverity)}
        />

        <TextArea
          label="Describe the issue (min 10 characters)"
          value={description}
          onChangeText={setDescription}
          placeholder="Tell us what happened…"
        />

        <Text style={st.label}>Related job (optional)</Text>
        <View style={st.chipWrap}>
          <Chip label="None" active={jobId === ""} onPress={() => setJobId("")} small />
          {myJobs.slice(0, 8).map((j) => (
            <Chip key={j.id} label={j.title} active={jobId === j.id} onPress={() => setJobId(j.id)} small />
          ))}
        </View>

        <Text style={st.label}>About a contractor? (optional)</Text>
        <View style={st.chipWrap}>
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

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl },
  backBtn: { width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.md },
  titleIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.redSoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: T.title, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption + 1, color: C.text2, lineHeight: 20, marginVertical: S.md },
  label: { fontSize: T.caption, fontWeight: "700", color: C.text, marginBottom: S.sm, marginTop: S.xs },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
});
