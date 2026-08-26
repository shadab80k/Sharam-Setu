"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { CheckCircle2, X, MessageSquare, Star, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";

export default function ApplicantsPage() {
  const myJobs = useStore((s) => s.jobs.filter((j) => j.contractorId === "usr_c_1"));
  const allApps = useStore((s) => s.applications);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const updateApp = useStore((s) => s.updateApplicationStatus);
  const hire = useStore((s) => s.hireWorker);

  const [tab, setTab] = useState<"all" | "shortlisted" | "selected" | "rejected">("all");

  const myApps = useMemo(() => allApps.filter((a) => myJobs.some((j) => j.id === a.jobId)), [allApps, myJobs]);

  const counts = {
    all: myApps.length,
    shortlisted: myApps.filter((a) => a.status === "shortlisted").length,
    selected: myApps.filter((a) => a.status === "selected").length,
    rejected: myApps.filter((a) => a.status === "rejected").length,
  };

  const filtered = myApps.filter((a) => {
    if (tab === "all") return a.status !== "rejected";
    return a.status === tab;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Applicants</h2>
        <p className="text-sm text-gray-700 mt-1">{myApps.length} total · {myApps.filter((a) => a.matchScore >= 80).length} strong matches</p>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: "all", label: `Active (${counts.all - counts.rejected})` },
          { value: "shortlisted", label: `Shortlisted (${counts.shortlisted})` },
          { value: "selected", label: `Selected (${counts.selected})` },
          { value: "rejected", label: `Rejected (${counts.rejected})` },
        ]}
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-sm text-gray-600">No applicants in this view.</Card>
        ) : (
          filtered.map((app) => {
            const job = myJobs.find((j) => j.id === app.jobId);
            const worker = workers.find((w) => w.userId === app.workerId);
            const user = users.find((u) => u.id === app.workerId);
            if (!job || !worker || !user) return null;
            const city = CITIES.find((c) => c.name === job.location);
            const match = city ? calculateMatchScore(job, worker, undefined, city) : null;
            return (
              <Card key={app.id} className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <Avatar src={user.avatar} name={user.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-navy-900">{user.name}</div>
                      <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-2.5 w-2.5" />}>Verified</Badge>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Applied for <span className="font-medium">{job.title}</span> · {worker.profession} · {worker.experienceYears} yrs · {worker.rating.toFixed(1)}★
                    </div>
                    <div className="text-xs text-gray-700 mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> ₹{worker.expectedDailyWage}/day expected</span>
                      <span>· Trust {worker.trustScore}/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-600">{app.matchScore}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Match</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <Button variant="secondary" size="sm" iconLeft={<MessageSquare className="h-3.5 w-3.5" />}>Contact</Button>
                  {app.status !== "shortlisted" && app.status !== "selected" && app.status !== "rejected" && (
                    <Button variant="primary" size="sm" onClick={() => updateApp(app.id, "shortlisted")}>Shortlist</Button>
                  )}
                  {app.status !== "selected" && app.status !== "rejected" && (
                    <Button variant="success" size="sm" onClick={() => hire(app.id)}>Hire</Button>
                  )}
                  {app.status !== "rejected" && (
                    <Button variant="ghost" size="sm" onClick={() => updateApp(app.id, "rejected")}>Reject</Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
