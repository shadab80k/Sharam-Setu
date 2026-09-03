/**
 * Worker Money (V3) — segmented Income/Expenses/Savings tabs, ledger ListRows,
 * goal cards with progress + Add Money, 4 Sheets for create flows.
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { Tabs } from "@/components/ui/Tabs";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";
import type { ExpenseCategory, SavingsGoal } from "@/types";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "food", label: "Food", icon: "restaurant-outline" },
  { value: "transport", label: "Transport", icon: "bus-outline" },
  { value: "rent", label: "Rent", icon: "home-outline" },
  { value: "family", label: "Family", icon: "people-outline" },
  { value: "tools", label: "Tools", icon: "construct-outline" },
  { value: "medical", label: "Medical", icon: "medkit-outline" },
  { value: "other", label: "Other", icon: "cube-outline" },
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

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ jobId: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "paid" as "paid" | "pending", method: "UPI" });

  const [expOpen, setExpOpen] = useState(false);
  const [expForm, setExpForm] = useState({ category: "food" as ExpenseCategory, amount: "", date: new Date().toISOString().slice(0, 10), note: "" });

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" });

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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <Text style={st.title}>My Money</Text>
      </View>

      {/* Summary */}
      <View style={st.sumRow}>
        <View style={[st.sumCell, { flex: 1.2 }]}>
          <Text style={st.sumLabel}>Net savings</Text>
          <Text style={[st.sumValue, { color: netSavings >= 0 ? C.green : C.red }]}>{formatINR(netSavings)}</Text>
        </View>
        <View style={st.sumCell}>
          <Text style={st.sumLabel}>Earned</Text>
          <Text style={st.sumValue}>{formatINR(totalIncome)}</Text>
        </View>
        <View style={st.sumCell}>
          <Text style={st.sumLabel}>Spent</Text>
          <Text style={st.sumValue}>{formatINR(totalExpenses)}</Text>
        </View>
      </View>

      <View style={st.tabPad}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: "income", label: "Income", count: payments.length },
            { value: "expenses", label: "Expenses", count: expenses.length },
            { value: "savings", label: "Savings", count: savingsGoals.length },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={st.scroll}>
        {/* ---------- INCOME ---------- */}
        {tab === "income" && (
          <>
            <Button label="Record Income" onPress={() => setIncomeOpen(true)} icon="add" fullWidth />
            {pendingIncome > 0 && (
              <View style={st.pendingBanner}>
                <Icon name="hourglass-outline" size={15} color={C.amber} />
                <Text style={st.pendingText}>{formatINR(pendingIncome)} pending from contractors</Text>
              </View>
            )}
            {payments.length === 0 ? (
              <EmptyState icon="wallet-outline" tone="green" message="No income records yet.\nRecord wages you receive to track earnings." />
            ) : (
              <View style={st.ledgerCard}>
                {payments.map((p, i) => {
                  const job = jobs.find((j) => j.id === p.jobId);
                  return (
                    <ListRow
                      key={p.id}
                      icon="wallet-outline"
                      iconTone={p.status === "paid" ? "green" : "amber"}
                      title={job?.title ?? "Wage record"}
                      sub={`${formatDate(p.paidDate ?? p.dueDate)} · ${p.method}`}
                      trailing={
                        p.status !== "paid" ? (
                          <Button label="Received" variant="secondary" size="sm" onPress={() => markReceived(p.id)} />
                        ) : (
                          <StatusBadge status={p.status} />
                        )
                      }
                      divider={i < payments.length - 1}
                    />
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ---------- EXPENSES ---------- */}
        {tab === "expenses" && (
          <>
            <Button label="Add Expense" onPress={() => setExpOpen(true)} icon="add" fullWidth />
            {expenses.length === 0 ? (
              <EmptyState icon="receipt-outline" tone="amber" message="No expenses recorded.\nTrack spending to see real savings." />
            ) : (
              <View style={st.ledgerCard}>
                {expenses.map((e, i) => {
                  const cat = EXPENSE_CATEGORIES.find((c) => c.value === e.category);
                  return (
                    <ListRow
                      key={e.id}
                      icon={(cat?.icon ?? "cube-outline") as never}
                      iconTone="red"
                      title={`${cat?.label ?? e.category}${e.note ? ` — ${e.note}` : ""}`}
                      sub={formatDate(e.date)}
                      trailing={
                        <Pressable onPress={() => deleteExpense(e.id)} hitSlop={10} style={st.deleteBtn}>
                          <Icon name="close" size={15} color={C.text3} />
                        </Pressable>
                      }
                      divider={i < expenses.length - 1}
                    />
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ---------- SAVINGS ---------- */}
        {tab === "savings" && (
          <>
            <Button label="New Savings Goal" onPress={() => setGoalOpen(true)} icon="add" fullWidth />
            {savingsGoals.length === 0 ? (
              <EmptyState icon="flag-outline" tone="primary" message="No goals yet.\nSet a target — a phone, a cycle, an emergency fund." />
            ) : (
              savingsGoals.map((g) => {
                const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                return (
                  <Card key={g.id}>
                    <CardHeader
                      title={g.name}
                      subtitle={`Target ${formatINR(g.targetAmount)} by ${formatDate(g.targetDate)}`}
                      right={<Text style={st.goalPct}>{Math.round(pct)}%</Text>}
                    />
                    <ProgressBar value={pct} tone={pct >= 100 ? C.green : C.primary} />
                    <View style={st.goalFoot}>
                      <Text style={st.goalSaved}>{formatINR(g.currentAmount)} saved</Text>
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
        <Text style={st.sheetLabel}>Which job is this from?</Text>
        {hiredJobs.length === 0 ? (
          <Text style={st.sheetHint}>You'll see jobs here once you're hired for one.</Text>
        ) : (
          <View style={st.chipWrap}>
            {hiredJobs.map((j) => (
              <Chip key={j.id} label={j.title} active={incomeForm.jobId === j.id} onPress={() => setIncomeForm({ ...incomeForm, jobId: j.id })} small />
            ))}
          </View>
        )}
        <Field label="Amount (₹)" value={incomeForm.amount} onChangeText={(v: string) => setIncomeForm({ ...incomeForm, amount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="500" />
        <Field label="Date" value={incomeForm.date} onChangeText={(v: string) => setIncomeForm({ ...incomeForm, date: v })} placeholder="YYYY-MM-DD" />
        <Text style={st.sheetLabel}>Payment status</Text>
        <View style={st.chipWrap}>
          <Chip label="Received" active={incomeForm.status === "paid"} onPress={() => setIncomeForm({ ...incomeForm, status: "paid" })} />
          <Chip label="Pending" active={incomeForm.status === "pending"} onPress={() => setIncomeForm({ ...incomeForm, status: "pending" })} />
        </View>
        <Text style={st.sheetLabel}>Method</Text>
        <View style={st.chipWrap}>
          {["UPI", "Cash", "Bank"].map((m) => (
            <Chip key={m} label={m} active={incomeForm.method === m} onPress={() => setIncomeForm({ ...incomeForm, method: m })} small />
          ))}
        </View>
        <Button label="Save Income" onPress={handleAddIncome} disabled={!incomeForm.jobId} fullWidth />
      </Sheet>

      {/* Expense sheet */}
      <Sheet open={expOpen} onClose={() => setExpOpen(false)} title="Add Expense">
        <Text style={st.sheetLabel}>Category</Text>
        <View style={st.chipWrap}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c.value} label={c.label} active={expForm.category === c.value} onPress={() => setExpForm({ ...expForm, category: c.value })} small />
          ))}
        </View>
        <Field label="Amount (₹)" value={expForm.amount} onChangeText={(v: string) => setExpForm({ ...expForm, amount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="100" />
        <Field label="Date" value={expForm.date} onChangeText={(v: string) => setExpForm({ ...expForm, date: v })} placeholder="YYYY-MM-DD" />
        <Field label="Note (optional)" value={expForm.note} onChangeText={(v: string) => setExpForm({ ...expForm, note: v })} placeholder="Lunch at site" />
        <Button label="Save Expense" onPress={handleAddExpense} disabled={!expForm.amount} fullWidth />
      </Sheet>

      {/* Goal sheet */}
      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="New Savings Goal">
        <Field label="Goal name" value={goalForm.name} onChangeText={(v: string) => setGoalForm({ ...goalForm, name: v })} placeholder="New phone" />
        <Field label="Target amount (₹)" value={goalForm.targetAmount} onChangeText={(v: string) => setGoalForm({ ...goalForm, targetAmount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="15000" />
        <Field label="Already saved (₹)" value={goalForm.currentAmount} onChangeText={(v: string) => setGoalForm({ ...goalForm, currentAmount: v.replace(/\D/g, "") })} keyboardType="number-pad" placeholder="0" />
        <Field label="Target date (optional)" value={goalForm.targetDate} onChangeText={(v: string) => setGoalForm({ ...goalForm, targetDate: v })} placeholder="YYYY-MM-DD" />
        <Button label="Create Goal" onPress={handleAddGoal} disabled={!goalForm.name || !goalForm.targetAmount} fullWidth />
      </Sheet>

      {/* Deposit sheet */}
      <Sheet open={depositOpen} onClose={() => setDepositOpen(false)} title={`Add to: ${selectedGoal?.name ?? ""}`}>
        <Field
          label="Deposit amount (₹)"
          value={depositAmount}
          onChangeText={(v: string) => setDepositAmount(v.replace(/\D/g, ""))}
          keyboardType="number-pad"
          placeholder="500"
        />
        {selectedGoal && (
          <Text style={st.sheetHint}>
            {formatINR(selectedGoal.currentAmount)} of {formatINR(selectedGoal.targetAmount)} saved
          </Text>
        )}
        <Button label="Add Money" onPress={handleDeposit} disabled={!depositAmount} fullWidth />
      </Sheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  tabPad: { paddingHorizontal: S.lg, marginBottom: S.sm },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  sumRow: { flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg, marginBottom: S.sm },
  sumCell: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    gap: 2,
  },
  sumLabel: { fontSize: T.tiny, color: C.text3, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  sumValue: { fontSize: T.body + 2, fontWeight: "800", color: C.text },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    backgroundColor: C.amberSoft,
    borderRadius: R.md,
    padding: S.md,
  },
  pendingText: { color: C.amber, fontSize: T.caption + 1, fontWeight: "700" },
  ledgerCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
  },
  deleteBtn: { width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.muted, alignItems: "center", justifyContent: "center" },
  goalPct: { fontSize: T.body + 2, fontWeight: "800", color: C.primary },
  goalFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: S.sm },
  goalSaved: { fontSize: T.caption + 1, fontWeight: "700", color: C.green },
  sheetLabel: { fontSize: T.caption, fontWeight: "700", color: C.text, marginBottom: S.sm, marginTop: S.xs },
  sheetHint: { fontSize: T.caption, color: C.text3, marginBottom: S.md },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
});
