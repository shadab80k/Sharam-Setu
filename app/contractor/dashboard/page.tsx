"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Briefcase, Users, Wallet, Star, CheckCircle2, ArrowRight, Hammer, TrendingUp, Clock, X } from "lucide-react";
import Link from "next/link";
import { formatINR, formatINRShort, timeAgo } from "@/lib/utils";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";
import { useMemo } from "react";

const PIPELINE = [
  { key: "new", label: "New", statuses: ["applied", "viewed"] },
  { key: "shortlisted", label: "Shortlisted", statuses: ["shortlisted"] },
  { key: "selected", label: "Selected", statuses: ["selected", "interview"] },
  { key: "working", label: "Working", statuses: ["selected"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
] as const;

export default function ContractorDashboard() {
  const userId = "usr_c_1";
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === userId));
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === userId));
  const apps = useStore((s) => s.applications);
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const payments = useStore((s) => s.payments.filter((p) => p.contractorId === userId));
  const currentLocation = useStore((s) => s.currentLocation);
  const city = CITIES.find((c) => c.id === currentLocation) || CITIES[0];

  const activeJobs = jobs.filter((j) => j.status === "active").length;
  const applicants = apps.filter((a) => jobs.some((j) => j.id === a.jobId)).length;
  const hired = jobs.reduce((s, j) => s + j.workersHired, 0);
  const pendingPayments = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);

  const myApps = apps.filter((a) => jobs.some((j) => j.id === a.jobId));

  const recommended = useMemo(() => {
    return workers
      .map((w) => {
        const job = jobs[0];
        if (!job) return null;
        const match = calculateMatchScore(job, w, profile, city);
        const u = users.find((x) => x.id === w.userId);
        return { worker: w, user: u, match };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.match.matchScore ?? 0) - (a?.match.matchScore ?? 0))
      .slice(0, 4) as any[];
  }, [workers, jobs, profile, city, users]);

  if (!user || !profile) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Good morning, {user.name}.</h2>
        <p className="text-sm text-gray-700 mt-1">Here's your hiring and payment overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Jobs" value={activeJobs} icon={<Briefcase className="h-5 w-5" />} tone="orange" hint={`${jobs.length} total`} />
        <MetricCard label="Applicants" value={applicants} icon={<Users className="h-5 w-5" />} tone="blue" trend={{ value: 24, positive: true }} hint="This week" />
        <MetricCard label="Workers Hired" value={hired} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" hint="Across all jobs" />
        <MetricCard label="Pending Payments" value={formatINRShort(pendingPayments)} icon={<Wallet className="h-5 w-5" />} tone="amber" hint={`${payments.filter((p) => p.status !== "paid").length} pending`} />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Hiring pipeline</CardTitle>
            <CardSubtitle>Track applicants across all your jobs</CardSubtitle>
          </div>
          <Link href="/contractor/applicants">
            <Button variant="tertiary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>Manage</Button>
          </Link>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {PIPELINE.map((p) => {
              const count = myApps.filter((a) => (p.statuses as readonly string[]).includes(a.status)).length;
              return (
                <div key={p.key} className="p-3 rounded-lg border border-gray-200 bg-cream-50">
                  <div className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">{p.label}</div>
                  <div className="text-2xl font-bold text-navy-900 mt-1">{count}</div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-600"
                      style={{ width: `${Math.min(100, count * 25)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Recommended workers</CardTitle>
              <CardSubtitle>Top matches based on your open jobs</CardSubtitle>
            </div>
            <Link href="/contractor/workers">
              <Button variant="tertiary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>Find more</Button>
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {recommended.length === 0 ? (
              <p className="text-sm text-gray-600">No recommendations yet. Post a job to get matches.</p>
            ) : (
              recommended.slice(0, 3).map((r) => (
                <div key={r.worker.userId} className="p-3 rounded-lg border border-gray-200 hover:border-orange-500/40 transition flex items-center gap-3">
                  <Avatar src={r.user.avatar} name={r.user.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-navy-900">{r.user.name}</div>
                      <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-2.5 w-2.5" />}>Verified</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {r.worker.profession} · {r.worker.experienceYears} yrs · {r.worker.rating.toFixed(1)}★
                    </div>
                    <div className="text-xs text-gray-700 mt-1">Trust {r.worker.trustScore}/100 · ₹{r.worker.expectedDailyWage}/day</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-600">{r.match.matchScore}%</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Match</div>
                  </div>
                  <Button size="sm">View</Button>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white border-navy-900">
          <CardBody>
            <div className="flex items-center gap-2 mb-2">
              <Hammer className="h-4 w-4 text-orange-500" />
              <div className="text-[10px] uppercase tracking-wider text-orange-500 font-semibold">Trust & Reputation</div>
            </div>
            <div className="text-3xl font-bold">{profile.trustScore}<span className="text-lg text-gray-300">/100</span></div>
            <div className="text-sm text-gray-300">{profile.trustLabel}</div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Payment reliability</span>
                <span className="font-semibold">{profile.paymentReliability}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Response rate</span>
                <span className="font-semibold">{profile.responseRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Jobs done</span>
                <span className="font-semibold">{profile.completedJobs}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
