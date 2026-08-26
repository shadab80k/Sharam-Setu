"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TrustRing } from "@/components/ui/TrustRing";
import { Edit2, Star, CheckCircle2, MapPin, Briefcase, Award, Languages, History, PlusCircle, X, FileCheck2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { CITIES } from "@/lib/utils/cities";

export default function WorkerProfilePage() {
  const userId = "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === userId));
  const update = useStore((s) => s.updateWorkerProfile);
  const verifications = useStore((s) => s.verifications.filter((v) => v.userId === userId));
  const reviews = useStore((s) => s.reviews.filter((r) => r.revieweeId === userId));
  const skills = useStore((s) => s.skills);

  const [editingAbout, setEditingAbout] = useState(false);
  const [editingWage, setEditingWage] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [wage, setWage] = useState(profile?.expectedDailyWage ?? 0);
  const [newSkill, setNewSkill] = useState("");

  if (!user || !profile) return null;

  function addSkill() {
    if (!newSkill) return;
    update(userId, { skills: [...(profile?.skills ?? []), newSkill] });
    setNewSkill("");
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Card>
        <CardBody className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            <Avatar src={user.avatar} name={user.name} size={88} className="ring-4 ring-white shadow-elevated" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-navy-900">{user.name}</h2>
                <Badge variant="green" iconLeft={<CheckCircle2 className="h-3 w-3" />}>Verified worker</Badge>
              </div>
              <p className="text-base text-gray-700 mt-1">{profile.profession} · {profile.experienceYears}+ years experience</p>
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {user.location}</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-600" /> {profile.rating.toFixed(1)} rating</span>
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {profile.completedJobs} jobs done</span>
                <Badge variant={profile.availability === "available" ? "green" : "amber"}>{profile.availability}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">Profile strength</div>
              <div className="text-2xl font-bold text-navy-900">{profile.profileCompletion}%</div>
              <ProgressBar value={profile.profileCompletion} className="w-32 mt-1.5" />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>About</CardTitle>
              {!editingAbout && (
                <Button variant="ghost" size="sm" onClick={() => setEditingAbout(true)} iconLeft={<Edit2 className="h-3.5 w-3.5" />}>
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {editingAbout ? (
                <div className="space-y-3">
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button onClick={() => { update(userId, { bio }); setEditingAbout(false); }}>Save</Button>
                    <Button variant="secondary" onClick={() => { setBio(profile.bio); setEditingAbout(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardSubtitle>Add your skills to get better job matches</CardSubtitle>
            </CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <Badge key={s} variant="green" iconLeft={<CheckCircle2 className="h-3 w-3" />}>
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Add a skill (e.g. Tiling, Welding)"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSkill()}
                />
                <Button onClick={addSkill} iconLeft={<PlusCircle className="h-4 w-4" />}>Add</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Work history</CardTitle></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  { role: "Mason", contractor: "Raj BuildWorks", start: "120 days ago", end: "90 days ago", verified: true, rating: 5 },
                  { role: "Mason", contractor: "Sharma Constructions", start: "60 days ago", end: "40 days ago", verified: true, rating: 4 },
                  { role: "Mason", contractor: "Verma Infra", start: "30 days ago", end: "15 days ago", verified: false, rating: 4 },
                ].map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
                          {w.role} · {w.contractor}
                          {w.verified && <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-2.5 w-2.5" />}>Verified</Badge>}
                        </div>
                        <div className="text-xs text-gray-600">{w.start} → {w.end}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-600">
                      {Array.from({ length: w.rating }).map((_, k) => (
                        <Star key={k} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Certifications</CardTitle></CardHeader>
            <CardBody>
              <div className="space-y-2">
                {profile.certifications.length === 0 ? (
                  <p className="text-sm text-gray-600">No certifications yet. Add training and certificates to boost trust.</p>
                ) : (
                  profile.certifications.map((c) => (
                    <div key={c} className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-100">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-navy-900">{c}</span>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
              <CardSubtitle>{reviews.length || 0} reviews from contractors</CardSubtitle>
            </CardHeader>
            <CardBody>
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-600">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-0.5 text-amber-600">
                          {Array.from({ length: r.rating }).map((_, k) => (
                            <Star key={k} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600">{r.skill}/{5} skill · {r.reliability}/{5} reliability</span>
                      </div>
                      <p className="text-sm text-navy-900 mt-2">{r.comment}</p>
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
              <CardTitle>Trust Score</CardTitle>
            </CardHeader>
            <CardBody className="text-center">
              <TrustRing score={profile.trustScore} size={140} />
              <Link href="/worker/trust">
                <Button variant="secondary" fullWidth size="sm" className="mt-4">
                  View breakdown
                </Button>
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Expected wage</CardTitle></CardHeader>
            <CardBody>
              {editingWage ? (
                <div className="space-y-3">
                  <Input
                    type="number"
                    value={wage}
                    onChange={(e) => setWage(Number(e.target.value))}
                    iconLeft={<span className="text-xs">₹</span>}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => { update(userId, { expectedDailyWage: wage }); setEditingWage(false); }} size="sm">Save</Button>
                    <Button variant="secondary" onClick={() => { setWage(profile.expectedDailyWage); setEditingWage(false); }} size="sm">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-bold text-navy-900">₹{profile.expectedDailyWage}</div>
                  <div className="text-xs text-gray-600">per day</div>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditingWage(true)} iconLeft={<Edit2 className="h-3.5 w-3.5" />}>
                    Update
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Languages</CardTitle></CardHeader>
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l) => (
                  <Badge key={l} variant="default" iconLeft={<Languages className="h-3 w-3" />}>{l}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              {verifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-cream-100">
                  <div>
                    <div className="text-sm font-medium text-navy-900 capitalize">{v.type.replace("-", " ")}</div>
                    <div className="text-xs text-gray-600">
                      {v.status === "verified" ? `Verified · Score ${v.score}` : v.status}
                    </div>
                  </div>
                  {v.status === "verified" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : v.status === "pending" ? (
                    <Badge variant="amber" size="sm">Pending</Badge>
                  ) : (
                    <Badge variant="red" size="sm">Not started</Badge>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
