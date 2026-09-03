/**
 * Post a Job (V3) — single-scroll form, same validation/save as web.
 * City Picker, skills chips, wage estimator fair-pay hint, Publish/Draft.
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
import { Chip } from "@/components/ui/Chips";
import { Field, TextArea } from "@/components/ui/Field";
import { Picker } from "@/components/ui/Picker";
import { Icon } from "@/components/ui/Icon";
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
    <SafeAreaView style={st.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
          <Text style={st.title}>Post a Job</Text>
          <Text style={st.sub}>Workers matched by AI within minutes</Text>

          <View style={st.formCard}>
            <Field label="Job title" value={form.title} onChangeText={(v: string) => setForm({ ...form, title: v })} placeholder="Mason — Residential Building" />
            <TextArea label="Description" value={form.description} onChangeText={(v: string) => setForm({ ...form, description: v })} placeholder="What the work involves…" />

            <Picker
              label="Category (trade)"
              value={form.category}
              options={PROFESSION_NAMES.map((p) => ({ value: p, label: p }))}
              onChange={(v) => setForm({ ...form, category: v, requiredSkills: [] })}
            />

            <Text style={st.label}>Required skills (tap to add)</Text>
            <View style={st.chipWrap}>
              {professionSkills(form.category).map((s) => (
                <Chip key={s} label={s} active={form.requiredSkills.includes(s)} onPress={() => toggleSkill(s)} small />
              ))}
            </View>
            <View style={st.addSkillRow}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Add custom skill"
                  value={newSkill}
                  onChangeText={setNewSkill}
                  placeholder="e.g. Waterproofing"
                />
              </View>
              <Button
                label="Add"
                variant="secondary"
                size="sm"
                disabled={newSkill.trim().length < 1}
                onPress={() => { if (newSkill.trim()) { toggleSkill(newSkill.trim()); setNewSkill(""); } }}
              />
            </View>

            <Field label="Daily wage (₹)" value={form.wagePerDay} onChangeText={(v: string) => setForm({ ...form, wagePerDay: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="950" />
            <View style={st.estBox}>
              <View style={st.estIcon}>
                <Icon name="sparkles" size={14} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.estLabel}>
                  Fair pay for {form.category} in {(CITIES.find((c) => c.id === form.location) ?? CITIES[0]).name}: {formatINR(wageEst.low)} – {formatINR(wageEst.high)}/day
                </Text>
                {form.wagePerDay !== "" && Number(form.wagePerDay) < wageEst.low && (
                  <Text style={st.estWarn}>Below the estimated market rate — few workers may apply.</Text>
                )}
              </View>
            </View>

            <Picker
              label="City"
              value={CITIES.find((c) => c.id === form.location)?.name ?? ""}
              options={CITIES.map((c) => ({ value: c.name, label: c.name, sub: c.state }))}
              onChange={(name) => setForm({ ...form, location: CITIES.find((c) => c.name === name)?.id ?? form.location })}
            />

            <Field label="Start date (YYYY-MM-DD)" value={form.startDate} onChangeText={(v: string) => setForm({ ...form, startDate: v })} />
            <Field label="End date (YYYY-MM-DD)" value={form.endDate} onChangeText={(v: string) => setForm({ ...form, endDate: v })} />
            <Field label="Workers needed" value={form.workersNeeded} onChangeText={(v: string) => setForm({ ...form, workersNeeded: v.replace(/\D/g, "") })} keyboardType="number-pad" />

            <Picker
              label="Payment frequency"
              value={form.paymentFrequency.replace("-", " ")}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "on-completion", label: "On completion" },
              ]}
              onChange={(v) => setForm({ ...form, paymentFrequency: v as "daily" | "weekly" | "on-completion" })}
            />

            <TextArea
              label="Safety notes (optional)"
              value={form.safetyNotes}
              onChangeText={(v: string) => setForm({ ...form, safetyNotes: v })}
              placeholder="Hard hat required. Site induction day 1."
            />
          </View>

          <View style={st.navRow}>
            <Button label="Save Draft" variant="secondary" onPress={() => publish("draft")} loading={busy} disabled={!form.title.trim()} />
            <Button label="Publish Job" onPress={() => publish("active")} loading={busy} disabled={!valid} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sub: { fontSize: T.caption + 1, color: C.text2, marginBottom: S.xs },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
  },
  label: { fontSize: T.caption, fontWeight: "700", color: C.text, marginTop: S.xs, marginBottom: S.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
  addSkillRow: { flexDirection: "row", alignItems: "flex-end", gap: S.sm },
  estBox: {
    flexDirection: "row",
    gap: S.sm,
    alignItems: "center",
    backgroundColor: C.primarySoft,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.md,
  },
  estIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  estLabel: { fontSize: T.tiny, color: C.text2, fontWeight: "600", lineHeight: 16 },
  estWarn: { fontSize: T.tiny, color: C.red, fontWeight: "700", marginTop: S.xs },
  navRow: { flexDirection: "row", gap: S.md, marginTop: S.xs },
});
