"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendingUp, Users, Briefcase, Wallet, Sparkles, AlertCircle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { formatINR, formatINRShort } from "@/lib/utils";
import { apiGet } from "@/lib/api/client";

interface Analytics {
  totals: {
    workers: number;
    contractors: number;
    activeJobs: number;
    completedJobs: number;
    applications: number;
    hires: number;
    totalWagesFlowed: number;
    pendingWages: number;
    overdueCount: number;
    compliance: number;
    pendingVerifications: number;
    openReports: number;
    avgExpectedWage: number;
    avgCityBaseWage: number;
    avgPaidAmount: number;
  };
  cityDistribution: { name: string; value: number }[];
  skillDemand: { name: string; demand: number }[];
  matchingTrend: { m: string; v: number }[];
  trustTrend: { m: string; v: number | null }[];
  signupGrowth: { m: string; v: number }[];
  generatedAt: string;
}

const PIE_COLORS = ["#F4511E", "#2367C9", "#7047C6", "#178B4A", "#C77A00", "#D92D20", "#0E9388", "#6941C6"];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      setData(await apiGet<Analytics>("/api/admin/analytics"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-8 w-8 text-orange-500" />}
        title="Analytics unavailable"
        description="Live platform data could not be loaded. Check your connection and retry."
        cta={{ label: "Retry", onClick: load }}
      />
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const t = data.totals;
  const wageLift = t.avgCityBaseWage > 0
    ? Math.round(((t.avgExpectedWage - t.avgCityBaseWage) / t.avgCityBaseWage) * 100)
    : 0;
  const wageBars = [
    { m: "City base", v: t.avgCityBaseWage },
    { m: "Worker expected", v: t.avgExpectedWage },
    { m: "Settled avg", v: t.avgPaidAmount },
  ];
  const updated = new Date(data.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Impact & Results</h2>
        <p className="text-sm text-gray-700 mt-1 flex items-center gap-2">
          Live platform metrics, aggregated from the production database.
          <Badge variant="green" size="sm">Live data · {updated}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Workers Onboarded" value={t.workers.toLocaleString("en-IN")} icon={<Users className="h-5 w-5" />} tone="orange" hint={`Across ${data.cityDistribution.length} cities`} />
        <MetricCard label="Hires Completed" value={t.hires.toLocaleString("en-IN")} icon={<Briefcase className="h-5 w-5" />} tone="blue" hint={`${t.applications.toLocaleString("en-IN")} applications`} />
        <MetricCard label="Avg Wage Lift" value={`${wageLift >= 0 ? "+" : ""}${wageLift}%`} icon={<TrendingUp className="h-5 w-5" />} tone="green" hint={`₹${t.avgCityBaseWage} base → ₹${t.avgExpectedWage} expected`} />
        <MetricCard label="Payment Compliance" value={`${t.compliance}%`} icon={<Wallet className="h-5 w-5" />} tone="purple" hint={`${t.overdueCount} overdue`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Average daily wage</CardTitle>
            <CardSubtitle>City base vs worker expected vs settled payments</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wageBars}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(v) => formatINRShort(v as number)} />
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => formatINR(v as number)} />
                  <Bar dataKey="v" fill="#F4511E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust score by signup cohort</CardTitle>
            <CardSubtitle>Average current trust score of workers who joined each month</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trustTrend}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Line type="monotone" dataKey="v" stroke="#178B4A" strokeWidth={3} dot={{ fill: "#178B4A", r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job applications</CardTitle>
            <CardSubtitle>Applications received per month</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.matchingTrend}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Area type="monotone" dataKey="v" stroke="#2367C9" fill="#2367C9" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network signup growth</CardTitle>
            <CardSubtitle>Cumulative workers &amp; contractors on the platform</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.signupGrowth}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Line type="monotone" dataKey="v" stroke="#7047C6" strokeWidth={3} dot={{ fill: "#7047C6", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workers by city</CardTitle>
            <CardSubtitle>Where the workforce is based</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="h-48 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.cityDistribution} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {data.cityDistribution.map((c, i) => <Cell key={c.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {data.cityDistribution.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-navy-900">{c.name}</span>
                    </div>
                    <span className="font-semibold text-navy-900">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill demand</CardTitle>
            <CardSubtitle>Active jobs requesting each skill</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.skillDemand.slice(0, 8)} layout="vertical">
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} width={90} />
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => `${v} job${v === 1 ? "" : "s"}`} />
                  <Bar dataKey="demand" fill="#7047C6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white border-navy-900">
        <CardBody>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-orange-500" />
            <div className="text-[10px] uppercase tracking-wider text-orange-500 font-semibold">Future Roadmap</div>
          </div>
          <h3 className="text-xl font-bold">The journey ahead.</h3>
          <p className="text-sm text-gray-300 mt-2 max-w-2xl">
            Mobile-first experience → IoT & smart integration → Advanced AI models → Ecosystem expansion → Financial integration.
          </p>
          <div className="grid sm:grid-cols-5 gap-3 mt-5">
            {[
              { phase: "Phase 1", title: "Mobile-first", desc: "Native Android & iOS apps" },
              { phase: "Phase 2", title: "IoT integration", desc: "Site safety sensors" },
              { phase: "Phase 3", title: "Advanced AI", desc: "LLM-powered assistance" },
              { phase: "Phase 4", title: "Ecosystem", desc: "Banks, training, tools" },
              { phase: "Phase 5", title: "Financial", desc: "Loans, insurance, savings" },
            ].map((p) => (
              <div key={p.phase} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-orange-500 font-semibold">{p.phase}</div>
                <div className="text-sm font-semibold text-white mt-1">{p.title}</div>
                <div className="text-xs text-gray-300 mt-0.5">{p.desc}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
