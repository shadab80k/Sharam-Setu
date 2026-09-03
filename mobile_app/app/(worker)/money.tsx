/**
 * Worker Money — one tab, three segments:
 * Income ledger / Expenses tracker / Savings goals.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Sheet, Tabs, ProgressBar, EmptyState } from "@/components/ui/Feedback";
import { Input, Chip } from "@/components/ui/Input";
import { C, T, R, S } from "@/theme/tokens";
import type { ExpenseCategory, SavingsGoal } from "@/types";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: "food", label: "Food", emoji: "🍚" },
  { value: "transport", label: "Transport", emoji: "🚌" },
  { value: "rent", label: "Rent", emoji: "🏠" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { value: "tools", label: "Tools", emoji: "🔧" },
  { value: "medical", label: "Medical", emoji: "💊" },
  { value: "other", label: "Other", emoji: "📦" },
];

export default function WorkerMoney() {
  const user = useStore((s) => s.currentUser);
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === s.currentUser?.id));
  const expenses = useStore((s) => s.expenses.filter((e) => e.workerId === s.currentUser?.id));
  const savingsGoals = useStore((s) => s.savingsGoals.filter((g) => g.workerId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs);
  const applications = useStore((s) => s.applications);
  const addIncome = useStore((s) => s.addIncome);
  const markReceived = useStore((s) => s.markPaymentReceived);
  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const addGoal = useStore((s) => s.addSavingsGoal);
  const contribute = useStore((s) => s.contributeToSavingsGoal);
  const pushToast = useStore((s) => s.pushToast);

  const [tab, setTab] = useState("income");

  // Income sheet
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ jobId: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "paid" as "paid" | "pending", method: "UPI" });

  // Expense sheet
  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({ category: "food" as ExpenseCategory, amount: "", date: new Date().toISOString().slice(0, 10), note: "" });

  // Goal sheet
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" });

  // Deposit sheet
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  const hiredJobs = useMemo(
    () => applications
      .filter((a) => a.workerId === user?.id && ["selected", "completed"].includes(a.status))
      .map((a) => jobs.find((j) => j.id === a.jobId))
      .filter((j): j is NonNullable<typeof j> => !!j),
    [applications, jobs, user]
  );

  const totalIncome = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingIncome = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netSavings = totalIncome - totalExpenses;

  function handleAddIncome() {
    if (!incomeForm.jobId) { pushToast("error", "Select the job this income is from"); return; }
    if (!incomeForm.amount || Number(incomeForm.amount) <= 0) { pushToast("error", "Enter a valid amount"); return; }
    addIncome({
      jobId: incomeForm.jobId,
      amount: Number(incomeForm.amount),
      dueDate: new Date(incomeForm.date).toISOString(),
      method: incomeForm.method,
      notes: incomeForm.status === "paid" ? undefined : "Awaiting payment",
      status: incomeForm.status,
    });
    setIncomeOpen(false);
    setIncomeForm({ jobId: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "paid", method: "UPI" });
  }

  function handleAddExpense() {
    if (!expForm.amount || Number(expForm.amount) <= 0) { pushToast("error", "Enter a valid expense amount"); return; }
    addExpense(user!.id, {
      category: expForm.category,
      amount: Number(expForm.amount),
      date: expForm.date ? new Date(expForm.date).toISOString() : new Date().toISOString(),
      note: expForm.note || undefined,
    });
    setExpOpen(false);
    setExpForm({ category: "food", amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  }

  function handleAddGoal() {
    if (!goalForm.name || !goalForm.targetAmount || Number(goalForm.targetAmount) <= 0) {
      pushToast("error", "Enter goal name and target amount");
      return;
    }
    const safeTargetDate = goalForm.targetDate
      ? new Date(goalForm.targetDate).toISOString()
      : new Date(Date.now() + 180 * 86400000).toISOString();
    addGoal({
      name: goalForm.name,
      targetAmount: Number(goalForm.targetAmount),
      currentAmount: Number(goalForm.currentAmount || 0),
      targetDate: safeTargetDate,
    });
    setGoalOpen(false);
    setGoalForm({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" });
  }

  function handleDeposit() {
    if (!selectedGoal || !depositAmount || Number(depositAmount) <= 0) {
      pushToast("error", "Enter a valid deposit amount");
      return;
    }
    contribute(selectedGoal.id, Number(depositAmount));
    setDepositOpen(false);
    setDepositAmount("");
    setSelectedGoal(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.title}>My Money</Text>
      </View>

      {/* Summary */}
      <View style={styles.sumRow}>
        <View style={[styles.sumCell, { flex: 1.2 }]}>
          <Text style={styles.sumLabel}>Net savings</Text>
          <Text style={[styles.sumValue, { color: netSavings >= 0 ? C.green600 : C.red600 }]}>{formatINR(netSavings)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Earned</Text>
          <Text style={styles.sumValue}>{formatINR(totalIncome)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Spent</Text>
          <Text style={styles.sumValue}>{formatINR(totalExpenses)}</Text>
        </View>
      </View>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "income", label: "Income" },
          { value: "expenses", label: "Expenses" },
          { value: "savings", label: "Savings" },
        ]}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ---------- INCOME ---------- */}
        {tab === "income" && (
          <>
            <Button label="+ Record Income" onPress={() => setIncomeOpen(true)} fullWidth />
            {pendingIncome > 0 && (
              <View style={styles.pendingBanner}>
                <Text style={styles.pendingText}>{formatINR(pendingIncome)} pending from contractors</Text>
              </View>
            )}
            {payments.length === 0 ? (
              <EmptyState icon={<Text style={{ fontSize: 40 }}>💵</Text>} message="No income records yet.\nRecord wages you receive to track earnings." />
            ) : (
              payments.map((p) => {
                const job = jobs.find((j) => j.id === p.jobId);
                return (
                  <View key={p.id} style={styles.ledgerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ledgerTitle} numberOfLines={1}>{job?.title ?? "Wage record"}</Text>
                      <Text style={styles.ledgerMeta}>
                        {formatDate(p.paidDate ?? p.dueDate)} · {p.method}
                      </Text>
                    </View>
                    <Text style={[styles.ledgerAmount, { color: p.status === "paid" ? C.green600 : C.orange600 }]}>
                      {formatINR(p.amount)}
                    </Text>
                    {p.status !== "paid" ? (
                      <Button label="Received" variant="success" size="sm" onPress={() => markReceived(p.id)} />
                    ) : (
                      <StatusBadge status={p.status} />
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ---------- EXPENSES ---------- */}
        {tab === "expenses" && (
          <>
            <Button label="+ Add Expense" onPress={() => setExpOpen(true)} fullWidth />
            {expenses.length === 0 ? (
              <EmptyState icon={<Text style={{ fontSize: 40 }}>🧾</Text>} message="No expenses recorded.\nTrack spending to see real savings." />
            ) : (
              expenses.map((e) => {
                const cat = EXPENSE_CATEGORIES.find((c) => c.value === e.category);
                return (
                  <View key={e.id} style={styles.ledgerRow}>
                    <Text style={{ fontSize: 24 }}>{cat?.emoji ?? "📦"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ledgerTitle}>{cat?.label ?? e.category}{e.note ? ` — ${e.note}` : ""}</Text>
                      <Text style={styles.ledgerMeta}>{formatDate(e.date)}</Text>
                    </View>
                    <Text style={[styles.ledgerAmount, { color: C.red600 }]}>−{formatINR(e.amount)}</Text>
                    <Pressable onPress={() => deleteExpense(e.id)} hitSlop={10}>
                      <Text style={styles.deleteText}>✕</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ---------- SAVINGS ---------- */}
        {tab === "savings" && (
          <>
            <Button label="+ New Savings Goal" onPress={() => setGoalOpen(true)} fullWidth />
            {savingsGoals.length === 0 ? (
              <EmptyState icon={<Text style={{ fontSize: 40 }}>🎯</Text>} message="No goals yet.\nSet a target — a phone, a cycle, an emergency fund." />
            ) : (
              savingsGoals.map((g) => {
                const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                return (
                  <Card key={g.id}>
                    <CardHeader
                      title={g.name}
                      subtitle={`Target ${formatINR(g.targetAmount)} by ${formatDate(g.targetDate)}`}
                      right={<Text style={styles.goalPct}>{Math.round(pct)}%</Text>}
                    />
                    <ProgressBar value={pct} tone={pct >= 100 ? C.green600 : C.orange600} />
                    <View style={styles.goalFoot}>
                      <Text style={styles.goalSaved}>{formatINR(g.currentAmount)} saved</Text>
                      <Button
                        label="Add Money"
                        variant="secondary"
                        size="sm"
                        onPress={() => { setSelectedGoal(g); setDepositOpen(true); }}
                      />
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Income sheet */}
      <Sheet open={incomeOpen} onClose={() => setIncomeOpen(false)} title="Record Income">
        <Text style={styles.sheetLabel}>Which job is this from?</Text>
        {hiredJobs.length === 0 ? (
          <Text style={styles.sheetHint}>You'll see jobs here once you're hired for one.</Text>
        ) : (
          <View style={styles.chipWrap}>
            {hiredJobs.map((j) => (
              <Chip key={j.id} label={j.title} active={incomeForm.jobId === j.id} onPress={() => setIncomeForm({ ...incomeForm, jobId: j.id })} small />
            ))}
          </View>
        )}
        <Input label="Amount (₹)" value={incomeForm.amount} onChangeText={(v) => setIncomeForm({ ...incomeForm, amount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="500" />
        <Input label="Date" value={incomeForm.date} onChangeText={(v) => setIncomeForm({ ...incomeForm, date: v })} placeholder="YYYY-MM-DD" />
        <Text style={styles.sheetLabel}>Payment status</Text>
        <View style={styles.chipWrap}>
          <Chip label="Received" active={incomeForm.status === "paid"} onPress={() => setIncomeForm({ ...incomeForm, status: "paid" })} />
          <Chip label="Pending" active={incomeForm.status === "pending"} onPress={() => setIncomeForm({ ...incomeForm, status: "pending" })} />
        </View>
        <Text style={styles.sheetLabel}>Method</Text>
        <View style={styles.chipWrap}>
          {["UPI", "Cash", "Bank"].map((m) => (
            <Chip key={m} label={m} active={incomeForm.method === m} onPress={() => setIncomeForm({ ...incomeForm, method: m })} small />
          ))}
        </View>
        <Button label="Save Income" onPress={handleAddIncome} disabled={!incomeForm.jobId} fullWidth />
      </Sheet>

      {/* Expense sheet */}
      <Sheet open={expOpen} onClose={() => setExpOpen(false)} title="Add Expense">
        <Text style={styles.sheetLabel}>Category</Text>
        <View style={styles.chipWrap}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c.value} label={`${c.emoji} ${c.label}`} active={expForm.category === c.value} onPress={() => setExpForm({ ...expForm, category: c.value })} small />
          ))}
        </View>
        <Input label="Amount (₹)" value={expForm.amount} onChangeText={(v) => setExpForm({ ...expForm, amount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="100" />
        <Input label="Date" value={expForm.date} onChangeText={(v) => setExpForm({ ...expForm, date: v })} placeholder="YYYY-MM-DD" />
        <Input label="Note (optional)" value={expForm.note} onChangeText={(v) => setExpForm({ ...expForm, note: v })} placeholder="Lunch at site" />
        <Button label="Save Expense" onPress={handleAddExpense} disabled={!expForm.amount} fullWidth />
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="New Savings Goal">
        <Input label="Goal name" value={goalForm.name} onChangeText={(v) => setGoalForm({ ...goalForm, name: v })} placeholder="New phone" />
        <Input label="Target amount (₹)" value={goalForm.targetAmount} onChangeText={(v) => setGoalForm({ ...goalForm, targetAmount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="15000" />
        <Input label="Already saved (₹)" value={goalForm.currentAmount} onChangeText={(v) => setGoalForm({ ...goalForm, currentAmount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="0" />
        <Input label="Target date (optional)" value={goalForm.targetDate} onChangeText={(v) => setGoalForm({ ...goalForm, targetDate: v })} placeholder="YYYY-MM-DD" />
        <Button label="Create Goal" onPress={handleAddGoal} disabled={!goalForm.name || !goalForm.targetAmount} fullWidth />
      </Sheet>

      {/* Deposit sheet */}
      <Sheet open={depositOpen} onClose={() => setDepositOpen(false)} title={`Add to: ${selectedGoal?.name ?? ""}`}>
        <Input
          label="Deposit amount (₹)"
          value={depositAmount}
          onChangeText={(v) => setDepositAmount(v.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="500"
        />
        {selectedGoal && (
          <Text style={styles.sheetHint}>
            {formatINR(selectedGoal.currentAmount)} of {formatINR(selectedGoal.targetAmount)} saved
          </Text>
        )}
        <Button label="Add Money" onPress={handleDeposit} disabled={!depositAmount} fullWidth />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  sumRow: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg, marginBottom: S.sm },
  sumCell: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: S.md,
    gap: 2,
  },
  sumLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  sumValue: { fontSize: T.lg, fontWeight: "900", color: C.navy900 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  pendingBanner: {
    backgroundColor: C.orange100,
    borderRadius: R.md,
    padding: S.md,
  },
  pendingText: { color: C.orange600, fontSize: T.sm, fontWeight: "700", textAlign: "center" },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    backgroundColor: C.white,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: S.md,
  },
  ledgerTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  ledgerMeta: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  ledgerAmount: { fontSize: T.base, fontWeight: "900" },
  deleteText: { color: C.gray300, fontSize: T.md, fontWeight: "700", paddingHorizontal: S.xs },
  goalPct: { fontSize: T.lg, fontWeight: "900", color: C.orange600 },
  goalFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: S.sm },
  goalSaved: { fontSize: T.sm, fontWeight: "700", color: C.green600 },
  sheetLabel: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  sheetHint: { fontSize: T.xs, color: C.gray500, marginBottom: S.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.lg },
});
