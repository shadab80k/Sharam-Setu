"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TrendingUp, ArrowRight, Sparkles, CheckCircle2, Clock, Wallet, Briefcase } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getProfession, professionSkills, professionJobKeywords } from "@/lib/services/professions";
import { estimateWage } from "@/lib/services/wageEstimator";
import { getCity } from "@/lib/utils/cities";

/**
 * Courses are real catalog entries (provider + duration) — no invented
 * "wage impact" percentages. Relevance comes from the profession each
 * course trains for; enrollment flows through the existing API.
 */
const COURSES: { title: string; provider: string; duration: string; forProfession: string | null }[] = [
  { title: "Tile Fitting Foundations", provider: "Skill India", duration: "6 weeks", forProfession: "Tile Fitter" },
  { title: "Advanced Masonry", provider: "NSDC", duration: "4 weeks", forProfession: "Mason" },
  { title: "Electrical Basics", provider: "NSDC", duration: "8 weeks", forProfession: "Electrician" },
  { title: "Site Safety Certification", provider: "BIS", duration: "2 weeks", forProfession: null },
];

interface Stage {
  name: string;
  isCurrent: boolean;
  wage: number;
  weeks: number | null;
  skills: string[];
  openJobs: number;
}

export default function WorkerCareerPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const enrollCourse = useStore((s) => s.enrollCourse);
  const enrolledCourses = useStore((s) => s.enrolledCourses || []);

  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);

  const cityId = user?.location || "lucknow";
  const city = getCity(cityId);

  const stages: Stage[] = useMemo(() => {
    if (!profile) return [];
    const start = getProfession(profile.profession);
    if (!start) return [];

    const build = (profName: string, isCurrent: boolean): Stage | null => {
      const prof = getProfession(profName);
      if (!prof) return null;
      const skills = professionSkills(profName);
      const keywords = professionJobKeywords(profName);
      const openJobs = jobs.filter((j) => {
        if (j.location !== cityId) return false;
        const title = j.title.toLowerCase();
        return (
          skills.some((s) => j.requiredSkills.includes(s)) ||
          keywords.some((k) => title.includes(k))
        );
      }).length;
      return {
        name: prof.name,
        isCurrent,
        wage: estimateWage(prof.name, profile.experienceYears, cityId).recommended,
        weeks: isCurrent ? null : (getProfession(profName)?.nextStepWeeks ?? null),
        skills,
        openJobs,
      };
    };

    const list: Stage[] = [];
    const first = build(start.name, true);
    if (!first) return [];
    list.push(first);
    let cursor = start;
    while (cursor.nextStep && list.length < 4) {
      const stage = build(cursor.nextStep, false);
      if (!stage) break;
      list.push(stage);
      const next = getProfession(cursor.nextStep);
      if (!next) break;
      cursor = next;
    }
    return list;
  }, [profile, jobs, cityId]);

  const handleEnroll = (courseTitle: string) => {
    enrollCourse(currentUserId, courseTitle);
  };

  if (!profile) return null;

  const currentWage = stages[0]?.wage ?? 0;
  const lastWage = stages.length ? stages[stages.length - 1].wage : 0;
  const pathProfessions = stages.map((s) => s.name);

  if (stages.length === 0) {
    // Unknown/custom profession — no fake path to show
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardBody className="text-center py-10 px-6">
            <Briefcase className="h-10 w-10 text-orange-600 mx-auto" />
            <h2 className="text-xl font-bold text-navy-900 mt-3">Set your profession first</h2>
            <p className="text-sm text-gray-700 mt-2">
              Your career path is built from your trade. Add your profession in your profile and we&apos;ll
              map out the growth steps for {city.name}.
            </p>
            <Link href="/worker/profile">
              <Button className="mt-4">Edit profile</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Card className="bg-navy-900 text-white border-navy-900 overflow-hidden relative">
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <CardBody className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <div className="text-xs uppercase tracking-wider text-purple-400 font-semibold">Your Career Path</div>
          </div>
          <h2 className="text-2xl font-bold leading-tight">
            {stages.length > 1
              ? `Grow from ${stages[0].name} to ${stages[stages.length - 1].name}.`
              : `You're at the top of the ${stages[0].name} ladder.`}
          </h2>
          <p className="text-sm text-gray-300 mt-2 max-w-2xl">
            {stages.length > 1 ? (
              <>
                Based on your trade, {profile.experienceYears} years of experience and {city.name} rates, this path
                could take your wage from about <span className="text-orange-400 font-semibold">₹{currentWage}/day</span> to{" "}
                <span className="text-orange-400 font-semibold">₹{lastWage}/day</span>.
              </>
            ) : (
              <>
                As a {stages[0].name} in {city.name}, the wage model estimates about{" "}
                <span className="text-orange-400 font-semibold">₹{currentWage}/day</span> at your experience level.
                Keep building skills and reviews to stay in demand.
              </>
            )}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your career path</CardTitle>
          <CardSubtitle>Wages are estimates from the {city.name} rate model · open jobs are live counts</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {stages.map((stage, i) => {
                const boost = stage.isCurrent ? null : Math.round(((stage.wage - currentWage) / Math.max(currentWage, 1)) * 100);
                return (
                  <div key={stage.name} className="flex gap-4 items-stretch relative">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      stage.isCurrent ? "bg-orange-600 text-white shadow-elevated" : "bg-white border-2 border-gray-300 text-gray-500"
                    }`}>
                      {stage.isCurrent ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                    </div>
                    <div className={`flex-1 p-4 rounded-card border ${
                      stage.isCurrent ? "border-orange-600 bg-orange-100" : "border-gray-200 bg-white"
                    }`}>
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-navy-900">{stage.name}</h3>
                            {stage.isCurrent && <Badge variant="orange">You are here</Badge>}
                            {boost !== null && boost > 0 && (
                              <Badge variant="green" iconLeft={<TrendingUp className="h-3 w-3" />}>+{boost}% est.</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                            <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> ₹{stage.wage}/day (est.)</span>
                            <span className={`flex items-center gap-1 ${stage.openJobs === 0 ? "text-amber-700" : ""}`}>
                              <Briefcase className="h-3 w-3" />
                              {stage.openJobs > 0 ? `${stage.openJobs} open ${stage.openJobs === 1 ? "job" : "jobs"} in ${city.name}` : "No open jobs right now"}
                            </span>
                            {stage.weeks && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{stage.weeks} weeks training</span>}
                          </div>
                        </div>
                        {!stage.isCurrent && (
                          <Button variant="secondary" size="sm" onClick={() => setSelectedStage(stage)}>
                            Learn how
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {stage.skills.map((s) => (
                          <Badge key={s} variant={stage.isCurrent ? "orange" : "default"}>{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommended courses</CardTitle>
            <CardSubtitle>Free and subsidized training that matches your path</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {COURSES.filter((c) => c.forProfession === null || pathProfessions.includes(c.forProfession)).map((c) => {
              const isEnrolled = enrolledCourses.some((item) => item.courseTitle === c.title && item.userId === currentUserId);
              return (
                <div key={c.title} className="p-4 rounded-lg border border-gray-200 hover:border-orange-500/40 transition flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{c.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{c.provider}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.duration}</span>
                      {c.forProfession && (
                        <>
                          <span>·</span>
                          <span>For: {c.forProfession}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isEnrolled ? "primary" : "secondary"}
                    iconRight={isEnrolled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    onClick={() => handleEnroll(c.title)}
                  >
                    {isEnrolled ? "Enrolled" : "Enroll"}
                  </Button>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card className="bg-purple-100 border-purple-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-semibold text-purple-600">AI Career Coach</div>
            </div>
            <p className="text-sm text-navy-900 mb-3">
              Want a deeper look at your career options? Ask the AI for personalized learning paths based on your strengths.
            </p>
            <Link href="/worker/assistant">
              <Button variant="ai" size="sm" fullWidth iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
                Ask AI coach
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Stage Details Modal */}
      <Modal open={!!selectedStage} onClose={() => setSelectedStage(null)} title={`Career Roadmap: ${selectedStage?.name}`}>
        {selectedStage && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2">
              <div className="text-xs uppercase tracking-wider text-orange-600 font-semibold">Estimated earning</div>
              <div className="text-2xl font-bold text-navy-900">₹{selectedStage.wage}/day</div>
              <p className="text-xs text-gray-700">
                Wage-model estimate for a {selectedStage.name} in {city.name} at your experience level
                {selectedStage.wage > currentWage && (
                  <> — about <span className="font-bold text-green-600">₹{selectedStage.wage - currentWage}/day more</span> than your trade today.</>
                )}
                .
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-navy-900 mb-1.5">Skills to master:</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedStage.skills.map((s) => (
                  <Badge key={s} variant="orange">{s}</Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-navy-900 mb-1.5">Preparation time:</h4>
              <p className="text-sm text-gray-700">
                {selectedStage.weeks
                  ? `Typically around ${selectedStage.weeks} weeks of hands-on vocational training or on-site apprenticeship.`
                  : "Learn on the job — most workers pick this trade up while working."}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-navy-900 mb-1.5">Current openings:</h4>
              <p className="text-sm text-gray-700">
                {selectedStage.openJobs > 0
                  ? `${selectedStage.openJobs} active ${selectedStage.openJobs === 1 ? "job" : "jobs"} in ${city.name} match this trade right now.`
                  : `No matching open jobs in ${city.name} at the moment — openings change daily.`}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedStage(null)}>Close</Button>
              <Link href="/worker/assistant">
                <Button variant="ai" onClick={() => setSelectedStage(null)}>
                  Ask AI Roadmap Plan
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
