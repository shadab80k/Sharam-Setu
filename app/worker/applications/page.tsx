"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Briefcase, Calendar, ChevronRight, CheckCircle2, Clock, X } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const TIMELINE = ["applied", "viewed", "shortlisted", "selected", "completed"] as const;

export default function WorkerApplicationsPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const apps = useStore((s) => s.applications.filter((a) => a.workerId === currentUserId));
  const jobs = useStore((s) => s.jobs);
  const contractors = useStore((s) => s.users);
  const withdrawApplication = useStore((s) => s.withdrawApplication);
  const [tab, setTab] = useState<"all" | "active" | "selected" | "completed">("all");

  const filtered = apps.filter((a) => {
    if (tab === "all") return true;
    if (tab === "active") return ["applied", "viewed", "shortlisted", "interview"].includes(a.status);
    if (tab === "selected") return a.status === "selected";
    if (tab === "completed") return a.status === "completed" || a.status === "rejected";
    return true;
  });

  const stepMap: Record<string, number> = {
    applied: 0,
    viewed: 1,
    shortlisted: 2,
    interview: 2,
    selected: 3,
    completed: 4,
    rejected: 0,
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">My applications</h2>
        <p className="text-sm text-gray-700 mt-1">Track where you stand with each contractor</p>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: "all", label: `All (${apps.length})` },
          { value: "active", label: `Active (${apps.filter((a) => ["applied", "viewed", "shortlisted", "interview"].includes(a.status)).length})` },
          { value: "selected", label: `Selected (${apps.filter((a) => a.status === "selected").length})` },
          { value: "completed", label: `Completed (${apps.filter((a) => a.status === "completed" || a.status === "rejected").length})` },
        ]}
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-gray-600">No applications in this view.</Card>
        ) : (
          filtered.map((app) => {
            const job = jobs.find((j) => j.id === app.jobId);
            const contractor = contractors.find((u) => u.id === job?.contractorId);
            const currentStep = stepMap[app.status] ?? 0;
            return (
              <Card key={app.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="orange">{job?.category ?? "General"}</Badge>
                      <StatusBadge status={app.status as any} />
                    </div>
                    <Link href={`/worker/jobs/${job?.id}`} className="text-base font-semibold text-navy-900 hover:text-orange-600 mt-1.5 block">
                      {job?.title ?? "Construction Job"}
                    </Link>
                    <p className="text-sm text-gray-700 mt-0.5">{contractor?.name ?? "Contractor"}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Applied {formatDate(app.appliedAt)}
                      </span>
                      {job && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> ₹{job.wagePerDay}/day
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600">Match Score</div>
                    <div className="text-xl font-bold text-orange-600">{app.matchScore}%</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-1">
                    {TIMELINE.map((step, i) => {
                      const reached = i <= currentStep;
                      const isCurrent = i === currentStep && app.status !== "rejected";
                      return (
                        <div key={step} className="flex-1 flex items-center gap-1">
                          <div className={`flex flex-col items-center ${i === 0 ? "" : "flex-1"}`}>
                            <div
                              className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                isCurrent
                                  ? "bg-orange-600 text-white border-orange-600 animate-pulse-slow"
                                  : reached
                                  ? "bg-green-600 text-white border-green-600"
                                  : "bg-white text-gray-500 border-gray-300"
                              }`}
                            >
                              {reached && !isCurrent ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <div className={`text-[10px] mt-1 capitalize ${isCurrent ? "font-semibold text-orange-600" : "text-gray-600"}`}>
                              {step}
                            </div>
                          </div>
                          {i < TIMELINE.length - 1 && (
                            <div className={`flex-1 h-0.5 ${i < currentStep ? "bg-green-600" : "bg-gray-300"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {app.status === "rejected" && (
                  <div className="mt-3 p-2.5 rounded-lg bg-red-100 text-xs text-red-600 flex items-center gap-2">
                    <X className="h-3.5 w-3.5" /> This application was not selected.
                  </div>
                )}
                {app.status === "selected" && (
                  <div className="mt-3 p-2.5 rounded-lg bg-green-100 text-xs text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" /> You've been selected. Expect contact from the contractor.
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <Link href={`/worker/jobs/${job?.id ?? ""}`}>
                    <Button variant="ghost" size="sm">
                      View Job Details
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link href={`/worker/assistant`}>
                      <Button variant="ai" size="sm">
                        Ask AI Coach
                      </Button>
                    </Link>
                    {["applied", "viewed"].includes(app.status) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => withdrawApplication(app.id)}
                      >
                        Withdraw
                      </Button>
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
