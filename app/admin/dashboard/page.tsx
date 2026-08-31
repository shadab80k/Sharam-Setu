"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Users, Hammer, Briefcase, ShieldCheck, AlertOctagon, Wallet, Bell, TrendingUp, AlertTriangle, ArrowRight, CheckCircle2, X } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, AreaChart, Area, Legend } from "recharts";
import { formatINR, formatINRShort } from "@/lib/utils";
import Link from "next/link";

export default function AdminDashboard() {
  const users = useStore((s) => s.users);
  const workers = users.filter((u) => u.role === "worker");
  const contractors = users.filter((u) => u.role === "contractor");
  const jobs = useStore((s) => s.jobs);
  const apps = useStore((s) => s.applications);
  const payments = useStore((s) => s.payments);
  const verifications = useStore((s) => s.verifications);
  const fraudSignals = useStore((s) => s.fraudSignals);
  const reports = useStore((s) => s.safetyReports);

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const matched = apps.length;
  const pendingVerif = verifications.filter((v) => v.status === "pending").length;
  const fraudAlerts = fraudSignals.filter((f) => !f.resolved).length;
  const paymentDisputes = reports.filter((r) => r.category === "payment-dispute" && r.status !== "resolved").length;
  const overdue = payments.filter((p) => p.status === "overdue").length;
  const totalVolume = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

  // Real monthly signup growth (cumulative workers/contractors from user.createdAt)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthKeys: Date[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthKeys.push(d);
  }
  const workerGrowth = monthKeys.map((d, idx) => {
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      m: d.toLocaleString("en-IN", { month: "short" }),
      workers: users.filter((u) => u.role === "worker" && new Date(u.createdAt) < end).length,
      contractors: users.filter((u) => u.role === "contractor" && new Date(u.createdAt) < end).length,
      _i: idx,
    };
  });

  // Real monthly hires (applications selected/completed per month)
  const jobsMatched = monthKeys.map((d) => {
    const start = d;
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      m: d.toLocaleString("en-IN", { month: "short" }),
      v: apps.filter((a) => {
        if (!["selected", "completed"].includes(a.status)) return false;
        const at = new Date(a.appliedAt);
        return at >= start && at < end;
      }).length,
    };
  });

  // Real network trust trend (avg current worker trust score per signup cohort)
  const workerProfiles = useStore((s) => s.workerProfiles);
  const scoreByUser = new Map(workerProfiles.map((p) => [p.userId, p.trustScore]));
  const trustTrend = monthKeys.map((d) => {
    const start = d;
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const scores = users
      .filter((u) => u.role === "worker" && new Date(u.createdAt) >= start && new Date(u.createdAt) < end)
      .map((u) => scoreByUser.get(u.id))
      .filter((s): s is number => typeof s === "number");
    return {
      m: d.toLocaleString("en-IN", { month: "short" }),
      v: scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Platform Overview</h2>
          <p className="text-sm text-gray-700 mt-1">Real-time health of the ShramSetu network</p>
        </div>
        <Badge variant="green" iconLeft={<span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse-slow" />}>All systems operational</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Workers" value={workers.length.toLocaleString()} icon={<Users className="h-5 w-5" />} tone="orange" hint={`${workers.filter((w) => new Date(w.createdAt) >= monthStart).length} joined this month`} />
        <MetricCard label="Contractors" value={contractors.length.toLocaleString()} icon={<Hammer className="h-5 w-5" />} tone="blue" hint={`${contractors.filter((c) => new Date(c.createdAt) >= monthStart).length} joined this month`} />
        <MetricCard label="Active Jobs" value={activeJobs.toLocaleString()} icon={<Briefcase className="h-5 w-5" />} tone="purple" />
        <MetricCard label="Jobs Matched" value={matched.toLocaleString()} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" hint={`${apps.filter((a) => ["selected", "completed"].includes(a.status) && new Date(a.appliedAt) >= monthStart).length} hires this month`} />
        <MetricCard label="Payments Volume" value={formatINRShort(totalVolume)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <MetricCard label="Pending Verification" value={pendingVerif.toString()} icon={<ShieldCheck className="h-5 w-5" />} tone="amber" hint="Needs review" />
        <MetricCard label="Fraud Alerts" value={fraudAlerts.toString()} icon={<AlertOctagon className="h-5 w-5" />} tone="red" hint="Active signals" />
        <MetricCard label="Payment Disputes" value={paymentDisputes.toString()} icon={<AlertTriangle className="h-5 w-5" />} tone="orange" hint={`${overdue} overdue`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Worker & contractor growth</CardTitle>
            <CardSubtitle>Network expansion over 6 months</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={workerGrowth}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="workers" stroke="#F4511E" fill="#F4511E" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="contractors" stroke="#12385E" fill="#12385E" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card className="border-orange-500/30 bg-orange-100/30">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Requires attention</CardTitle>
              <CardSubtitle>Items needing admin action</CardSubtitle>
            </div>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardBody className="space-y-2">
            <Link href="/admin/fraud" className="flex items-center justify-between p-3 rounded-lg bg-red-100 hover:bg-red-100/80 transition">
              <div>
                <div className="text-sm font-semibold text-red-600">High-risk reports</div>
                <div className="text-xs text-gray-700">Fraud &amp; safety signals</div>
              </div>
              <div className="text-2xl font-bold text-red-600">{fraudAlerts + reports.filter((r) => r.status !== "resolved").length}</div>
            </Link>
            <Link href="/admin/verifications" className="flex items-center justify-between p-3 rounded-lg bg-amber-100 hover:bg-amber-100/80 transition">
              <div>
                <div className="text-sm font-semibold text-amber-600">Pending verifications</div>
                <div className="text-xs text-gray-700">Awaiting your review</div>
              </div>
              <div className="text-2xl font-bold text-amber-600">{pendingVerif}</div>
            </Link>
            <Link href="/admin/payments" className="flex items-center justify-between p-3 rounded-lg bg-blue-100 hover:bg-blue-100/80 transition">
              <div>
                <div className="text-sm font-semibold text-blue-600">Overdue payments</div>
                <div className="text-xs text-gray-700">More than 7 days late</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{overdue}</div>
            </Link>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Jobs matched</CardTitle>
            <CardSubtitle>Total successful job matches per month</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={jobsMatched}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Line type="monotone" dataKey="v" stroke="#2367C9" strokeWidth={2.5} dot={{ fill: "#2367C9", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average trust score</CardTitle>
            <CardSubtitle>Network-wide trust progression</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trustTrend}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Line type="monotone" dataKey="v" stroke="#178B4A" strokeWidth={2.5} dot={{ fill: "#178B4A", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
