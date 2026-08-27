"use client";

import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TrendingUp, ArrowRight, Sparkles, GraduationCap, BookOpen, ChevronRight, CheckCircle2, Clock, Wallet, MapPin } from "lucide-react";
import Link from "next/link";

const PATH = [
  {
    role: "Mason",
    current: true,
    wage: "₹900/day",
    demand: "High",
    skills: ["Masonry", "Brickwork"],
    learning: "—",
  },
  {
    role: "Tile Fitter",
    wage: "₹1,150/day",
    demand: "Very High",
    skills: ["Tiling", "Grouting", "Tile Cutting"],
    learning: "6 weeks",
    boost: "+27%",
  },
  {
    role: "Senior Tile Specialist",
    wage: "₹1,400/day",
    demand: "High",
    skills: ["Pattern design", "Marble work", "Estimation"],
    learning: "4 months",
    boost: "+22%",
  },
  {
    role: "Site Supervisor",
    wage: "₹1,800/day",
    demand: "High",
    skills: ["Team mgmt", "Quality control", "Safety"],
    learning: "6 months",
    boost: "+29%",
  },
];

const COURSES = [
  { title: "Tile Fitting Foundations", provider: "Skill India", duration: "6 weeks", impact: "+27% wage" },
  { title: "Advanced Masonry", provider: "NSDC", duration: "4 weeks", impact: "+12% wage" },
  { title: "Site Safety Certification", provider: "BIS", duration: "2 weeks", impact: "+5 trust" },
];

import { Modal } from "@/components/ui/Modal";
import { useState } from "react";
import { useStore } from "@/lib/store";

export default function WorkerCareerPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const enrollCourse = useStore((s) => s.enrollCourse);
  const enrolledCourses = useStore((s) => s.enrolledCourses || []);

  const [selectedRole, setSelectedRole] = useState<typeof PATH[0] | null>(null);

  const handleEnroll = (courseTitle: string) => {
    enrollCourse(currentUserId, courseTitle);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Card className="bg-navy-900 text-white border-navy-900 overflow-hidden relative">
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />
        <CardBody className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <div className="text-xs uppercase tracking-wider text-purple-400 font-semibold">AI Career Path</div>
          </div>
          <h2 className="text-2xl font-bold leading-tight">Grow from today's work into tomorrow's career.</h2>
          <p className="text-sm text-gray-300 mt-2 max-w-2xl">
            Based on your skills, location, and local market demand, here's a recommended path that could grow your daily wage by 50–100% over 18 months.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your career path</CardTitle>
          <CardSubtitle>Click any stage to see how to get there</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {PATH.map((p, i) => (
                <div key={p.role} className="flex gap-4 items-stretch relative">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    p.current ? "bg-orange-600 text-white shadow-elevated" : "bg-white border-2 border-gray-300 text-gray-500"
                  }`}>
                    {p.current ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <div className={`flex-1 p-4 rounded-card border ${
                    p.current ? "border-orange-600 bg-orange-100" : "border-gray-200 bg-white"
                  }`}>
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-navy-900">{p.role}</h3>
                          {p.current && <Badge variant="orange">You are here</Badge>}
                          {p.boost && <Badge variant="green" iconLeft={<TrendingUp className="h-3 w-3" />}>{p.boost}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                          <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {p.wage}</span>
                          <span>· {p.demand} demand</span>
                          {p.learning !== "—" && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.learning}</span>}
                        </div>
                      </div>
                      {!p.current && (
                        <Button variant="secondary" size="sm" onClick={() => setSelectedRole(p)}>
                          Learn how
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.map((s) => (
                        <Badge key={s} variant={p.current ? "orange" : "default"}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommended courses</CardTitle>
            <CardSubtitle>Free and subsidized training near you</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {COURSES.map((c) => {
              const isEnrolled = enrolledCourses.some((item) => item.courseTitle === c.title && item.userId === currentUserId);
              return (
                <div key={c.title} className="p-4 rounded-lg border border-gray-200 hover:border-orange-500/40 transition flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{c.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                      <span>{c.provider}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.duration}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="green">{c.impact}</Badge>
                    <Button
                      size="sm"
                      variant={isEnrolled ? "primary" : "secondary"}
                      iconRight={isEnrolled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => handleEnroll(c.title)}
                    >
                      {isEnrolled ? "Enrolled" : "Enroll"}
                    </Button>
                  </div>
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
      <Modal open={!!selectedRole} onClose={() => setSelectedRole(null)} title={`Career Roadmap: ${selectedRole?.role}`}>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-2">
            <div className="text-xs uppercase tracking-wider text-orange-600 font-semibold">Target Earning</div>
            <div className="text-2xl font-bold text-navy-900">{selectedRole?.wage}</div>
            <p className="text-xs text-gray-700">
              Estimated wage increase of <span className="font-bold text-green-600">{selectedRole?.boost}</span> with <span className="font-semibold">{selectedRole?.demand} market demand</span>.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-navy-900 mb-1.5">Required Skills to Master:</h4>
            <div className="flex flex-wrap gap-1.5">
              {selectedRole?.skills.map((s) => (
                <Badge key={s} variant="orange">{s}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-navy-900 mb-1.5">Preparation Time:</h4>
            <p className="text-sm text-gray-700">
              Approximately <span className="font-semibold text-navy-900">{selectedRole?.learning}</span> of hands-on vocational training or on-site apprenticeship.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setSelectedRole(null)}>Close</Button>
            <Link href="/worker/assistant">
              <Button variant="ai" onClick={() => setSelectedRole(null)}>
                Ask AI Roadmap Plan
              </Button>
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}
