"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Wallet, Clock, AlertCircle, CheckCircle2, PlusCircle, ArrowUpRight, TrendingUp } from "lucide-react";
import { formatINR, formatINRShort, formatDate } from "@/lib/utils";
import { useState } from "react";
import dynamic from "next/dynamic";

const IncomeBarChart = dynamic(
  () => import("@/components/features/IncomeCharts").then((mod) => mod.IncomeBarChart),
  { ssr: false, loading: () => <div className="h-56 w-full rounded-lg bg-gray-100 animate-pulse" /> }
);

const IncomeStatusPie = dynamic(
  () => import("@/components/features/IncomeCharts").then((mod) => mod.IncomeStatusPie),
  { ssr: false, loading: () => <div className="h-40 w-full rounded-lg bg-gray-100 animate-pulse" /> }
);

import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";

export default function WorkerIncomePage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === currentUserId));
  const jobs = useStore((s) => s.jobs);
  const contractors = useStore((s) => s.users);
  const applications = useStore((s) => s.applications);
  const markReceived = useStore((s) => s.markPaymentReceived);
  const addIncome = useStore((s) => s.addIncome);
  const pushToast = useStore((s) => s.pushToast);
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [openModal, setOpenModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    jobId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    status: "paid" as "paid" | "pending",
    method: "UPI",
    notes: "",
  });

  const totalIncome = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue");
  const overdueAmount = overdue.reduce((s, p) => s + p.amount, 0);

  // Real income chart data — sum of paid payments per day/week/month bucket
  const paidPayments = payments.filter((p) => p.status === "paid" && p.paidDate);
  const sumBetween = (from: Date, to: Date) =>
    paidPayments
      .filter((p) => { const t = new Date(p.paidDate!); return t >= from && t < to; })
      .reduce((s, p) => s + p.amount, 0);

  const chartData = tab === "daily"
    ? Array.from({ length: 7 }, (_, i) => {
        const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - i));
        const next = new Date(day); next.setDate(next.getDate() + 1);
        return { d: day.toLocaleDateString("en-IN", { weekday: "short" }), v: sumBetween(day, next) };
      })
    : tab === "weekly"
    ? Array.from({ length: 4 }, (_, i) => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - start.getDay() - (3 - i) * 7); // weeks starting Sunday
        const end = new Date(start); end.setDate(end.getDate() + 7);
        return { d: `W${i + 1}`, v: sumBetween(start, end) };
      })
    : Array.from({ length: 6 }, (_, i) => {
        const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0); m.setMonth(m.getMonth() - (5 - i));
        const end = new Date(m); end.setMonth(end.getMonth() + 1);
        return { d: m.toLocaleString("en-IN", { month: "short" }), v: sumBetween(m, end) };
      });

  const statusData = [
    { name: "Paid", value: payments.filter((p) => p.status === "paid").length, color: "#178B4A" },
    { name: "Pending", value: payments.filter((p) => p.status === "pending" || p.status === "due").length, color: "#C77A00" },
    { name: "Overdue", value: overdue.length, color: "#D92D20" },
  ];

  // Jobs the worker was actually hired on — the only ones income can be recorded against
  const hiredJobs = applications
    .filter((a) => a.workerId === currentUserId && ["selected", "completed"].includes(a.status))
    .map((a) => jobs.find((j) => j.id === a.jobId))
    .filter((j): j is NonNullable<typeof j> => !!j);

  const handleAddIncome = () => {
    if (!incomeForm.jobId) {
      pushToast("error", "Select the job this income is from");
      return;
    }
    if (!incomeForm.amount || Number(incomeForm.amount) <= 0) {
      pushToast("error", "Please enter a valid amount");
      return;
    }
    addIncome({
      workerId: currentUserId,
      contractorId: "",
      jobId: incomeForm.jobId,
      amount: Number(incomeForm.amount),
      dueDate: new Date(incomeForm.date).toISOString(),
      paidDate: incomeForm.status === "paid" ? new Date(incomeForm.date).toISOString() : undefined,
      status: incomeForm.status,
      method: incomeForm.method,
      notes: incomeForm.notes,
    });
    setOpenModal(false);
    setIncomeForm({
      jobId: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      status: "paid",
      method: "UPI",
      notes: "",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Your money, clearly tracked.</h2>
          <p className="text-sm text-gray-700 mt-1">Income, payments, and history at a glance.</p>
        </div>
        <Button onClick={() => setOpenModal(true)} iconLeft={<PlusCircle className="h-4 w-4" />}>
          Add income
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Income" value={formatINRShort(totalIncome)} icon={<Wallet className="h-5 w-5" />} tone="green" hint="All time" />
        <MetricCard label="Paid" value={formatINRShort(totalIncome)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" hint={`${payments.filter((p) => p.status === "paid").length} payments`} />
        <MetricCard label="Pending" value={formatINRShort(pending - overdueAmount)} icon={<Clock className="h-5 w-5" />} tone="amber" hint={`${payments.filter((p) => p.status !== "paid" && p.status !== "overdue").length} payments`} />
        <MetricCard label="Overdue" value={formatINRShort(overdueAmount)} icon={<AlertCircle className="h-5 w-5" />} tone="red" hint={`${overdue.length} need follow-up`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Income trend</CardTitle>
              <CardSubtitle>Earnings over time</CardSubtitle>
            </div>
            <Tabs
              value={tab}
              onChange={(v) => setTab(v as any)}
              items={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
          </CardHeader>
          <CardBody>
            <IncomeBarChart data={chartData} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status</CardTitle>
            <CardSubtitle>Breakdown of {payments.length} payments</CardSubtitle>
          </CardHeader>
          <CardBody>
            <IncomeStatusPie data={statusData} />
            <div className="space-y-1.5 mt-2">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-navy-900">{s.name}</span>
                  </div>
                  <span className="font-semibold text-navy-900">{s.value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardSubtitle>All your income records</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-3 font-semibold">Job / Source</th>
                  <th className="px-4 py-3 font-semibold">Contractor</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const job = jobs.find((j) => j.id === p.jobId);
                  const contractor = contractors.find((u) => u.id === p.contractorId);
                  const displayName = job?.title ?? (p.notes ? p.notes.split(" - ")[0] : "Site Work");
                  return (
                    <tr key={p.id} className="border-b border-gray-200 hover:bg-cream-50">
                      <td className="px-4 py-3 font-medium text-navy-900">{displayName}</td>
                      <td className="px-4 py-3 text-gray-700">{contractor?.name ?? "Direct Contractor"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-navy-900">{formatINR(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(p.dueDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{p.method || "UPI"}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {p.status !== "paid" && (
                          <Button variant="success" size="sm" onClick={() => markReceived(p.id)}>
                            Mark received
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Record New Income">
        <div className="space-y-3">
          {hiredJobs.length === 0 ? (
            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              You can only record income for jobs you were hired on. Once a contractor hires you from your
              applications, the job will appear here.
            </p>
          ) : (
            <Select
              label="Job"
              value={incomeForm.jobId}
              onChange={(e) => setIncomeForm({ ...incomeForm, jobId: e.target.value })}
              options={hiredJobs.map((j) => ({ value: j.id, label: j.title }))}
            />
          )}
          <Input
            label="Amount (₹)"
            type="number"
            placeholder="e.g. 1200"
            value={incomeForm.amount}
            onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
          />
          <Input
            label="Date"
            type="date"
            value={incomeForm.date}
            onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              value={incomeForm.status}
              onChange={(e) => setIncomeForm({ ...incomeForm, status: e.target.value as any })}
              options={[
                { value: "paid", label: "Paid / Received" },
                { value: "pending", label: "Pending Payment" },
              ]}
            />
            <Select
              label="Payment Method"
              value={incomeForm.method}
              onChange={(e) => setIncomeForm({ ...incomeForm, method: e.target.value })}
              options={[
                { value: "UPI", label: "UPI (PhonePe/GPay)" },
                { value: "Cash", label: "Cash" },
                { value: "Bank Transfer", label: "Bank Transfer" },
              ]}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            placeholder="e.g. 1.5 days daily wage + overtime"
            value={incomeForm.notes}
            onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIncome}>Save Income</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
