"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { timeAgo } from "@/lib/utils";

export default function AdminApplicationsPage() {
  const apps = useStore((s) => s.applications);
  const workers = useStore((s) => s.users.filter((u) => u.role === "worker"));
  const workerProfiles = useStore((s) => s.workerProfiles);
  const jobs = useStore((s) => s.jobs);
  const contractors = useStore((s) => s.users.filter((u) => u.role === "contractor"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const enriched = useMemo(() => apps.map((a) => {
    const w = workers.find((x) => x.id === a.workerId);
    const p = workerProfiles.find((x) => x.userId === a.workerId);
    const j = jobs.find((x) => x.id === a.jobId);
    return { app: a, worker: w, profile: p, job: j };
  }), [apps, workers, workerProfiles, jobs]);

  const filtered = useMemo(() => enriched.filter(({ app, worker, job }) => {
    if (search) {
      const q = search.toLowerCase();
      if (!worker?.name.toLowerCase().includes(q) && !job?.title.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    return true;
  }), [enriched, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Applications</h2>
        <p className="text-sm text-gray-700 mt-1">{apps.length} total applications across the platform</p>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Search by worker or job…" value={search} onChange={(e) => setSearch(e.target.value)} iconLeft={<Search className="h-4 w-4" />} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 text-sm rounded-lg border border-gray-300 bg-white">
            <option value="all">All statuses</option>
            <option value="applied">Applied</option>
            <option value="viewed">Viewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>
          <div className="text-sm text-gray-600 self-center">{filtered.length} applications</div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Worker</th>
                <th className="px-4 py-3 font-semibold">Job</th>
                <th className="px-4 py-3 font-semibold">Contractor</th>
                <th className="px-4 py-3 font-semibold text-right">Match</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Applied</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ app, worker, job }) => {
                const contractor = contractors.find((c) => c.id === job?.contractorId);
                return (
                  <tr key={app.id} className="border-b border-gray-200 hover:bg-cream-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={worker?.avatar} name={worker?.name ?? "?"} size={28} />
                        <span className="font-medium text-navy-900">{worker?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job?.title}</td>
                    <td className="px-4 py-3 text-gray-700">{contractor?.name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-orange-600">{app.matchScore}%</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{timeAgo(app.appliedAt)}</td>
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
