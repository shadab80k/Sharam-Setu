"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { TrustRing } from "@/components/ui/TrustRing";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { calculateTrustScore } from "@/lib/services/trustEngine";
import { ShieldCheck, ArrowUpRight, Sparkles, BookOpen, FileCheck2, Award, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import dynamic from "next/dynamic";

const TrustLineChart = dynamic(() => import("@/components/features/TrustLineChart"), {
  ssr: false,
  loading: () => <div className="h-56 w-full rounded-lg bg-gray-100 animate-pulse" />,
});

import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { useState } from "react";
import { quizFor } from "@/lib/services/quizBank";
import { PROFESSION_NAMES } from "@/lib/services/professions";

export default function WorkerTrustPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const verifications = useStore((s) => s.verifications);
  const assessments = useStore((s) => s.assessments);
  const applications = useStore((s) => s.applications);
  const payments = useStore((s) => s.payments);
  const safetyReports = useStore((s) => s.safetyReports);
  const fraudSignals = useStore((s) => s.fraudSignals);
  const workHistory = useStore((s) => s.workHistory);
  const events = useStore((s) => s.trustEvents.filter((e) => e.userId === currentUserId));
  const completeAssessment = useStore((s) => s.completeAssessment);
  const addWorkHistory = useStore((s) => s.addWorkHistory);
  const addCertification = useStore((s) => s.addCertification);
  const contractors = useStore((s) => s.contractorProfiles);
  const pushToast = useStore((s) => s.pushToast);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);

  // Skill Quiz State — questions follow the selected profession
  const [selectedSkill, setSelectedSkill] = useState(profile?.profession ?? "Mason");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [earnedScore, setEarnedScore] = useState(0);

  // Work Record State
  const [workForm, setWorkForm] = useState({
    role: "Mason",
    contractorId: "",
    startDate: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    rating: 5,
  });

  // Cert Form State
  const [certName, setCertName] = useState("");

  if (!user || !profile) return null;

  const result = calculateTrustScore({
    user,
    profile,
    verifications,
    assessments,
    workHistory,
    applications,
    payments,
    safetyReports,
    fraudSignals,
  });

  // Net score change this calendar month, derived from the server-authored
  // trust_events audit trail (points = score AFTER each change).
  const monthDelta = (() => {
    const snaps = events
      .filter((e) => /score updated/i.test(e.reason))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (snaps.length === 0) return null;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const before = snaps.filter((e) => new Date(e.createdAt) < monthStart);
    if (before.length === 0) return null; // history starts this month — no baseline to compare
    return result.score - before[before.length - 1].points;
  })();

  // Real score trend from the server-authored trust_events audit trail.
  // Recalculation events record the score after the change in `points`
  // ("Score updated from X to Y"); the last point is the live score.
  const trendData = (() => {
    const snapshots = events
      .filter((e) => /score updated/i.test(e.reason))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e) => ({
        month: new Date(e.createdAt).toLocaleString("en-IN", { month: "short" }),
        score: e.points,
      }));
    return [...snapshots.slice(-5), { month: "Now", score: result.score }];
  })();

  // Questions come from the shared quiz bank for the selected profession
  const quizQuestions = quizFor(selectedSkill);

  const handleFinishQuiz = () => {
    let scoreCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) scoreCount += 1;
    });
    const finalScore = Math.round((scoreCount / quizQuestions.length) * 100);
    setEarnedScore(finalScore);
    completeAssessment(currentUserId, selectedSkill, finalScore);
    setQuizSubmitted(true);
    setTimeout(() => {
      setAssessmentModalOpen(false);
      setQuizSubmitted(false);
      setQuizAnswers({});
    }, 1500);
  };

  const handleSaveWorkHistory = () => {
    if (!workForm.contractorId) {
      pushToast("error", "Select the contractor you worked with");
      return;
    }
    addWorkHistory({
      contractorId: workForm.contractorId,
      role: workForm.role,
      startDate: new Date(workForm.startDate).toISOString(),
      endDate: workForm.endDate ? new Date(workForm.endDate).toISOString() : undefined,
      rating: workForm.rating,
    });
    setWorkModalOpen(false);
  };

  const handleSaveCert = () => {
    if (!certName.trim()) return;
    addCertification(currentUserId, certName.trim());
    setCertName("");
    setCertModalOpen(false);
  };

  const improvements = [
    {
      icon: <BookOpen className="h-4 w-4" />,
      title: "Complete skill assessment",
      desc: "Take quick 3-question quiz (+8 trust)",
      impact: 8,
      color: "purple",
      action: () => setAssessmentModalOpen(true),
    },
    {
      icon: <FileCheck2 className="h-4 w-4" />,
      title: "Verify work history",
      desc: "Add completed job records (+6 trust)",
      impact: 6,
      color: "blue",
      action: () => setWorkModalOpen(true),
    },
    {
      icon: <Award className="h-4 w-4" />,
      title: "Add certification",
      desc: "Add training certificates (+4 trust)",
      impact: 4,
      color: "green",
      action: () => setCertModalOpen(true),
    },
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
              {monthDelta !== null && monthDelta !== 0 && (
                <Badge
                  variant={monthDelta > 0 ? "green" : "red"}
                  iconLeft={<ArrowUpRight className={`h-3 w-3 ${monthDelta < 0 ? "rotate-90" : ""}`} />}
                >
                  {monthDelta > 0 ? `+${monthDelta}` : monthDelta} this month
                </Badge>
              )}
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
              <CardSubtitle>Server-recorded score history, latest first-hand data</CardSubtitle>
            </CardHeader>
            <CardBody>
              <TrustLineChart data={trendData} />
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
              <CardSubtitle>Click any option below to boost score</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {improvements.map((i) => (
                <div
                  key={i.title}
                  onClick={i.action}
                  className="p-3 rounded-lg border border-gray-200 hover:border-orange-500/40 hover:bg-cream-50 cursor-pointer transition"
                >
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
                Complete one skill assessment and verify your last 2 work records to reach <span className="font-bold">90+ High Trust</span>.
              </p>
              <Link href="/worker/assistant">
                <Button variant="ai" size="sm" fullWidth className="mt-3">Ask the AI coach</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Skill Assessment Quiz Modal */}
      <Modal open={assessmentModalOpen} onClose={() => setAssessmentModalOpen(false)} title="Skill Assessment Quiz">
        <div className="space-y-4">
          <Select
            label="Skill to Assess"
            value={selectedSkill}
            onChange={(e) => {
              setSelectedSkill(e.target.value);
              setQuizAnswers({});
            }}
            options={PROFESSION_NAMES.map((p) => ({ value: p, label: p }))}
          />

          {quizSubmitted ? (
            <div className="py-8 text-center space-y-2 animate-fade-in">
              <div className={`h-12 w-12 rounded-full text-white flex items-center justify-center mx-auto ${earnedScore >= 60 ? "bg-green-600" : "bg-amber-500"}`}>
                ✓
              </div>
              <h3 className="text-lg font-bold text-navy-900">Assessment Complete!</h3>
              <p className="text-sm text-gray-700">
                You scored <span className="font-bold text-navy-900">{earnedScore}/100</span> in {selectedSkill}.
                {earnedScore >= 60
                  ? " Great work — this counts toward your Trust Score."
                  : " Scores below 60 are not counted toward trust. Try again after some practice!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizQuestions.map((item, qIdx) => (
                <div key={qIdx} className="p-3.5 rounded-lg border border-gray-200 bg-white">
                  <div className="text-sm font-semibold text-navy-900 mb-2">
                    {qIdx + 1}. {item.q}
                  </div>
                  <div className="space-y-1.5">
                    {item.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition ${
                          quizAnswers[qIdx] === optIdx
                            ? "border-orange-600 bg-orange-50 font-medium text-navy-900"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          checked={quizAnswers[qIdx] === optIdx}
                          onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx })}
                          className="accent-orange-600"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="secondary" onClick={() => setAssessmentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleFinishQuiz}
                  disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                >
                  Submit & Boost Trust Score
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Work History Modal */}
      <Modal open={workModalOpen} onClose={() => setWorkModalOpen(false)} title="Add Work History Record">
        <div className="space-y-3">
          <Input
            label="Work Role"
            value={workForm.role}
            onChange={(e) => setWorkForm({ ...workForm, role: e.target.value })}
            placeholder="e.g. Mason, Tile Fitter"
          />
          <Select
            label="Contractor"
            value={workForm.contractorId}
            onChange={(e) => setWorkForm({ ...workForm, contractorId: e.target.value })}
            options={[
              { value: "", label: "Select contractor…" },
              ...contractors.map((c) => ({ value: c.userId, label: c.companyName })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={workForm.startDate}
              onChange={(e) => setWorkForm({ ...workForm, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={workForm.endDate}
              onChange={(e) => setWorkForm({ ...workForm, endDate: e.target.value })}
            />
          </div>
          <Select
            label="Performance Rating"
            value={String(workForm.rating)}
            onChange={(e) => setWorkForm({ ...workForm, rating: Number(e.target.value) })}
            options={[
              { value: "5", label: "5 Stars (Excellent)" },
              { value: "4", label: "4 Stars (Good)" },
              { value: "3", label: "3 Stars (Average)" },
            ]}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setWorkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveWorkHistory}>Save Work Record</Button>
          </div>
        </div>
      </Modal>

      {/* Add Certification Modal */}
      <Modal open={certModalOpen} onClose={() => setCertModalOpen(false)} title="Add Certification">
        <div className="space-y-3">
          <Input
            label="Certification / Course Name"
            placeholder="e.g. Skill India Site Safety Certificate"
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
          />
          <div className="p-3 rounded-lg bg-blue-50 text-xs text-blue-700">
            Adding verified trade certificates adds +4 to +8 points to your Trust Score.
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCertModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCert} disabled={!certName.trim()}>
              Add Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
