"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { TrustRing } from "@/components/ui/TrustRing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { JobCard } from "@/components/features/JobCard";
import { Wallet, TrendingDown, Briefcase, PiggyBank, Sparkles, ArrowRight, MapPin, CheckCircle2, ArrowUpRight, FileCheck2, ShieldCheck } from "lucide-react";
import { formatINR, formatINRShort } from "@/lib/utils";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";
import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import Link from "next/link";

export default function WorkerDashboard() {
  const userId = "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === userId));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const payments = useStore((s) => s.payments.filter((p) => p.workerId === userId));
  const expenses = useStore((s) => s.expenses.filter((e) => e.workerId === userId));
  const currentLocation = useStore((s) => s.currentLocation);
  const city = CITIES.find((c) => c.id === currentLocation) || CITIES[0];

  const todaysIncome = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const savings = todaysIncome - totalExp;
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
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((d, i) => ({ day: d, income: 800 + i * 100 + (i % 2 === 0 ? 200 : 0) }));
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  if (!user || !profile) return null;

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
          <Badge variant={profile.availability === "available" ? "green" : "amber"}>
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-slow" />
            {profile.availability === "available" ? "Available for work" : profile.availability}
          </Badge>
          <Button variant="secondary" size="sm">
            <MapPin className="h-3.5 w-3.5" /> {city.name}
          </Button>
        </div>
      </div>

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
            <TrustRing score={profile.trustScore} size={160} trend={6} />
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
          trend={{ value: 12, positive: true }}
          hint="From 1 paid job"
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
          trend={{ value: 8, positive: true }}
          hint="This month"
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
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeChart}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Line type="monotone" dataKey="income" stroke="#F4511E" strokeWidth={2.5} dot={{ fill: "#F4511E", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-purple-100 border-purple-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-purple-600 font-semibold">AI suggestion</div>
                <div className="text-sm font-semibold text-navy-900">Learn a higher-paying skill</div>
              </div>
            </div>
            <p className="text-sm text-navy-900 mb-4">
              Tile fitting could increase your earning potential by approximately <span className="font-bold">12–18%</span> in your area based on current demand.
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
