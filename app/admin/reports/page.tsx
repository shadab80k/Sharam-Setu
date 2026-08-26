"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { AlertTriangle, CheckCircle2, Clock, FileText, Shield, DollarSign, User } from "lucide-react";
import { useState, useMemo } from "react";
import { timeAgo } from "@/lib/utils";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function AdminReportsPage() {
  const reports = useStore((s) => s.safetyReports);
  const users = useStore((s) => s.users);
  const updateStatus = useStore((s) => s.updateReportStatus);
  const [tab, setTab] = useState<"all" | "safety" | "payment" | "fraud" | "user">("all");

  const counts = {
    all: reports.length,
    safety: reports.filter((r) => ["unsafe-workplace", "harassment"].includes(r.category)).length,
    payment: reports.filter((r) => r.category === "payment-dispute").length,
    fraud: reports.filter((r) => r.category === "fraud").length,
    user: reports.filter((r) => ["fake-job", "fake-worker"].includes(r.category)).length,
  };

  const filtered = useMemo(() => {
    if (tab === "all") return reports;
    if (tab === "safety") return reports.filter((r) => ["unsafe-workplace", "harassment"].includes(r.category));
    if (tab === "payment") return reports.filter((r) => r.category === "payment-dispute");
    if (tab === "fraud") return reports.filter((r) => r.category === "fraud");
    if (tab === "user") return reports.filter((r) => ["fake-job", "fake-worker"].includes(r.category));
    return reports;
  }, [tab, reports]);

  const categoryData = [
    { name: "Safety", v: counts.safety },
    { name: "Payment", v: counts.payment },
    { name: "Fraud", v: counts.fraud },
    { name: "User", v: counts.user },
  ];

  const open = reports.filter((r) => r.status === "open").length;
  const investigating = reports.filter((r) => r.status === "investigating").length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const avgResolutionDays = 2.4;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Reports</h2>
        <p className="text-sm text-gray-700 mt-1">User-submitted reports across the platform</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Reports" value={reports.length.toString()} icon={<FileText className="h-5 w-5" />} tone="orange" />
        <MetricCard label="Open" value={open.toString()} icon={<AlertTriangle className="h-5 w-5" />} tone="red" hint="Need action" />
        <MetricCard label="Investigating" value={investigating.toString()} icon={<Clock className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Avg Resolution" value={`${avgResolutionDays}d`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" hint={`${resolved} resolved`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category distribution</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                <Bar dataKey="v" fill="#F4511E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: "all", label: `All (${counts.all})` },
          { value: "safety", label: `Safety (${counts.safety})` },
          { value: "payment", label: `Payment (${counts.payment})` },
          { value: "fraud", label: `Fraud (${counts.fraud})` },
          { value: "user", label: `User (${counts.user})` },
        ]}
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-sm text-gray-600">No reports in this view.</Card>
        ) : (
          filtered.map((r) => {
            const reporter = users.find((u) => u.id === r.reporterId);
            const target = users.find((u) => u.id === r.targetUserId);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    r.severity === "critical" ? "bg-red-100 text-red-600" :
                    r.severity === "high" ? "bg-orange-100 text-orange-600" :
                    r.severity === "medium" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    {r.category === "payment-dispute" ? <DollarSign className="h-4 w-4" /> :
                     r.category === "fraud" ? <Shield className="h-4 w-4" /> :
                     r.category === "fake-worker" || r.category === "fake-job" ? <User className="h-4 w-4" /> :
                     <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={r.severity === "critical" ? "red" : r.severity === "high" ? "orange" : r.severity === "medium" ? "amber" : "blue"} size="sm">{r.severity.toUpperCase()}</Badge>
                      <Badge variant="default" size="sm" className="capitalize">{r.category.replace("-", " ")}</Badge>
                      <Badge variant={r.status === "resolved" ? "green" : r.status === "investigating" ? "blue" : "amber"} size="sm">{r.status}</Badge>
                    </div>
                    <p className="text-sm text-navy-900 mt-1.5">{r.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                      {reporter && (
                        <div className="flex items-center gap-1.5">
                          <Avatar src={reporter.avatar} name={reporter.name} size={18} />
                          <span>By {reporter.name}</span>
                        </div>
                      )}
                      {target && <span>· Target: {target.name}</span>}
                      <span>· {timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === "open" && (
                      <Button variant="secondary" size="sm" onClick={() => updateStatus(r.id, "investigating")}>
                        Investigate
                      </Button>
                    )}
                    {r.status !== "resolved" && r.status !== "dismissed" && (
                      <>
                        <Button variant="success" size="sm" onClick={() => updateStatus(r.id, "resolved")}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => updateStatus(r.id, "dismissed")}>
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
