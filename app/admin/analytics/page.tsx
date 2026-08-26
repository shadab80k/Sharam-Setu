"use client";

import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { TrendingUp, Users, Briefcase, Wallet, Sparkles } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { formatINR, formatINRShort } from "@/lib/utils";

const incomeImprovement = [
  { m: "Before", v: 18000 },
  { m: "After (3mo)", v: 21200 },
  { m: "After (6mo)", v: 24500 },
  { m: "After (12mo)", v: 28000 },
];

const trustGrowth = [
  { m: "Jan", v: 45 }, { m: "Feb", v: 52 }, { m: "Mar", v: 61 },
  { m: "Apr", v: 70 }, { m: "May", v: 78 }, { m: "Jun", v: 87 },
];

const matching = [
  { m: "Jan", v: 1200 }, { m: "Feb", v: 1480 }, { m: "Mar", v: 1820 },
  { m: "Apr", v: 2100 }, { m: "May", v: 2450 }, { m: "Jun", v: 2800 },
];

const savings = [
  { m: "Cohort 1", v: 12 }, { m: "Cohort 2", v: 22 }, { m: "Cohort 3", v: 28 },
  { m: "Cohort 4", v: 35 }, { m: "Cohort 5", v: 42 },
];

const cities = [
  { name: "Lucknow", value: 320, color: "#F4511E" },
  { name: "Delhi", value: 280, color: "#2367C9" },
  { name: "Mumbai", value: 240, color: "#7047C6" },
  { name: "Jaipur", value: 180, color: "#178B4A" },
  { name: "Kanpur", value: 150, color: "#C77A00" },
  { name: "Noida", value: 130, color: "#D92D20" },
];

const skills = [
  { name: "Masonry", demand: 92 },
  { name: "Plumbing", demand: 85 },
  { name: "Tiling", demand: 78 },
  { name: "Painting", demand: 70 },
  { name: "Wiring", demand: 65 },
  { name: "Carpentry", demand: 60 },
  { name: "Helper", demand: 95 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Impact & Results</h2>
        <p className="text-sm text-gray-700 mt-1">
          Platform impact metrics. <Badge variant="amber" size="sm">Prototype demo figures</Badge>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Workers Empowered" value="1M+" icon={<Users className="h-5 w-5" />} tone="orange" hint="Across 8 cities" />
        <MetricCard label="Jobs Matched" value="250K+" icon={<Briefcase className="h-5 w-5" />} tone="blue" />
        <MetricCard label="Income Increase" value="+20%" icon={<TrendingUp className="h-5 w-5" />} tone="green" />
        <MetricCard label="Savings Improvement" value="+35%" icon={<Wallet className="h-5 w-5" />} tone="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Income improvement</CardTitle>
            <CardSubtitle>Average monthly income: Before vs After ShramSetu</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeImprovement}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(v) => formatINRShort(v)} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => formatINR(v as number)} />
                  <Bar dataKey="v" fill="#F4511E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trust score growth</CardTitle>
            <CardSubtitle>Network average trust score Jan → Jun</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trustGrowth}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Line type="monotone" dataKey="v" stroke="#178B4A" strokeWidth={3} dot={{ fill: "#178B4A", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job matching growth</CardTitle>
            <CardSubtitle>Monthly successful job matches</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={matching}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                  <Area type="monotone" dataKey="v" stroke="#2367C9" fill="#2367C9" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings improvement</CardTitle>
            <CardSubtitle>Worker cohort savings rate progression</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={savings}>
                  <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => `${v}%`} />
                  <Line type="monotone" dataKey="v" stroke="#7047C6" strokeWidth={3} dot={{ fill: "#7047C6", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by city</CardTitle>
            <CardSubtitle>Active jobs distribution</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <div className="h-48 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cities} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {cities.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {cities.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
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
            <CardSubtitle>Top skills requested by contractors</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skills} layout="vertical">
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} formatter={(v: any) => `${v}%`} />
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
