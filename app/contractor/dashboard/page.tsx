"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TrustRing } from "@/components/ui/TrustRing";
import { WorkerProfileModal } from "@/components/features/WorkerProfileModal";
import {
  Briefcase,
  Users,
  Wallet,
  Star,
  CheckCircle2,
  ArrowRight,
  Hammer,
  TrendingUp,
  ShieldCheck,
  Award,
} from "lucide-react";
import Link from "next/link";
import { formatINRShort } from "@/lib/utils";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";
import { useMemo, useState } from "react";
import type { Job, User, WorkerProfile } from "@/lib/types";

const PIPELINE = [
  { key: "new", label: "New", statuses: ["applied"] },
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted"] },
  { key: "selected", label: "On the job", statuses: ["selected"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "rejected", label: "Rejected", statuses: ["rejected"] },
] as const;

type Recommended = {
  worker: WorkerProfile;
  user: User;
  job: Job;
  match: ReturnType<typeof calculateMatchScore>;
};

export default function ContractorDashboard() {
  const userId = useStore((s) => s.currentUserId) || "";
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === userId));
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === userId));
  const apps = useStore((s) => s.applications);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const verifications = useStore((s) => s.verifications);
  const inviteWorker = useStore((s) => s.inviteWorker);
  const payments = useStore((s) => s.payments.filter((p) => p.contractorId === userId));
  const currentLocation = useStore((s) => s.currentLocation);
  const city = CITIES.find((c) => c.id === currentLocation) || CITIES[0];

  const [selectedWorkerMatch, setSelectedWorkerMatch] = useState<Recommended | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const applicants = apps.filter((a) => jobs.some((j) => j.id === a.jobId)).length;
  const hired = jobs.reduce((s, j) => s + j.workersHired, 0);
  const pendingPayments = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const myApps = apps.filter((a) => jobs.some((j) => j.id === a.jobId));

  // Best match for each worker across ALL active jobs with open positions
  const recommended = useMemo<Recommended[]>(() => {
    const openJobs = jobs.filter((j) => j.status === "active" && j.workersHired < j.workersNeeded);
    if (openJobs.length === 0) return [];
    return workers
      .filter((w) => w.availability !== "unavailable")
      .map((w) => {
        let best: Recommended | null = null;
        for (const job of openJobs) {
          if (apps.some((a) => a.jobId === job.id && a.workerId === w.userId)) continue;
          const match = calculateMatchScore(job, w, profile, city);
          if (!best || match.matchScore > best.match.matchScore) {
            const u = users.find((x) => x.id === w.userId);
            if (!u) continue;
            best = { worker: w, user: u, job, match };
          }
        }
        return best;
      })
      .filter((r): r is Recommended => r !== null)
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, 4);
  }, [workers, jobs, apps, profile, city, users]);

  const isIdVerified = (workerId: string) =>
    verifications.some((v) => v.userId === workerId && v.type === "identity" && v.status === "verified");
  const contractorIdVerified = isIdVerified(userId);

  const handleShortlist = async (r: Recommended) => {
    try {
      await inviteWorker(r.job.id, r.worker.userId);
      setInvitedIds((prev) => new Set(prev).add(r.worker.userId));
      setSelectedWorkerMatch(null);
    } catch {
      // store already showed the toast
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Good morning, {user.name}.</h2>
        <p className="text-sm text-gray-700 mt-1">Here's your hiring and payment overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Jobs"
          value={activeJobs}
          icon={<Briefcase className="h-5 w-5" />}
          tone="orange"
          hint={`${jobs.length} total`}
        />
        <MetricCard
          label="Applicants"
          value={applicants}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
          hint={`${myApps.filter((a) => Date.now() - new Date(a.appliedAt).getTime() < 7 * 86400000).length} this week`}
        />
        <MetricCard
          label="Workers Hired"
          value={hired}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="green"
          hint="Across all jobs"
        />
        <MetricCard
          label="Pending Payments"
          value={formatINRShort(pendingPayments)}
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
          hint={`${payments.filter((p) => p.status !== "paid").length} pending`}
        />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Hiring pipeline</CardTitle>
            <CardSubtitle>Track applicants across all your jobs</CardSubtitle>
          </div>
          <Link href="/contractor/applicants">
            <Button variant="tertiary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              Manage
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {PIPELINE.map((p) => {
              const count = myApps.filter((a) => (p.statuses as readonly string[]).includes(a.status)).length;
              const width = myApps.length > 0 ? Math.round((count / myApps.length) * 100) : 0;
              return (
                <div key={p.key} className="p-3 rounded-lg border border-gray-200 bg-cream-50">
                  <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">{p.label}</div>
                  <div className="text-2xl font-bold text-navy-900 mt-1">{count}</div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recommended Workers Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Recommended workers</CardTitle>
              <CardSubtitle>Top matches based on your open jobs</CardSubtitle>
            </div>
            <Link href="/contractor/workers">
              <Button variant="tertiary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
                Find more
              </Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {recommended.length === 0 ? (
              <p className="text-sm text-gray-600">No recommendations yet. Post a job to get matches.</p>
            ) : (
              recommended.slice(0, 3).map((r) => (
                <div
                  key={r.worker.userId}
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-orange-500/50 hover:shadow-soft transition-all flex items-center gap-3 bg-white"
                >
                  <Avatar src={r.user.avatar} name={r.user.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-navy-900">{r.user.name}</div>
                      {isIdVerified(r.worker.userId) ? (
                        <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-2.5 w-2.5" />}>
                          ID Verified
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {r.worker.profession} · {r.worker.experienceYears} yrs · {r.worker.rating.toFixed(1)}★
                    </div>
                    <div className="text-xs text-gray-700 mt-1 truncate">
                      For <span className="font-medium">{r.job.title}</span> · Trust {r.worker.trustScore}/100 · ₹{r.worker.expectedDailyWage}/day
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-600">{r.match.matchScore}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Match</div>
                  </div>
                  {invitedIds.has(r.worker.userId) ? (
                    <Badge variant="orange" size="sm">Invited</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleShortlist(r)}>
                      Shortlist
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Fixed & Enhanced Trust & Reputation Card */}
        <Card className="bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 text-white border-navy-900 shadow-soft h-full flex flex-col justify-between p-6">
          <div className="space-y-4">
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-orange-500" />
                <span className="text-[11px] uppercase tracking-wider text-orange-400 font-bold">
                  Trust & Reputation
                </span>
              </div>
              <Badge variant={contractorIdVerified ? "green" : "gray"} size="sm">
                {contractorIdVerified ? "ID Verified" : "Trust-based"}
              </Badge>
            </div>

            {/* Score & Ring Section */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {profile.trustScore}
                  <span className="text-base font-normal text-gray-400">/100</span>
                </div>
                <div className="text-xs font-semibold text-green-400 mt-0.5">{profile.trustLabel}</div>
              </div>
              <TrustRing score={profile.trustScore} size={58} showLabel={false} />
            </div>

            {/* Detailed Performance Metrics */}
            <div className="space-y-2.5 pt-1">
              {profile.paidPayments > 0 ? (
                <div>
                  <div className="flex justify-between text-xs text-gray-300 mb-1">
                    <span>Payment reliability</span>
                    <span className="font-bold text-white">{profile.paymentReliability}% on time</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${profile.paymentReliability >= 80 ? "bg-green-500" : profile.paymentReliability >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${profile.paymentReliability}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Payment reliability</span>
                  <span className="italic">No payments yet</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-xs text-gray-300">
                <span>Jobs completed</span>
                <span className="font-bold text-white">{profile.completedJobs} contracts</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-300">
                <span>Contractor rating</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400" /> {profile.rating.toFixed(1)} / 5.0
                </span>
              </div>
            </div>
          </div>

          {/* Footer Action Link */}
          <div className="mt-5 pt-3 border-t border-white/10">
            <Link
              href="/contractor/reviews"
              className="flex items-center justify-between text-xs text-orange-400 hover:text-orange-300 font-semibold group transition"
            >
              <span>View all reviews & badges</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Interactive Worker Profile Modal — shortlist invites the worker to the best-matching job */}
      {selectedWorkerMatch && (
        <WorkerProfileModal
          open
          onClose={() => setSelectedWorkerMatch(null)}
          worker={selectedWorkerMatch.worker}
          user={selectedWorkerMatch.user}
          matchScore={selectedWorkerMatch.match.matchScore}
          matchReasons={selectedWorkerMatch.match.reasons}
          onShortlist={() => void handleShortlist(selectedWorkerMatch)}
        />
      )}
    </div>
  );
}
