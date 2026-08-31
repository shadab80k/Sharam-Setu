"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Wallet, AlertCircle, CheckCircle2, Clock, TrendingUp, Search } from "lucide-react";
import { formatINR, formatINRShort, formatDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function AdminPaymentsPage() {
  const payments = useStore((s) => s.payments);
  const users = useStore((s) => s.users);
  const jobs = useStore((s) => s.jobs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending" || p.status === "due").reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0);
  const disputes = payments.filter((p) => p.notes?.toLowerCase().includes("dispute") || p.status === "overdue").length;

  // Real paid volume per month (last 6 months)
  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0); m.setMonth(m.getMonth() - (5 - i));
    const end = new Date(m); end.setMonth(end.getMonth() + 1);
    const v = payments
      .filter((p) => {
        if (p.status !== "paid" || !p.paidDate) return false;
        const t = new Date(p.paidDate);
        return t >= m && t < end;
      })
      .reduce((s, p) => s + p.amount, 0);
    return { m: m.toLocaleString("en-IN", { month: "short" }), v };
  });

  const filtered = useMemo(() => payments.filter((p) => {
    if (search) {
      const w = users.find((u) => u.id === p.workerId);
      const c = users.find((u) => u.id === p.contractorId);
      const j = jobs.find((x) => x.id === p.jobId);
      const q = search.toLowerCase();
      if (!w?.name.toLowerCase().includes(q) && !c?.name.toLowerCase().includes(q) && !j?.title.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  }), [payments, users, jobs, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Payments</h2>
        <p className="text-sm text-gray-700 mt-1">Platform-wide payment volume and health</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Volume" value={formatINRShort(totalPaid + totalPending)} icon={<Wallet className="h-5 w-5" />} tone="green" hint={`${payments.length} records`} />
        <MetricCard label="Paid" value={formatINRShort(totalPaid)} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <MetricCard label="Pending" value={formatINRShort(totalPending)} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Overdue" value={formatINRShort(totalOverdue)} icon={<AlertCircle className="h-5 w-5" />} tone="red" hint={`${disputes} disputes`} />
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-navy-900">Payment volume</h3>
        </CardHeader>
        <CardBody>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(v) => formatINRShort(v)} />
                <Tooltip cursor={{ stroke: "#EAECF0", strokeWidth: 1 }} contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => formatINR(v as number)} />
                <Line type="monotone" dataKey="v" stroke="#178B4A" strokeWidth={2.5} dot={{ fill: "#178B4A", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Card className="p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Search by worker, contractor, or job…" value={search} onChange={(e) => setSearch(e.target.value)} iconLeft={<Search className="h-4 w-4" />} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 text-sm rounded-lg border border-gray-300 bg-white">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Worker</th>
                <th className="px-4 py-3 font-semibold">Contractor</th>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const w = users.find((u) => u.id === p.workerId);
                const c = users.find((u) => u.id === p.contractorId);
                const j = jobs.find((x) => x.id === p.jobId);
                return (
                  <tr key={p.id} className="border-b border-gray-200 hover:bg-cream-50">
                    <td className="px-4 py-3 font-medium text-navy-900">{w?.name}</td>
                    <td className="px-4 py-3 text-gray-700">{c?.name}</td>
                    <td className="px-4 py-3 text-gray-700">{j?.title}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-900">{formatINR(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(p.dueDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
