/**
 * Contractor Payments (V3) — summary StatTiles, wage ledger ListRows with
 * Mark Paid, New Wage Record Sheet (job → hired worker → amount).
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Picker } from "@/components/ui/Picker";
import { ListRow } from "@/components/ui/ListRow";
import { SkeletonRow } from "@/components/ui/Avatar";
import { StatTile, StatRow } from "@/components/ui/StatTile";
import { C, T, R, S } from "@/theme/tokens";

export default function ContractorPayments() {
  const user = useStore((s) => s.currentUser);
  const payments = useStore((s) => s.payments.filter((p) => p.contractorId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs);
  const apps = useStore((s) => s.applications);
  const users = useStore((s) => s.users);
  const markPaid = useStore((s) => s.markPaymentPaid);
  const addIncome = useStore((s) => s.addIncome);
  const loading = useStore((s) => s.loading);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ jobId: "", workerId: "", amount: "", dueDate: new Date().toISOString().slice(0, 10), method: "UPI", markPaid: false });

  const hiredPairs = useMemo(
    () => apps.filter((a) => ["selected", "completed"].includes(a.status)),
    [apps]
  );
  const myJobIds = useMemo(
    () => new Set(jobs.filter((j) => j.contractorId === user?.id).map((j) => j.id)),
    [jobs, user]
  );

  const sorted = [...payments].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  const pending = payments.filter((p) => p.status !== "paid");
  const overdue = pending.filter((p) => new Date(p.dueDate) < new Date() && p.status !== "paid");
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalDue = pending.reduce((s, p) => s + p.amount, 0);

  async function create() {
    if (!form.jobId || !form.workerId || !form.amount) return;
    await addIncome({
      jobId: form.jobId,
      amount: Number(form.amount),
      dueDate: new Date(form.dueDate).toISOString(),
      method: form.method,
      status: form.markPaid ? "paid" : "pending",
    });
    setCreateOpen(false);
    setForm({ jobId: "", workerId: "", amount: "", dueDate: new Date().toISOString().slice(0, 10), method: "UPI", markPaid: false });
  }

  const formJobOptions = jobs.filter((j) => myJobIds.has(j.id) && hiredPairs.some((a) => a.jobId === j.id));
  const formWorkerOptions = hiredPairs.filter((a) => a.jobId === form.jobId);

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>Payments</Text>
        </View>
        <Button label="Wage Record" size="sm" icon="add" onPress={() => setCreateOpen(true)} />
      </View>

      {/* Summary */}
      <View style={st.sumPad}>
        <StatRow>
          <StatTile icon="checkmark-circle-outline" label="Paid" value={formatINR(totalPaid)} sub="to date" tone="green" />
          <StatTile icon="hourglass-outline" label="Due" value={formatINR(totalDue)} sub="outstanding" tone="amber" />
          <StatTile icon="alert-circle-outline" label="Overdue" value={String(overdue.length)} sub="records" tone={overdue.length ? "red" : "muted"} />
        </StatRow>
      </View>

      <ScrollView contentContainerStyle={st.scroll}>
        {loading && sorted.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            tone="green"
            message="No wage records yet.\nCreate one for a hired worker."
          />
        ) : (
          <View style={st.ledgerCard}>
            {sorted.map((p, i) => {
              const job = jobs.find((j) => j.id === p.jobId);
              const w = users.find((u) => u.id === p.workerId);
              return (
                <ListRow
                  key={p.id}
                  icon="wallet-outline"
                  iconTone={p.status === "paid" ? "green" : p.status === "overdue" ? "red" : "amber"}
                  title={`${w?.name ?? "Worker"} · ${job?.title ?? "Job"}`}
                  sub={`Due ${formatDate(p.dueDate)} · ${p.method}`}
                  trailing={
                    p.status === "paid" ? (
                      <StatusBadge status={p.status} />
                    ) : (
                      <Button label="Mark Paid" variant="secondary" size="sm" onPress={() => markPaid(p.id)} />
                    )
                  }
                  divider={i < sorted.length - 1}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create wage record sheet */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="New Wage Record">
        {formJobOptions.length === 0 ? (
          <Text style={st.hint}>Hire a worker first — records need a hired worker.</Text>
        ) : (
          <Picker
            label="Job"
            value={formJobOptions.find((j) => j.id === form.jobId)?.title ?? ""}
            options={formJobOptions.map((j) => ({ value: j.id, label: j.title }))}
            onChange={(v) => setForm({ ...form, jobId: v, workerId: "" })}
            placeholder="Select job"
          />
        )}
        {form.jobId && formWorkerOptions.length > 0 && (
          <Picker
            label="Worker (hired on this job)"
            value={users.find((u) => u.id === form.workerId)?.name ?? ""}
            options={formWorkerOptions.map((a) => {
              const u = users.find((x) => x.id === a.workerId);
              return { value: a.workerId, label: u?.name ?? "Worker" };
            })}
            onChange={(v) => setForm({ ...form, workerId: v })}
            placeholder="Select worker"
          />
        )}
        <Field label="Amount (₹)" value={form.amount} onChangeText={(v: string) => setForm({ ...form, amount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="950" />
        <Field label="Due date" value={form.dueDate} onChangeText={(v: string) => setForm({ ...form, dueDate: v })} placeholder="YYYY-MM-DD" />
        <Picker
          label="Method"
          value={form.method}
          options={["UPI", "Cash", "Bank"].map((m) => ({ value: m, label: m }))}
          onChange={(v) => setForm({ ...form, method: v })}
        />
        <Picker
          label="Status"
          value={form.markPaid ? "Already paid" : "Pending"}
          options={[
            { value: "paid", label: "Already paid" },
            { value: "pending", label: "Pending" },
          ]}
          onChange={(v) => setForm({ ...form, markPaid: v === "paid" })}
        />
        <Button
          label="Create Record"
          onPress={create}
          disabled={!form.jobId || !form.workerId || !form.amount}
          fullWidth
        />
      </Sheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  sumPad: { paddingHorizontal: S.lg, marginBottom: S.sm },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl },
  ledgerCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
  },
  hint: { fontSize: T.caption + 1, color: C.text2, lineHeight: 21, marginBottom: S.md },
});
