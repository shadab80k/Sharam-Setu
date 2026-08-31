"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlusCircle, MapPin, Users, Wallet, MoreVertical, Eye, Edit2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/utils";

export default function ContractorJobsPage() {
  const userId = useStore((s) => s.currentUserId) || "";
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === userId));
  const closeJob = useStore((s) => s.closeJob);
  const apps = useStore((s) => s.applications);
  const [tab, setTab] = useState<"active" | "drafts" | "completed" | "closed">("active");

  const filtered = jobs.filter((j) => {
    if (tab === "active") return j.status === "active";
    if (tab === "drafts") return j.status === "draft";
    if (tab === "completed") return j.status === "completed";
    if (tab === "closed") return j.status === "closed";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">My Jobs</h2>
          <p className="text-sm text-gray-700 mt-1">Manage your active and past job postings</p>
        </div>
        <Link href="/contractor/jobs/new">
          <Button iconLeft={<PlusCircle className="h-4 w-4" />}>Post a job</Button>
        </Link>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: "active", label: `Active (${jobs.filter((j) => j.status === "active").length})` },
          { value: "drafts", label: `Drafts (${jobs.filter((j) => j.status === "draft").length})` },
          { value: "completed", label: `Completed (${jobs.filter((j) => j.status === "completed").length})` },
          { value: "closed", label: `Closed (${jobs.filter((j) => j.status === "closed").length})` },
        ]}
      />

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold text-right">Wage</th>
                  <th className="px-4 py-3 font-semibold text-right">Applicants</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-600">
                      No jobs in this category. {tab === "active" && <Link href="/contractor/jobs/new" className="text-orange-600 font-medium">Post your first job →</Link>}
                    </td>
                  </tr>
                ) : (
                  filtered.map((j) => {
                    const jobApps = apps.filter((a) => a.jobId === j.id);
                    return (
                      <tr key={j.id} className="border-b border-gray-200 hover:bg-cream-50">
                        <td className="px-4 py-3">
                          <Link href={`/contractor/jobs/${j.id}`} className="font-medium text-navy-900 hover:text-orange-600">
                            {j.title}
                          </Link>
                          <div className="text-xs text-gray-600">{j.category}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-navy-900">₹{j.wagePerDay}/d</td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-semibold text-navy-900">{jobApps.length}</div>
                          <div className="text-xs text-gray-600">{j.workersHired}/{j.workersNeeded} hired</div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(j.createdAt)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Link href={`/contractor/jobs/${j.id}`}>
                              <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                            </Link>
                            {j.status === "active" && (
                              <Button variant="ghost" size="sm" onClick={() => closeJob(j.id)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
