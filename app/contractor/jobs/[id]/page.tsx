"use client";

import { useStore } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { TrustRing } from "@/components/ui/TrustRing";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ArrowLeft, MapPin, Calendar, Users, Wallet, Briefcase, X, Star, CheckCircle2, Shield, MessageSquare, MoreVertical } from "lucide-react";
import Link from "next/link";
import { formatDate, formatINR, timeAgo } from "@/lib/utils";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";
import { useMemo, useState } from "react";
import type { ApplicationStatus, Job } from "@/lib/types";
import { WorkerProfileModal } from "@/components/features/WorkerProfileModal";

type EditForm = {
  title: string;
  wagePerDay: number;
  workersNeeded: number;
  paymentFrequency: Job["paymentFrequency"];
  startDate: string;
  endDate: string;
  description: string;
  safetyNotes: string;
};

export default function ContractorJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useStore((s) => s.currentUserId) || "";
  const job = useStore((s) => s.jobs.find((j) => j.id === id));
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === userId));
  const allApps = useStore((s) => s.applications);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const verifications = useStore((s) => s.verifications);
  const updateApp = useStore((s) => s.updateApplicationStatus);
  const hire = useStore((s) => s.hireWorker);
  const closeJob = useStore((s) => s.closeJob);
  const updateJob = useStore((s) => s.updateJob);
  const pushToast = useStore((s) => s.pushToast);

  const [filter, setFilter] = useState<"all" | "strong">("all");
  const [sort, setSort] = useState<"match" | "trust" | "experience">("match");
  const [modalWorker, setModalWorker] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const apps = useMemo(() => allApps.filter((a) => a.jobId === id), [allApps, id]);
  const city = useMemo(() => CITIES.find((c) => c.name === job?.location), [job]);

  const enriched = useMemo(() => {
    if (!job || !profile || !city) return [];
    return apps
      .map((a) => {
        const w = workers.find((x) => x.userId === a.workerId);
        const u = users.find((x) => x.id === a.workerId);
        if (!w || !u) return null;
        const match = calculateMatchScore(job, w, profile, city);
        return { app: a, worker: w, user: u, match };
      })
      .filter(Boolean) as any[];
  }, [apps, workers, users, job, profile, city]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (filter === "strong") list = list.filter((e) => e.match.matchScore >= 80);
    list.sort((a, b) => {
      if (sort === "match") return b.match.matchScore - a.match.matchScore;
      if (sort === "trust") return b.worker.trustScore - a.worker.trustScore;
      return b.worker.experienceYears - a.worker.experienceYears;
    });
    return list;
  }, [enriched, filter, sort]);

  if (!job) return <div className="text-sm text-gray-600">Job not found.</div>;

  const saveEdit = async () => {
    if (!editForm) return;
    setSaving(true);
    try {
      await updateJob(job.id, {
        title: editForm.title,
        wagePerDay: editForm.wagePerDay,
        workersNeeded: editForm.workersNeeded,
        paymentFrequency: editForm.paymentFrequency,
        description: editForm.description,
        safetyNotes: editForm.safetyNotes,
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: new Date(editForm.endDate).toISOString(),
      });
      pushToast("success", "Job updated");
      setEditForm(null);
    } catch {
      // updateJob already showed the error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card>
        <CardBody className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="orange">{job.category}</Badge>
                <StatusBadge status={job.status} />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 mt-2">{job.title}</h1>
              <p className="text-sm text-gray-700 mt-1">
                {job.location} · Starts {formatDate(job.startDate)} · {job.workersNeeded} workers needed
              </p>
            </div>
            <div className="flex items-center gap-2">
              {job.status !== "completed" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setEditForm({
                      title: job.title,
                      wagePerDay: job.wagePerDay,
                      workersNeeded: job.workersNeeded,
                      paymentFrequency: job.paymentFrequency,
                      startDate: job.startDate.slice(0, 10),
                      endDate: job.endDate.slice(0, 10),
                      description: job.description,
                      safetyNotes: job.safetyNotes,
                    })
                  }
                >
                  Edit
                </Button>
              )}
              {job.status === "active" && (
                <Button variant="ghost" size="sm" onClick={() => closeJob(job.id)}>Close job</Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="p-3 rounded-lg bg-cream-100">
              <div className="text-xs text-gray-600">Wage</div>
              <div className="text-base font-bold text-navy-900 mt-1">₹{job.wagePerDay}/day</div>
            </div>
            <div className="p-3 rounded-lg bg-cream-100">
              <div className="text-xs text-gray-600">Applicants</div>
              <div className="text-base font-bold text-navy-900 mt-1">{apps.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-cream-100">
              <div className="text-xs text-gray-600">Hired</div>
              <div className="text-base font-bold text-navy-900 mt-1">{job.workersHired}/{job.workersNeeded}</div>
            </div>
            <div className="p-3 rounded-lg bg-cream-100">
              <div className="text-xs text-gray-600">Payment</div>
              <div className="text-base font-bold text-navy-900 mt-1 capitalize">{job.paymentFrequency}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Applicants ({apps.length})</CardTitle>
            <CardSubtitle>{apps.filter((a) => a.matchScore >= 80).length} strong matches</CardSubtitle>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 px-3 text-sm rounded-lg border border-gray-300">
              <option value="all">All applicants</option>
              <option value="strong">Strong matches only</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-9 px-3 text-sm rounded-lg border border-gray-300">
              <option value="match">Sort: Match</option>
              <option value="trust">Sort: Trust</option>
              <option value="experience">Sort: Experience</option>
            </select>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">No applicants yet. The job will be visible in worker feeds.</p>
          ) : (
            filtered.map((e) => (
              <ApplicantCard
                key={e.app.id}
                application={e.app}
                worker={e.worker}
                user={e.user}
                matchScore={e.match.matchScore}
                matchReasons={e.match.reasons}
                idVerified={verifications.some(
                  (v) => v.userId === e.app.workerId && v.type === "identity" && v.status === "verified"
                )}
                onAction={(action: "shortlist" | "reject" | "select" | "view") => {
                  if (action === "shortlist") updateApp(e.app.id, "shortlisted");
                  if (action === "reject") updateApp(e.app.id, "rejected");
                  if (action === "select") hire(e.app.id);
                  if (action === "view") setModalWorker(e);
                }}
              />
            ))
          )}
        </CardBody>
      </Card>

      {modalWorker && (
        <WorkerProfileModal
          open={!!modalWorker}
          onClose={() => setModalWorker(null)}
          worker={modalWorker.worker}
          user={modalWorker.user}
          matchScore={modalWorker.match?.matchScore}
          matchReasons={modalWorker.match?.reasons}
          onShortlist={() => updateApp(modalWorker.app.id, "shortlisted")}
          onHire={() => hire(modalWorker.app.id)}
        />
      )}

      {/* Edit job modal */}
      {editForm && (
        <Modal open onClose={() => setEditForm(null)} title="Edit job" size="lg">
          <div className="space-y-4">
            <Input
              label="Job title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Wage per day (₹)"
                type="number"
                value={editForm.wagePerDay}
                onChange={(e) => setEditForm({ ...editForm, wagePerDay: Number(e.target.value) })}
              />
              <Input
                label="Workers needed"
                type="number"
                value={editForm.workersNeeded}
                onChange={(e) => setEditForm({ ...editForm, workersNeeded: Number(e.target.value) })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Start date"
                type="date"
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
              />
              <Input
                label="End date"
                type="date"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              />
            </div>
            <Select
              label="Payment frequency"
              value={editForm.paymentFrequency}
              onChange={(e) => setEditForm({ ...editForm, paymentFrequency: e.target.value as Job["paymentFrequency"] })}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "on-completion", label: "On completion" },
              ]}
            />
            <Textarea
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <Textarea
              label="Safety notes"
              value={editForm.safetyNotes}
              onChange={(e) => setEditForm({ ...editForm, safetyNotes: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={() => setEditForm(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" loading={saving} onClick={saveEdit}>
                Save changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ApplicantCard({ application, worker, user, matchScore, matchReasons, idVerified, onAction }: any) {
  return (
    <div className="p-4 rounded-card border border-gray-200 hover:border-orange-500/40 transition">
      <div className="flex items-start gap-3 flex-wrap">
        <Avatar src={user.avatar} name={user.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/contractor/workers`} className="text-sm font-semibold text-navy-900 hover:text-orange-600">
              {user.name}
            </Link>
            {idVerified && (
              <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-2.5 w-2.5" />}>ID Verified</Badge>
            )}
            <StatusBadge status={application.status} />
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {worker.profession} · {worker.experienceYears} yrs · {worker.rating.toFixed(1)}★ · {user.location}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-700">
            <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Expects ₹{worker.expectedDailyWage}/day</span>
            <span>· Applied {timeAgo(application.appliedAt)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-600">{matchScore}%</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Match</div>
        </div>
        <div>
          <TrustRing score={worker.trustScore} size={64} showLabel={false} />
        </div>
      </div>

      {matchReasons.length > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-green-100">
          <ul className="space-y-0.5">
            {matchReasons.slice(0, 3).map((r: string) => (
              <li key={r} className="text-[11px] text-navy-900 flex items-start gap-1.5">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {worker.skills.slice(0, 4).map((s: string) => (
          <Badge key={s} variant="default">{s}</Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => onAction("view")}>View profile</Button>
        <a
          href={`tel:+91${user.phone}`}
          className="inline-flex items-center justify-center h-8 px-3 text-sm rounded-lg gap-1.5 font-medium transition focus-ring bg-white text-navy-900 border border-gray-300 hover:bg-gray-100"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Contact
        </a>
        {application.status !== "shortlisted" && application.status !== "selected" && application.status !== "rejected" && (
          <>
            <Button variant="primary" size="sm" onClick={() => onAction("shortlist")}>Shortlist</Button>
            <Button variant="success" size="sm" onClick={() => onAction("select")}>Hire</Button>
            <Button variant="ghost" size="sm" onClick={() => onAction("reject")}>Reject</Button>
          </>
        )}
        {application.status === "shortlisted" && (
          <Button variant="success" size="sm" onClick={() => onAction("select")}>Hire</Button>
        )}
      </div>
    </div>
  );
}
