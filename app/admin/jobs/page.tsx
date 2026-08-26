"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search, MapPin, Eye, X } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

export default function AdminJobsPage() {
  const jobs = useStore((s) => s.jobs);
  const users = useStore((s) => s.users);
  const apps = useStore((s) => s.applications);
  const closeJob = useStore((s) => s.closeJob);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => jobs.filter((j) => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !j.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    return true;
  }), [jobs, search, statusFilter]);

  const target = selected ? jobs.find((j) => j.id === selected) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Jobs</h2>
        <p className="text-sm text-gray-700 mt-1">{jobs.length} jobs on the platform</p>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Search jobs…" value={search} onChange={(e) => setSearch(e.target.value)} iconLeft={<Search className="h-4 w-4" />} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 text-sm rounded-lg border border-gray-300 bg-white">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>
          <div className="text-sm text-gray-600 self-center">Showing {filtered.length} of {jobs.length}</div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Contractor</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold text-right">Wage</th>
                <th className="px-4 py-3 font-semibold text-right">Applicants</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const contractor = users.find((u) => u.id === j.contractorId);
                const appCount = apps.filter((a) => a.jobId === j.id).length;
                return (
                  <tr key={j.id} className="border-b border-gray-200 hover:bg-cream-50">
                    <td className="px-4 py-3 font-medium text-navy-900">{j.title}</td>
                    <td className="px-4 py-3 text-gray-700">{contractor?.name}</td>
                    <td className="px-4 py-3 text-gray-700"><span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span></td>
                    <td className="px-4 py-3"><Badge variant="orange" size="sm">{j.category}</Badge></td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-900">₹{j.wagePerDay}/d</td>
                    <td className="px-4 py-3 text-right text-gray-700">{appCount}</td>
                    <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(j.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(j.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Job details" size="lg">
        {target && (
          <div className="space-y-3">
            <div>
              <Badge variant="orange" size="sm">{target.category}</Badge>
              <h3 className="text-lg font-bold text-navy-900 mt-1.5">{target.title}</h3>
              <p className="text-sm text-gray-600">{users.find((u) => u.id === target.contractorId)?.name} · {target.location}</p>
            </div>
            <p className="text-sm text-gray-700">{target.description}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Wage</div>
                <div className="text-base font-bold text-navy-900">₹{target.wagePerDay}/day</div>
              </div>
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Applicants</div>
                <div className="text-base font-bold text-navy-900">{apps.filter((a) => a.jobId === target.id).length}</div>
              </div>
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Hired</div>
                <div className="text-base font-bold text-navy-900">{target.workersHired}/{target.workersNeeded}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {target.status === "active" && (
                <Button variant="destructive" onClick={() => { closeJob(target.id); setSelected(null); }}>
                  <X className="h-4 w-4" /> Close job
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
