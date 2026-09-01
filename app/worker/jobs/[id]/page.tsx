"use client";

import { useStore } from "@/lib/store";
import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { TrustRing } from "@/components/ui/TrustRing";
import { ArrowLeft, MapPin, Calendar, Briefcase, Wallet, Shield, Star, Bookmark, CheckCircle2, AlertTriangle, Clock, Award, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatINR, formatDate } from "@/lib/utils";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";

export default function WorkerJobDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const job = useStore((s) => s.jobs.find((j) => j.id === id));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const contractor = useStore((s) => s.contractorProfiles.find((c) => c.userId === job?.contractorId));
  const contractorUser = useStore((s) => s.users.find((u) => u.id === job?.contractorId));
  const existingApp = useStore((s) => s.applications.find((a) => a.jobId === id && a.workerId === currentUserId));
  const applyToJob = useStore((s) => s.applyToJob);
  const savedJobIds = useStore((s) => s.savedJobIds || []);
  const toggleSaveJob = useStore((s) => s.toggleSaveJob);
  const currentLocation = useStore((s) => s.currentLocation);
  const city = CITIES.find((c) => c.id === currentLocation) || CITIES[0];

  const isSaved = job ? savedJobIds.includes(job.id) : false;

  if (!job || !profile) return <div className="text-sm text-gray-600">Job not found.</div>;

  const match = calculateMatchScore(job, profile, contractor, city);
  const weeklyEstimate = job.wagePerDay * 6;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </button>
        <button
          onClick={() => toggleSaveJob(job.id)}
          title={isSaved ? "Saved" : "Save job"}
          className="text-gray-500 hover:text-orange-600 transition"
        >
          <Bookmark className={`h-5 w-5 ${isSaved ? "fill-orange-600 text-orange-600" : ""}`} />
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="orange">{job.category}</Badge>
                <Badge variant="green" iconLeft={<Star className="h-3 w-3" />}>{match.matchScore}% Match</Badge>
              </div>
              <h1 className="text-2xl font-bold text-navy-900">{job.title}</h1>
              <p className="text-sm text-gray-700 mt-1">{job.location} · {job.wagePerDay}/day · Starts {formatDate(job.startDate)}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="p-3 rounded-lg bg-cream-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600"><Wallet className="h-3.5 w-3.5" /> Wage</div>
                  <div className="text-base font-bold text-navy-900 mt-1">₹{job.wagePerDay}/day</div>
                </div>
                <div className="p-3 rounded-lg bg-cream-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600"><MapPin className="h-3.5 w-3.5" /> Distance</div>
                  <div className="text-base font-bold text-navy-900 mt-1">{match.distanceKm} km</div>
                </div>
                <div className="p-3 rounded-lg bg-cream-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600"><Calendar className="h-3.5 w-3.5" /> Duration</div>
                  <div className="text-base font-bold text-navy-900 mt-1">~14 days</div>
                </div>
                <div className="p-3 rounded-lg bg-cream-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600"><Clock className="h-3.5 w-3.5" /> Schedule</div>
                  <div className="text-base font-bold text-navy-900 mt-1">{job.paymentFrequency}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>About the work</CardTitle></CardHeader>
            <CardBody>
              <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Skills required</CardTitle></CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((s) => {
                  const has = profile.skills.some((ws) => ws.toLowerCase() === s.toLowerCase());
                  return (
                    <Badge key={s} variant={has ? "green" : "default"} iconLeft={has ? <CheckCircle2 className="h-3 w-3" /> : undefined}>
                      {s} {has && "✓"}
                    </Badge>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>What you'll earn</CardTitle></CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-green-100 border border-green-100">
                  <div className="text-xs text-green-600 font-semibold">Daily</div>
                  <div className="text-xl font-bold text-navy-900 mt-1">{formatINR(job.wagePerDay)}</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-100 border border-blue-100">
                  <div className="text-xs text-blue-600 font-semibold">Weekly estimate</div>
                  <div className="text-xl font-bold text-navy-900 mt-1">{formatINR(weeklyEstimate)}</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-100 border border-purple-100">
                  <div className="text-xs text-purple-600 font-semibold">Payment</div>
                  <div className="text-xl font-bold text-navy-900 mt-1 capitalize">{job.paymentFrequency}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Safety</CardTitle>
              <CardSubtitle>Required precautions and site information</CardSubtitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {job.safetyNotes.split(".").filter(Boolean).map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-navy-900">{note.trim()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-amber-100 border border-amber-100 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-600">Always verify site safety and use provided protective equipment. Report any concerns.</p>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          {contractor && contractorUser && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar src={contractorUser.avatar} name={contractor.companyName} size={48} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900">{contractor.companyName}</div>
                    <div className="text-xs text-gray-600">{contractor.businessType}</div>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-600">Trust Score</div>
                    <div className="text-lg font-bold text-navy-900">{contractor.trustScore}/100</div>
                    <div className="text-xs text-green-600">{contractor.trustLabel}</div>
                  </div>
                  <TrustRing score={contractor.trustScore} size={80} showLabel={false} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-md bg-cream-100">
                    <div className="text-gray-600">Rating</div>
                    <div className="font-semibold text-navy-900 flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-600" /> {contractor.rating.toFixed(1)}
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-cream-100">
                    <div className="text-gray-600">Jobs done</div>
                    <div className="font-semibold text-navy-900">{contractor.completedJobs}</div>
                  </div>
                  <div className="p-2 rounded-md bg-cream-100 col-span-2">
                    <div className="text-gray-600">Payment reliability</div>
                    <div className="font-semibold text-navy-900">
                      {contractor.paidPayments > 0
                        ? `${contractor.paymentReliability}% on-time payments`
                        : "No payments made yet on ShramSetu"}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="bg-blue-100 border-blue-100">
            <CardBody>
              <div className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-2">Why we recommend this</div>
              <ul className="space-y-1.5">
                {match.reasons.length > 0 ? (
                  match.reasons.map((r) => (
                    <li key={r} className="text-sm text-navy-900 flex items-start gap-1.5">
                      <span className="text-blue-600 mt-0.5">✓</span>
                      <span>{r}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-700">Standard match based on profile data.</li>
                )}
              </ul>
            </CardBody>
          </Card>

          <div className="sticky top-20">
            {existingApp ? (
              <Card className="bg-green-100 border-green-100">
                <CardBody className="text-center">
                  <div className="h-12 w-12 rounded-full bg-green-600 text-white flex items-center justify-center mx-auto animate-check-pop">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-navy-900 mt-3">
                    {existingApp.status === "applied" ? "Application sent" : `Status: ${existingApp.status}`}
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    {existingApp.status === "applied"
                      ? `We'll notify you when ${contractor?.companyName ?? "the contractor"} responds.`
                      : `Your application is currently ${existingApp.status}.`}
                  </p>
                  <Link href="/worker/applications">
                    <Button variant="primary" size="md" fullWidth className="mt-4">
                      View my applications
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  <div className="text-xs text-gray-600">Wage</div>
                  <div className="text-2xl font-bold text-navy-900">{formatINR(job.wagePerDay)}/day</div>
                  <div className="text-xs text-gray-600 mt-1">{job.workersNeeded} workers needed</div>
                  <Button
                    fullWidth
                    size="lg"
                    className="mt-4"
                    onClick={() => {
                      applyToJob(job.id, currentUserId, match.matchScore);
                    }}
                  >
                    Apply now
                  </Button>
                  <Button
                    fullWidth
                    size="md"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => toggleSaveJob(job.id)}
                  >
                    {isSaved ? "Saved ✓" : "Save for later"}
                  </Button>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
