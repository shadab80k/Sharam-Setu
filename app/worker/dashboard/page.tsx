"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { TrustRing } from "@/components/ui/TrustRing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { JobCard } from "@/components/features/JobCard";
import { Wallet, TrendingDown, Briefcase, PiggyBank, Sparkles, ArrowRight, CheckCircle2, ArrowUpRight, FileCheck2, ShieldCheck } from "lucide-react";
import { formatINR, formatINRShort } from "@/lib/utils";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";
import { careerSuggestion } from "@/lib/services/professions";
import { workerNeedsOnboarding, workerChecklist } from "@/lib/services/onboarding";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const DashboardIncomeChart = dynamic(() => import("@/components/features/DashboardIncomeChart"), {
  ssr: false,
  loading: () => <div className="h-48 w-full rounded-lg bg-gray-100 animate-pulse" />,
});

export default function WorkerDashboard() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === currentUserId));
  const expenses = useStore((s) => s.expenses.filter((e) => e.workerId === currentUserId));
  const verifications = useStore((s) => s.verifications);
  const assessments = useStore((s) => s.assessments);
  const trustEvents = useStore((s) => s.trustEvents.filter((e) => e.userId === currentUserId));
  const currentLocation = useStore((s) => s.currentLocation);
  const toggleWorkerAvailability = useStore((s) => s.toggleWorkerAvailability);
  const router = useRouter();
  const city = CITIES.find((c) => c.id === currentLocation) || CITIES[0];

  const pending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const savings = totalPaid - totalExp;

  // Net trust-score change this calendar month from the server-authored
  // trust_events audit trail (points = score AFTER each change); undefined
  // when there's no baseline snapshot before this month.
  const monthTrend = useMemo(() => {
    const snaps = trustEvents
      .filter((e) => /score updated/i.test(e.reason))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (!snaps.length || !profile) return undefined;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const before = snaps.filter((e) => new Date(e.createdAt) < monthStart);
    if (!before.length) return undefined;
    return profile.trustScore - before[before.length - 1].points;
  }, [trustEvents, profile]);
  const recommended = useMemo(() => {
    if (!profile) return [];
    return jobs
      .map((j) => {
        const contractor = useStore.getState().contractorProfiles.find((c) => c.userId === j.contractorId);
        const match = calculateMatchScore(j, profile, contractor, city);
        return { ...match, contractor };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 4);
  }, [jobs, profile, city]);

  const incomeChart = useMemo(() => {
    // Real daily earnings — paid payments bucketed over the last 7 days
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - i));
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const income = payments
        .filter((p) => p.status === "paid" && p.paidDate)
        .filter((p) => { const t = new Date(p.paidDate!); return t >= day && t < next; })
        .reduce((s, p) => s + p.amount, 0);
      return { day: day.toLocaleDateString("en-IN", { weekday: "short" }), income };
    });
  }, [payments]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Real "today" income — only payments actually paid today
  const todaysIncome = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const next = new Date(start); next.setDate(next.getDate() + 1);
    return payments
      .filter((p) => p.status === "paid" && p.paidDate)
      .filter((p) => { const t = new Date(p.paidDate!); return t >= start && t < next; })
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);
  const paidCount = payments.filter((p) => p.status === "paid").length;

  // Onboarding: genuinely new workers get the wizard; everyone else sees a checklist
  const needsOnboarding = workerNeedsOnboarding(user, profile);
  const checklist = user && profile
    ? workerChecklist({ user, profile, verifications, assessments })
    : [];
  const checklistDone = checklist.filter((c) => c.done).length;

  // Personalised suggestion — deterministic, derived from the worker's own data
  const suggestion = useMemo(() => {
    if (!user || !profile) return null;
    return careerSuggestion({
      profession: profile.profession,
      experienceYears: profile.experienceYears,
      expectedDailyWage: profile.expectedDailyWage,
      cityId: user.location,
    });
  }, [user, profile]);

  if (!user || !profile) return null;

  // New worker → guided setup (never shows an empty dashboard)
  if (needsOnboarding) return <OnboardingRedirect />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">
            {greeting}, {user.name.split(" ")[0]} <span className="inline-block">👋</span>
          </h2>
          <p className="text-sm text-gray-700 mt-1">
            Here's what's happening with your work today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleWorkerAvailability(currentUserId)}
            title="Click to toggle availability"
            className="cursor-pointer"
          >
            <Badge variant={profile.availability === "available" ? "green" : "amber"}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-slow" />
              {profile.availability === "available" ? "Available for work" : "Working / Busy"}
            </Badge>
          </button>
        </div>
      </div>

      {/* Onboarding checklist — only while profile is incomplete */}
      {checklistDone < checklist.length && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Complete your profile</CardTitle>
              <CardSubtitle>{checklistDone} of {checklist.length} done — a complete profile earns trust and better matches</CardSubtitle>
            </div>
            <div className="text-2xl font-bold text-orange-600">{Math.round((checklistDone / checklist.length) * 100)}%</div>
          </CardHeader>
          <CardBody>
            <ProgressBar value={checklistDone} max={checklist.length} color="#F4511E" />
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {checklist.filter((c) => !c.done).map((c) => (
                <Link key={c.id} href={c.href} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50/50 transition text-sm">
                  <span className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
                  <span className="text-navy-900 font-medium">{c.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400 ml-auto shrink-0" />
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Hero trust panel */}
      <Card className="bg-navy-900 text-white border-navy-900 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-600/20 blur-3xl" />
        <CardBody className="relative grid md:grid-cols-3 gap-6 items-center p-6">
          <div className="md:col-span-1">
            <div className="text-xs uppercase tracking-wider text-orange-500 font-semibold">Your digital identity</div>
            <h3 className="text-2xl font-bold mt-1.5 leading-tight">Getting stronger.</h3>
            <p className="text-sm text-gray-300 mt-2 max-w-xs">
              Complete skill assessments and add certifications to grow your trust.
            </p>
            <Link href="/worker/trust" className="inline-flex items-center gap-1.5 text-orange-500 text-sm font-semibold mt-3 hover:gap-2 transition-all">
              View trust profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex justify-center">
            <TrustRing score={profile.trustScore} size={160} trend={monthTrend} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-lg bg-green-600/20 text-green-500 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-gray-300">Phone verified</div>
                <div className="font-semibold">+10 Trust</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-500 flex items-center justify-center">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-gray-300">Work history verified</div>
                <div className="font-semibold">+9 Trust</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-lg bg-purple-600/20 text-purple-500 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-gray-300">Skills assessment</div>
                <div className="font-semibold">+8 Trust</div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Income"
          value={formatINR(todaysIncome)}
          icon={<Wallet className="h-5 w-5" />}
          tone="green"
          hint={`Paid today · ${paidCount} total paid`}
        />
        <MetricCard
          label="Pending Payments"
          value={formatINRShort(pending)}
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="orange"
          hint={`${payments.filter((p) => p.status !== "paid").length} payments`}
        />
        <MetricCard
          label="Savings"
          value={formatINRShort(Math.max(0, savings))}
          icon={<PiggyBank className="h-5 w-5" />}
          tone="blue"
          hint="Income − expenses"
        />
        <MetricCard
          label="Job Matches"
          value={recommended.length}
          icon={<Briefcase className="h-5 w-5" />}
          tone="purple"
          hint="Within 5 km"
        />
      </div>

      {/* Recommended jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-navy-900">Recommended for you</h3>
            <p className="text-sm text-gray-600">Based on your skills, location, and preferences</p>
          </div>
          <Link href="/worker/jobs">
            <Button variant="tertiary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              View all
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {recommended.slice(0, 2).map((m) => (
            <JobCard
              key={m.job.id}
              job={m.job}
              matchScore={m.matchScore}
              matchReasons={m.reasons}
              distanceKm={m.distanceKm}
            />
          ))}
        </div>
      </div>

      {/* Financial snapshot + AI recommendation */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Income this week</CardTitle>
              <CardSubtitle>Daily earnings from completed work</CardSubtitle>
            </div>
            <Badge variant="green" iconLeft={<ArrowUpRight className="h-3 w-3" />}>+18%</Badge>
          </CardHeader>
          <CardBody>
            <DashboardIncomeChart data={incomeChart} />
          </CardBody>
        </Card>

        <Card className="bg-purple-100 border-purple-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-purple-600 font-semibold">For you</div>
                <div className="text-sm font-semibold text-navy-900">
                  {suggestion?.basis === "wage-gap" ? "Your wage looks low for your trade" : "Grow your income"}
                </div>
              </div>
            </div>
            <p className="text-sm text-navy-900 mb-4">
              {suggestion?.basis === "wage-gap" ? (
                <>
                  Workers with your trade and experience in {city.name} are typically paid around{" "}
                  <span className="font-bold">₹{suggestion.fairWage}/day</span> — you currently expect{" "}
                  ₹{suggestion.currentWage}/day. Check the wage estimate before accepting a low offer.
                </>
              ) : suggestion?.basis === "career-ladder" && suggestion.nextProfession ? (
                <>
                  Based on your profile, <span className="font-bold">{suggestion.nextProfession}</span> work in{" "}
                  {city.name} typically pays around <span className="font-bold">₹{suggestion.nextWage}/day</span>{" "}
                  {suggestion.nextWeeks ? `(learning usually takes about ${suggestion.nextWeeks} weeks)` : ""}.
                </>
              ) : suggestion?.basis === "profile-incomplete" ? (
                <>Add your trade and expected wage in your profile so we can suggest fair pay for your work.</>
              ) : (
                <>Your profile is set up well — keep completing assessments to grow your trust score.</>
              )}
            </p>
            <Link href="/worker/career">
              <Button variant="ai" size="sm" fullWidth iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
                Explore career path
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** Small helper: sends genuinely-new workers to the guided setup wizard. */
function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/worker/onboarding");
  }, [router]);
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <p className="text-sm text-gray-600">Setting up your profile…</p>
    </div>
  );
}
