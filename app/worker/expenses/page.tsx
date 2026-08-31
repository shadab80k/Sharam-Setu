"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { TrendingDown, Wallet, PiggyBank, PlusCircle, X, ShoppingBag, Bus, Home, Users, Wrench, Stethoscope, MoreHorizontal, Sparkles, Calendar, Trash2 } from "lucide-react";
import { formatINR, formatINRShort, formatDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Modal } from "@/components/ui/Modal";
import type { ExpenseCategory } from "@/lib/types";

const ExpensesBarChart = dynamic(() => import("@/components/features/ExpensesBarChart"), {
  ssr: false,
  loading: () => <div className="h-56 w-full rounded-lg bg-gray-100 animate-pulse" />,
});

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
  food: { label: "Food", icon: <ShoppingBag className="h-4 w-4" />, color: "#D84315" },
  transport: { label: "Transport", icon: <Bus className="h-4 w-4" />, color: "#2367C9" },
  rent: { label: "Rent", icon: <Home className="h-4 w-4" />, color: "#7047C6" },
  family: { label: "Family", icon: <Users className="h-4 w-4" />, color: "#137B3E" },
  tools: { label: "Tools", icon: <Wrench className="h-4 w-4" />, color: "#C77A00" },
  medical: { label: "Medical", icon: <Stethoscope className="h-4 w-4" />, color: "#D92D20" },
  other: { label: "Other", icon: <MoreHorizontal className="h-4 w-4" />, color: "#667085" },
};

export default function WorkerExpensesPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const expenses = useStore((s) => s.expenses.filter((e) => e.workerId === currentUserId));
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === currentUserId && p.status === "paid"));
  const goals = useStore((s) => s.savingsGoals.filter((g) => g.workerId === currentUserId));
  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const addGoal = useStore((s) => s.addSavingsGoal);
  const contributeToSavingsGoal = useStore((s) => s.contributeToSavingsGoal);
  const pushToast = useStore((s) => s.pushToast);

  const [open, setOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<typeof goals[0] | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [form, setForm] = useState({ category: "food" as ExpenseCategory, amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", currentAmount: "0", targetDate: "" });

  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const savings = Math.max(0, totalIncome - totalExp);
  const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([k, v]) => ({ category: CATEGORY_META[k as ExpenseCategory]?.label ?? k, amount: v, color: CATEGORY_META[k as ExpenseCategory]?.color ?? "#667085" }));
  }, [expenses]);

  const monthlyData = useMemo(() => {
    // Real monthly buckets from the worker's paid payments and expenses
    return Array.from({ length: 5 }, (_, i) => {
      const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0); m.setMonth(m.getMonth() - (4 - i));
      const end = new Date(m); end.setMonth(end.getMonth() + 1);
      const income = payments
        .filter((p) => { const t = p.paidDate ? new Date(p.paidDate) : null; return t && t >= m && t < end; })
        .reduce((s, p) => s + p.amount, 0);
      const expense = expenses
        .filter((e) => { const t = new Date(e.date); return t >= m && t < end; })
        .reduce((s, e) => s + e.amount, 0);
      return {
        month: m.toLocaleString("en-IN", { month: "short" }),
        income,
        expense,
        savings: Math.max(0, income - expense),
      };
    });
  }, [payments, expenses]);

  function handleAdd() {
    if (!form.amount || Number(form.amount) <= 0) {
      pushToast("error", "Please enter a valid expense amount");
      return;
    }
    const safeDate = form.date ? new Date(form.date).toISOString() : new Date().toISOString();
    addExpense(currentUserId, { category: form.category, amount: Number(form.amount), date: safeDate, note: form.note || undefined });
    setOpen(false);
    setForm({ category: "food", amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  }

  function handleAddGoal() {
    if (!goalForm.name || !goalForm.targetAmount || Number(goalForm.targetAmount) <= 0) {
      pushToast("error", "Please enter goal name and target amount");
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
      pushToast("error", "Please enter a valid deposit amount");
      return;
    }
    contributeToSavingsGoal(selectedGoal.id, Number(depositAmount));
    setDepositOpen(false);
    setDepositAmount("");
    setSelectedGoal(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Expenses & savings</h2>
          <p className="text-sm text-gray-700 mt-1">Track where your money goes. Build your safety net.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setGoalOpen(true)} iconLeft={<PiggyBank className="h-4 w-4" />}>New goal</Button>
          <Button onClick={() => setOpen(true)} iconLeft={<PlusCircle className="h-4 w-4" />}>Add expense</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Income" value={formatINRShort(totalIncome)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <MetricCard label="Expenses" value={formatINRShort(totalExp)} icon={<TrendingDown className="h-5 w-5" />} tone="red" />
        <MetricCard label="Savings" value={formatINRShort(savings)} icon={<PiggyBank className="h-5 w-5" />} tone="blue" hint="Income − expenses" />
        <MetricCard label="Savings rate" value={`${savingsRate}%`} icon={<Sparkles className="h-5 w-5" />} tone="purple" hint="Goal: 20%+" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses vs Savings</CardTitle>
          <CardSubtitle>Last 5 months</CardSubtitle>
        </CardHeader>
        <CardBody>
          <ExpensesBarChart data={monthlyData} />
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {byCategory.length === 0 ? (
              <p className="text-sm text-gray-600">No expenses yet.</p>
            ) : (
              byCategory
                .sort((a, b) => b.amount - a.amount)
                .map((c) => (
                  <div key={c.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${c.color}20`, color: c.color }}>
                        {CATEGORY_META[Object.keys(CATEGORY_META).find((k) => CATEGORY_META[k as ExpenseCategory].label === c.category) as ExpenseCategory]?.icon}
                      </div>
                      <span className="text-sm text-navy-900">{c.category}</span>
                    </div>
                    <span className="text-sm font-semibold text-navy-900">{formatINRShort(c.amount)}</span>
                  </div>
                ))
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 bg-purple-100 border-purple-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-semibold text-purple-600">AI Financial Guidance</div>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-white">
                <div className="text-sm text-navy-900">
                  You spent <span className="font-bold">18% more on transport</span> this week. Consider jobs within 5 km to improve savings.
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white">
                <div className="text-sm text-navy-900">
                  Your average income has increased. You can target a <span className="font-bold">₹10,000 emergency fund</span> by September.
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white">
                <div className="text-sm text-navy-900">
                  Cutting ₹200/week from food expenses would add <span className="font-bold">₹800/month</span> to your savings.
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Savings goals</CardTitle>
        </CardHeader>
        <CardBody>
          {goals.length === 0 ? (
            <p className="text-sm text-gray-600">No goals yet. Create your first savings goal to stay focused.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {goals.map((g) => {
                const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                return (
                  <div key={g.id} className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-navy-900">{g.name}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" /> Target {formatDate(g.targetDate)}
                        </div>
                      </div>
                      <Badge variant={pct >= 75 ? "green" : pct >= 40 ? "blue" : "amber"}>{pct}%</Badge>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{formatINR(g.currentAmount)} saved</span>
                        <span>of {formatINR(g.targetAmount)}</span>
                      </div>
                      <ProgressBar value={g.currentAmount} max={g.targetAmount} color={pct >= 75 ? "#137B3E" : "#D84315"} />
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => {
                        setSelectedGoal(g);
                        setDepositOpen(true);
                      }}
                    >
                      Add money
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-gray-200">
            {expenses.slice(0, 10).map((e) => {
              const meta = CATEGORY_META[e.category] || CATEGORY_META.other;
              return (
                <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}20`, color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-navy-900 capitalize">{e.category}</div>
                    <div className="text-xs text-gray-600">{formatDate(e.date)}{e.note ? ` · ${e.note}` : ""}</div>
                  </div>
                  <div className="text-sm font-semibold text-navy-900 mr-2">−{formatINR(e.amount)}</div>
                  <button
                    onClick={() => deleteExpense(e.id)}
                    title="Delete expense"
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add expense">
        <div className="space-y-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
            options={Object.entries(CATEGORY_META).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Textarea label="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add expense</Button>
          </div>
        </div>
      </Modal>

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title="Create savings goal">
        <div className="space-y-3">
          <Input label="Goal name" placeholder="e.g. Emergency fund" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
          <Input label="Target amount (₹)" type="number" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} />
          <Input label="Current amount (₹)" type="number" value={goalForm.currentAmount} onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })} />
          <Input label="Target date" type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGoal}>Create goal</Button>
          </div>
        </div>
      </Modal>

      <Modal open={depositOpen} onClose={() => setDepositOpen(false)} title={`Add Money to ${selectedGoal?.name ?? "Goal"}`}>
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Current progress: <span className="font-semibold text-navy-900">{formatINR(selectedGoal?.currentAmount ?? 0)}</span> of <span className="font-semibold text-navy-900">{formatINR(selectedGoal?.targetAmount ?? 0)}</span>
          </p>
          <Input
            label="Deposit Amount (₹)"
            type="number"
            placeholder="e.g. 500"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setDepositOpen(false)}>Cancel</Button>
            <Button onClick={handleDeposit}>Deposit Money</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
