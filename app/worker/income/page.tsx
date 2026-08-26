"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Wallet, Clock, AlertCircle, CheckCircle2, PlusCircle, ArrowUpRight, TrendingUp } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { formatINR, formatINRShort, formatDate } from "@/lib/utils";
import { useState } from "react";

export default function WorkerIncomePage() {
  const userId = "usr_w_1";
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === userId));
  const jobs = useStore((s) => s.jobs);
  const contractors = useStore((s) => s.users);
  const markReceived = useStore((s) => s.markPaymentReceived);
  const pushToast = useStore((s) => s.pushToast);
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("weekly");

  const totalIncome = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => p.status === "overdue");
  const overdueAmount = overdue.reduce((s, p) => s + p.amount, 0);

  const chartData = tab === "daily"
    ? [{ d: "Mon", v: 900 }, { d: "Tue", v: 1200 }, { d: "Wed", v: 800 }, { d: "Thu", v: 1100 }, { d: "Fri", v: 1300 }, { d: "Sat", v: 1000 }, { d: "Sun", v: 0 }]
    : tab === "weekly"
    ? [{ d: "W1", v: 5800 }, { d: "W2", v: 6300 }, { d: "W3", v: 7100 }, { d: "W4", v: 6800 }]
    : [{ d: "Jan", v: 22000 }, { d: "Feb", v: 24500 }, { d: "Mar", v: 26800 }, { d: "Apr", v: 28000 }];

  const statusData = [
    { name: "Paid", value: payments.filter((p) => p.status === "paid").length, color: "#178B4A" },
    { name: "Pending", value: payments.filter((p) => p.status === "pending" || p.status === "due").length, color: "#C77A00" },
    { name: "Overdue", value: overdue.length, color: "#D92D20" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Your money, clearly tracked.</h2>
          <p className="text-sm text-gray-700 mt-1">Income, payments, and history at a glance.</p>
        </div>
        <Button iconLeft={<PlusCircle className="h-4 w-4" />}>Add income</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Income" value={formatINRShort(totalIncome)} icon={<Wallet className="h-5 w-5" />} tone="green" trend={{ value: 18, positive: true }} hint="All time" />
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
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="d" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => formatINR(v as number)} />
                  <Bar dataKey="v" fill="#F4511E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment status</CardTitle>
            <CardSubtitle>Breakdown of {payments.length} payments</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" innerRadius={36} outerRadius={60} paddingAngle={2}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
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
                  <th className="px-4 py-3 font-semibold">Job</th>
                  <th className="px-4 py-3 font-semibold">Contractor</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const job = jobs.find((j) => j.id === p.jobId);
                  const contractor = contractors.find((u) => u.id === p.contractorId);
                  return (
                    <tr key={p.id} className="border-b border-gray-200 hover:bg-cream-50">
                      <td className="px-4 py-3 font-medium text-navy-900">{job?.title}</td>
                      <td className="px-4 py-3 text-gray-700">{contractor?.name}</td>
                      <td className="px-4 py-3 text-right font-semibold text-navy-900">{formatINR(p.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(p.dueDate)}</td>
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
    </div>
  );
}
