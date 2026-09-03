/**
 * Contractor Payments — wage ledger with mark-paid, plus create a wage
 * record for a hired worker (POST /api/payments requires workerId).
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Sheet, EmptyState } from "@/components/ui/Feedback";
import { Input, Chip } from "@/components/ui/Input";
import { SkeletonRow } from "@/components/ui/Avatar";
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

  // Hired workers per job — (jobId, workerId) pairs from selected/completed apps
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.title}>Payments</Text>
        <Button label="+ Wage Record" size="sm" onPress={() => setCreateOpen(true)} />
      </View>

      {/* Summary */}
      <View style={styles.sumRow}>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Paid to date</Text>
          <Text style={[styles.sumValue, { color: C.green600 }]}>{formatINR(totalPaid)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Outstanding</Text>
          <Text style={[styles.sumValue, { color: C.orange600 }]}>{formatINR(totalDue)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Overdue</Text>
          <Text style={[styles.sumValue, { color: overdue.length ? C.red600 : C.navy900 }]}>{overdue.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && sorted.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>💰</Text>}
            message="No wage records yet.\nCreate one for a hired worker."
          />
        ) : (
          sorted.map((p) => {
            const job = jobs.find((j) => j.id === p.jobId);
            const w = users.find((u) => u.id === p.workerId);
            return (
              <View key={p.id} style={styles.ledgerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerTitle} numberOfLines={1}>{w?.name ?? "Worker"} · {job?.title ?? "Job"}</Text>
                  <Text style={styles.ledgerMeta}>
                    Due {formatDate(p.dueDate)} · {p.method}
                  </Text>
                </View>
                <Text style={[styles.ledgerAmount, { color: p.status === "paid" ? C.green600 : p.status === "overdue" ? C.red600 : C.orange600 }]}>
                  {formatINR(p.amount)}
                </Text>
                {p.status === "paid" ? (
                  <StatusBadge status={p.status} />
                ) : (
                  <Button label="Mark Paid" variant="success" size="sm" onPress={() => markPaid(p.id)} />
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create wage record sheet */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="New Wage Record">
        <Text style={styles.label}>Job</Text>
        <View style={styles.chipWrap}>
          {formJobOptions.length === 0 && <Text style={styles.hint}>Hire a worker first — records need a hired worker.</Text>}
          {formJobOptions.map((j) => (
            <Chip key={j.id} label={j.title} active={form.jobId === j.id} onPress={() => setForm({ ...form, jobId: j.id, workerId: "" })} small />
          ))}
        </View>
        {form.jobId && (
          <>
            <Text style={styles.label}>Worker (hired on this job)</Text>
            <View style={styles.chipWrap}>
              {formWorkerOptions.map((a) => {
                const u = users.find((x) => x.id === a.workerId);
                return u ? (
                  <Chip key={a.workerId} label={u.name} active={form.workerId === a.workerId} onPress={() => setForm({ ...form, workerId: a.workerId })} small />
                ) : null;
              })}
            </View>
          </>
        )}
        <Input label="Amount (₹)" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="950" />
        <Input label="Due date" value={form.dueDate} onChangeText={(v) => setForm({ ...form, dueDate: v })} placeholder="YYYY-MM-DD" />
        <Text style={styles.label}>Method</Text>
        <View style={styles.chipWrap}>
          {["UPI", "Cash", "Bank"].map((m) => (
            <Chip key={m} label={m} active={form.method === m} onPress={() => setForm({ ...form, method: m })} small />
          ))}
        </View>
        <Text style={styles.label}>Status</Text>
        <View style={styles.chipWrap}>
          <Chip label="Already paid" active={form.markPaid} onPress={() => setForm({ ...form, markPaid: true })} small />
          <Chip label="Pending" active={!form.markPaid} onPress={() => setForm({ ...form, markPaid: false })} small />
        </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sumRow: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg, marginBottom: S.sm },
  sumCell: {
    flex: 1, backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md, gap: 2,
  },
  sumLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  sumValue: { fontSize: T.md, fontWeight: "900" },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  ledgerRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md,
  },
  ledgerTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  ledgerMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  ledgerAmount: { fontSize: T.base, fontWeight: "900" },
  label: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  hint: { fontSize: T.xs, color: C.gray500 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.lg },
});
