"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { TrustRing } from "@/components/ui/TrustRing";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { calculateTrustScore } from "@/lib/services/trustEngine";
import { ShieldCheck, ArrowUpRight, Sparkles, BookOpen, FileCheck2, Award, AlertTriangle, Clock } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export default function WorkerTrustPage() {
  const userId = "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === userId));
  const verifications = useStore((s) => s.verifications);
  const assessments = useStore((s) => s.assessments);
  const applications = useStore((s) => s.applications);
  const payments = useStore((s) => s.payments);
  const safetyReports = useStore((s) => s.safetyReports);
  const fraudSignals = useStore((s) => s.fraudSignals);
  const events = useStore((s) => s.trustEvents.filter((e) => e.userId === userId));

  if (!user || !profile) return null;

  const result = calculateTrustScore({
    user, profile, verifications, assessments, workHistory: [], applications, payments, safetyReports, fraudSignals,
  });

  const trendData = [
    { month: "Jan", score: 45 },
    { month: "Feb", score: 52 },
    { month: "Mar", score: 61 },
    { month: "Apr", score: 70 },
    { month: "May", score: 78 },
    { month: "Jun", score: 87 },
  ];

  const improvements = [
    { icon: <BookOpen className="h-4 w-4" />, title: "Complete skill assessment", desc: "Earn up to +10 trust", impact: 10, color: "purple" },
    { icon: <FileCheck2 className="h-4 w-4" />, title: "Verify work history", desc: "Add previous job records", impact: 6, color: "blue" },
    { icon: <Award className="h-4 w-4" />, title: "Add certification", desc: "Upload training certificate", impact: 4, color: "green" },
  ] as const;

  return (
    <div className="space-y-5 max-w-5xl">
      <Card className="bg-navy-900 text-white border-navy-900 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-orange-600/20 blur-3xl" />
        <CardBody className="relative grid md:grid-cols-2 gap-6 p-6 items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-orange-500 font-semibold">Your reputation</div>
            <h2 className="text-2xl font-bold mt-1.5 leading-tight">Travels with you.</h2>
            <p className="text-sm text-gray-300 mt-2 max-w-md">
              Your trust score is your professional passport. It grows with every verified job, completed assessment, and positive review.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Badge variant="green" iconLeft={<ArrowUpRight className="h-3 w-3" />}>+6 this month</Badge>
              <Badge variant="blue">{result.label}</Badge>
            </div>
          </div>
          <div className="flex justify-center">
            <TrustRing score={result.score} size={180} showLabel={false} />
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Score trend</CardTitle>
              <CardSubtitle>Your trust score over the last 6 months</CardSubtitle>
            </CardHeader>
            <CardBody>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #EAECF0" }} />
                    <Line type="monotone" dataKey="score" stroke="#178B4A" strokeWidth={3} dot={{ fill: "#178B4A", r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trust breakdown</CardTitle>
              <CardSubtitle>Where your {result.score}/100 comes from</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {result.breakdown.map((b) => (
                <div key={b.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{b.category}</div>
                      <div className="text-xs text-gray-600">{b.reason}</div>
                    </div>
                    <div className="text-sm font-bold text-navy-900">{b.points}/{b.max}</div>
                  </div>
                  <ProgressBar value={b.points} max={b.max} />
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-navy-900">Total</span>
                <span className="text-lg font-bold text-orange-600">{result.score} / 100</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent trust events</CardTitle>
              <CardSubtitle>Things that changed your score</CardSubtitle>
            </CardHeader>
            <CardBody>
              {events.length === 0 ? (
                <p className="text-sm text-gray-600">No events yet.</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 6).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        e.points > 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      }`}>
                        {e.points > 0 ? "+" : ""}{e.points}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-navy-900 font-medium">{e.reason}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" /> {timeAgo(e.createdAt)}
                        </div>
                      </div>
                      <Badge variant="default" size="sm">{e.category}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Improve your score</CardTitle>
              <CardSubtitle>Quick wins to climb higher</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {improvements.map((i) => (
                <div key={i.title} className="p-3 rounded-lg border border-gray-200 hover:border-orange-500/40 transition">
                  <div className="flex items-start gap-2.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      i.color === "purple" ? "bg-purple-100 text-purple-600" :
                      i.color === "blue" ? "bg-blue-100 text-blue-600" :
                      "bg-green-100 text-green-600"
                    }`}>{i.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-900">{i.title}</div>
                      <div className="text-xs text-gray-600">{i.desc}</div>
                    </div>
                    <Badge variant="green" size="sm">+{i.impact}</Badge>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card className="bg-purple-100 border-purple-100">
            <CardBody>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <div className="text-sm font-semibold text-purple-600">AI Trust Coach</div>
              </div>
              <p className="text-sm text-navy-900">
                Complete one skill assessment and verify your last 2 work records to reach <span className="font-bold">90+ High Trust</span> within 2 weeks.
              </p>
              <Link href="/worker/assistant">
                <Button variant="ai" size="sm" fullWidth className="mt-3">Ask the AI coach</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
