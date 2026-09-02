"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AlertOctagon, AlertTriangle, Shield, CheckCircle2, Eye, X } from "lucide-react";
import { useState, useMemo } from "react";
import { timeAgo } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

export default function FraudPage() {
  const signals = useStore((s) => s.fraudSignals);
  const reports = useStore((s) => s.safetyReports);
  const users = useStore((s) => s.users);
  const resolveFraudSignal = useStore((s) => s.resolveFraudSignal);
  const updateReportStatus = useStore((s) => s.updateReportStatus);
  const suspendUser = useStore((s) => s.suspendUser);
  const [tab, setTab] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const isResolved = (i: (typeof allIncidents)[number]) =>
    i.kind === "fraud" ? i.status === "resolved" : i.status === "resolved" || i.status === "dismissed";

  const handleResolve = async (i: (typeof allIncidents)[number]) => {
    setActing(true);
    try {
      if (i.kind === "fraud") await resolveFraudSignal(i.id, true);
      else await updateReportStatus(i.id, "resolved", "Reviewed by admin");
      setSelected(null);
    } catch {
      // store already showed the error toast
    } finally {
      setActing(false);
    }
  };

  const handleDismiss = async (i: (typeof allIncidents)[number]) => {
    setActing(true);
    try {
      if (i.kind === "fraud") await resolveFraudSignal(i.id, true);
      else await updateReportStatus(i.id, "dismissed", "No action needed");
      setSelected(null);
    } catch {
      // store already showed the error toast
    } finally {
      setActing(false);
    }
  };

  const handleSuspend = async (i: (typeof allIncidents)[number]) => {
    if (!i.userId) return;
    setActing(true);
    try {
      await suspendUser(i.userId);
      if (i.kind === "fraud") await resolveFraudSignal(i.id, true);
      else await updateReportStatus(i.id, "resolved", "Target user suspended");
      setSelected(null);
    } catch {
      // store already showed the error toast
    } finally {
      setActing(false);
    }
  };

  const allIncidents = useMemo(() => {
    const list: any[] = [];
    signals.forEach((s) => {
      list.push({
        kind: "fraud",
        id: s.id,
        userId: s.userId,
        title: s.type,
        description: s.description,
        severity: s.severity,
        createdAt: s.createdAt,
        status: s.resolved ? "resolved" : "open",
      });
    });
    reports.forEach((r) => {
      list.push({
        kind: "report",
        id: r.id,
        userId: r.targetUserId,
        reporterId: r.reporterId,
        jobId: r.jobId,
        title: r.category.replace("-", " "),
        description: r.description,
        severity: r.severity,
        createdAt: r.createdAt,
        status: r.status,
      });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [signals, reports]);

  const counts = {
    all: allIncidents.length,
    critical: allIncidents.filter((i) => i.severity === "critical").length,
    high: allIncidents.filter((i) => i.severity === "high").length,
    medium: allIncidents.filter((i) => i.severity === "medium").length,
    low: allIncidents.filter((i) => i.severity === "low").length,
  };

  const filtered = tab === "all" ? allIncidents : allIncidents.filter((i) => i.severity === tab);
  const target = selected ? allIncidents.find((i) => i.id === selected) : null;

  const severityVariant = (s: string) => s === "critical" ? "red" : s === "high" ? "orange" : s === "medium" ? "amber" : "blue";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Fraud & Safety</h2>
        <p className="text-sm text-gray-700 mt-1">Investigate and resolve safety signals</p>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: "all", label: `All (${counts.all})` },
          { value: "critical", label: `Critical (${counts.critical})` },
          { value: "high", label: `High (${counts.high})` },
          { value: "medium", label: `Medium (${counts.medium})` },
          { value: "low", label: `Low (${counts.low})` },
        ]}
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-sm text-gray-600">No incidents in this view.</Card>
        ) : (
          filtered.map((i) => {
            const user = users.find((u) => u.id === i.userId);
            return (
              <Card key={`${i.kind}-${i.id}`} className={`p-4 border-l-4 ${
                i.severity === "critical" ? "border-l-red-600" :
                i.severity === "high" ? "border-l-orange-600" :
                i.severity === "medium" ? "border-l-amber-600" : "border-l-blue-600"
              }`}>
                <div className="flex items-start gap-3 flex-wrap">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                    i.severity === "critical" ? "bg-red-100 text-red-600" :
                    i.severity === "high" ? "bg-orange-100 text-orange-600" :
                    i.severity === "medium" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    {i.severity === "critical" ? <AlertOctagon className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={severityVariant(i.severity) as any} size="sm">{i.severity.toUpperCase()}</Badge>
                      <Badge variant="default" size="sm" className="capitalize">{i.title}</Badge>
                      <Badge variant={i.status === "resolved" ? "green" : "amber"} size="sm">{i.status}</Badge>
                    </div>
                    <p className="text-sm text-navy-900 mt-1.5">{i.description}</p>
                    {user && (
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                        <Avatar src={user.avatar} name={user.name} size={20} />
                        <span>Target: {user.name}</span>
                        <span>· {timeAgo(i.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(i.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Incident details" size="lg">
        {target && (
          <div className="space-y-3">
            <Badge variant={severityVariant(target.severity) as any}>{target.severity.toUpperCase()}</Badge>
            <h3 className="text-base font-semibold text-navy-900 capitalize">{target.title}</h3>
            <p className="text-sm text-gray-700">{target.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Type</div>
                <div className="font-semibold text-navy-900 capitalize">{target.kind}</div>
              </div>
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Created</div>
                <div className="font-semibold text-navy-900">{timeAgo(target.createdAt)}</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-cream-100 border border-gray-200">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">Severity assessment</div>
              <p className="text-sm text-navy-900 mt-1">
                {target.severity === "critical" ? "Critical signals indicate an immediate risk to users or the platform and warrant suspension of the account involved." :
                  target.severity === "high" ? "High severity — review the target user's history and recent activity before deciding." :
                  target.severity === "medium" ? "Medium severity — worth monitoring; resolve if no further signals appear." :
                  "Low severity — typically one-off reports; dismissing is reasonable if nothing corroborates it."}
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 flex-wrap">
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {!isResolved(target) && (
                <>
                  <Button variant="ghost" disabled={acting || !target.userId} onClick={() => void handleDismiss(target)}>Dismiss</Button>
                  {target.userId && (
                    <Button variant="destructive" disabled={acting} onClick={() => void handleSuspend(target)}>Suspend user</Button>
                  )}
                  <Button variant="success" disabled={acting} loading={acting} iconLeft={<CheckCircle2 className="h-4 w-4" />} onClick={() => void handleResolve(target)}>Resolve</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
