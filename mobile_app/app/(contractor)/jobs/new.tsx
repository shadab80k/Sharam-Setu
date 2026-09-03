/**
 * Post a Job — single-scroll form with the same validation as web.
 * City sets lat/lng; wage estimator shows fair-pay hints.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { PROFESSION_NAMES, professionSkills } from "@/services/professions";
import { estimateWage } from "@/services/wageEstimator";
import { CITIES } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Button } from "@/components/ui/Button";
import { Input, Chip } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/Feedback";
import { Card, CardHeader } from "@/components/ui/Card";
import { C, T, R, S } from "@/theme/tokens";

export default function NewJob() {
  const router = useRouter();
  const createJob = useStore((s) => s.createJob);
  const user = useStore((s) => s.currentUser);

  const [form, setForm] = useState({
    title: "",
    category: "Mason",
    description: "",
    requiredSkills: [] as string[],
    location: user?.location ?? "lucknow",
    wagePerDay: "",
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    workersNeeded: "3",
    paymentFrequency: "weekly" as "daily" | "weekly" | "on-completion",
    safetyNotes: "",
  });
  const [newSkill, setNewSkill] = useState("");
  const [busy, setBusy] = useState(false);

  const wageEst = useMemo(
    () => estimateWage(form.category, 5, form.location, "intermediate"),
    [form.category, form.location]
  );

  function toggleSkill(s: string) {
    setForm((f) => ({
      ...f,
      requiredSkills: f.requiredSkills.includes(s) ? f.requiredSkills.filter((x) => x !== s) : [...f.requiredSkills, s],
    }));
  }

  const valid =
    form.title.trim().length >= 4 &&
    form.description.trim().length >= 0 &&
    Number(form.wagePerDay) >= 1 &&
    Number(form.workersNeeded) >= 1 &&
    !!form.location;

  async function publish(status: "active" | "draft" = "active") {
    if (!valid) return;
    const city = CITIES.find((c) => c.id === form.location) || CITIES[0];
    setBusy(true);
    try {
      const job = await createJob({
        contractorId: "",
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        location: city.id,
        latitude: city.latitude,
        longitude: city.longitude,
        wagePerDay: Number(form.wagePerDay),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        workersNeeded: Number(form.workersNeeded),
        requiredSkills: form.requiredSkills,
        paymentFrequency: form.paymentFrequency,
        safetyNotes: form.safetyNotes,
        status,
      });
      if (job) router.replace({ pathname: "/(contractor)/jobs/[id]", params: { id: job.id } });
    } catch { /* toasted */ } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Post a Job</Text>
          <Text style={styles.sub}>Workers matched by AI within minutes</Text>

          <Card>
            <Input label="Job title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Mason — Residential Building" />
            <Input label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline placeholder="What the work involves…" style={{ height: 90, textAlignVertical: "top" }} />

            <Text style={styles.label}>Category (trade)</Text>
            <View style={styles.chipWrap}>
              {PROFESSION_NAMES.map((p) => (
                <Chip key={p} label={p} active={form.category === p} onPress={() => setForm({ ...form, category: p, requiredSkills: [] })} small />
              ))}
            </View>

            <Text style={styles.label}>Required skills (tap to add)</Text>
            <View style={styles.chipWrap}>
              {professionSkills(form.category).map((s) => (
                <Chip key={s} label={s} active={form.requiredSkills.includes(s)} onPress={() => toggleSkill(s)} small />
              ))}
            </View>
            <View style={styles.addSkillRow}>
              <Input
                label="Add custom skill"
                value={newSkill}
                onChangeText={setNewSkill}
                placeholder="e.g. Waterproofing"
                style={{ flex: 1 }}
              />
              <Button
                label="Add"
                variant="secondary"
                size="sm"
                disabled={newSkill.trim().length < 1}
                onPress={() => { if (newSkill.trim()) { toggleSkill(newSkill.trim()); setNewSkill(""); } }}
              />
            </View>

            <Input label="Daily wage (₹)" value={form.wagePerDay} onChangeText={(v) => setForm({ ...form, wagePerDay: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="950" />
            <View style={styles.estBox}>
              <Text style={styles.estLabel}>
                💡 Fair pay for {form.category} in {(CITIES.find((c) => c.id === form.location) ?? CITIES[0]).name}: {formatINR(wageEst.low)} – {formatINR(wageEst.high)}/day
              </Text>
              {form.wagePerDay !== "" && Number(form.wagePerDay) < wageEst.low && (
                <Text style={styles.estWarn}>Below the estimated market rate — few workers may apply.</Text>
              )}
            </View>

            <Text style={styles.label}>City</Text>
            <View style={styles.chipWrap}>
              {CITIES.map((c) => (
                <Chip key={c.id} label={c.name} active={form.location === c.id} onPress={() => setForm({ ...form, location: c.id })} small />
              ))}
            </View>

            <Input label="Start date (YYYY-MM-DD)" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} />
            <Input label="End date (YYYY-MM-DD)" value={form.endDate} onChangeText={(v) => setForm({ ...form, endDate: v })} />
            <Input label="Workers needed" value={form.workersNeeded} onChangeText={(v) => setForm({ ...form, workersNeeded: v.replace(/\D/g, "") })} keyboardType="number-pad" />

            <Text style={styles.label}>Payment frequency</Text>
            <View style={styles.chipWrap}>
              {(["daily", "weekly", "on-completion"] as const).map((f) => (
                <Chip key={f} label={f.replace("-", " ")} active={form.paymentFrequency === f} onPress={() => setForm({ ...form, paymentFrequency: f })} small />
              ))}
            </View>

            <Input
              label="Safety notes (optional)"
              value={form.safetyNotes}
              onChangeText={(v) => setForm({ ...form, safetyNotes: v })}
              multiline
              placeholder="Hard hat required. Site induction day 1."
              style={{ height: 70, textAlignVertical: "top" }}
            />
          </Card>

          <View style={styles.navRow}>
            <Button label="Save Draft" variant="secondary" onPress={() => publish("draft")} loading={busy} disabled={!form.title.trim()} />
            <Button label="Publish Job" onPress={() => publish("active")} loading={busy} disabled={!valid} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sub: { fontSize: T.sm, color: C.gray500, marginBottom: S.xs },
  label: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginTop: S.sm, marginBottom: S.xs },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  addSkillRow: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, marginTop: S.sm },
  estBox: { backgroundColor: C.orange100, borderRadius: R.md, padding: S.md, marginTop: S.xs, marginBottom: S.sm },
  estLabel: { fontSize: T.xs, color: C.orange600, fontWeight: "700", lineHeight: 17 },
  estWarn: { fontSize: T.xs, color: C.red600, fontWeight: "700", marginTop: S.xs },
  navRow: { flexDirection: "row", gap: S.md, marginTop: S.sm },
});
