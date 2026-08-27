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

import { Modal } from "@/components/ui/Modal";

export default function WorkerProfilePage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const update = useStore((s) => s.updateWorkerProfile);
  const toggleWorkerAvailability = useStore((s) => s.toggleWorkerAvailability);
  const addSkill = useStore((s) => s.addSkill);
  const removeSkill = useStore((s) => s.removeSkill);
  const addCertification = useStore((s) => s.addCertification);
  const addWorkHistory = useStore((s) => s.addWorkHistory);
  const requestVerification = useStore((s) => s.requestVerification);
  const verifications = useStore((s) => s.verifications.filter((v) => v.userId === currentUserId));
  const workHistory = useStore((s) => s.workHistory.filter((w) => w.workerId === currentUserId));
  const reviews = useStore((s) => s.reviews.filter((r) => r.revieweeId === currentUserId));

  const [editingAbout, setEditingAbout] = useState(false);
  const [editingWage, setEditingWage] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [wage, setWage] = useState(profile?.expectedDailyWage ?? 0);
  const [newSkill, setNewSkill] = useState("");
  const [newLang, setNewLang] = useState("");
  const [workModalOpen, setWorkModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [workForm, setWorkForm] = useState({
    role: profile?.profession ?? "Mason",
    contractorName: "Raj BuildWorks",
    startDate: "2026-04-01",
    endDate: "2026-06-01",
    rating: 5,
  });
  const [certName, setCertName] = useState("");

  if (!user || !profile) return null;

  function handleAddSkill() {
    if (!newSkill.trim()) return;
    addSkill(currentUserId, newSkill.trim());
    setNewSkill("");
  }

  function handleAddLanguage() {
    if (!profile || !newLang.trim() || profile.languages.includes(newLang.trim())) return;
    update(currentUserId, { languages: [...profile.languages, newLang.trim()] });
    setNewLang("");
  }

  function handleSaveWork() {
    addWorkHistory({
      workerId: currentUserId,
      contractorId: "usr_c_1",
      jobId: "custom_job",
      role: workForm.role,
      startDate: workForm.startDate,
      endDate: workForm.endDate,
      verified: true,
      rating: workForm.rating,
    });
    setWorkModalOpen(false);
  }

  function handleSaveCert() {
    if (!certName.trim()) return;
    addCertification(currentUserId, certName.trim());
    setCertName("");
    setCertModalOpen(false);
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
                <button onClick={() => toggleWorkerAvailability(currentUserId)} title="Click to toggle availability">
                  <Badge variant={profile.availability === "available" ? "green" : "amber"}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-slow mr-1" />
                    {profile.availability === "available" ? "Available for work" : "Working / Busy"}
                  </Badge>
                </button>
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
                    <Button onClick={() => { update(currentUserId, { bio }); setEditingAbout(false); }}>Save</Button>
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
                  <Badge key={s} variant="green" className="flex items-center gap-1">
                    <span>{s}</span>
                    <button
                      onClick={() => removeSkill(currentUserId, s)}
                      title={`Remove ${s}`}
                      className="text-green-800 hover:text-red-700 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Add a skill (e.g. Tiling, Welding)"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                />
                <Button onClick={handleAddSkill} iconLeft={<PlusCircle className="h-4 w-4" />}>Add</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Work history</CardTitle>
                <CardSubtitle>{workHistory.length} recorded projects</CardSubtitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setWorkModalOpen(true)} iconLeft={<PlusCircle className="h-3.5 w-3.5" />}>
                Add Record
              </Button>
            </CardHeader>
            <CardBody>
              {workHistory.length === 0 ? (
                <p className="text-sm text-gray-600">No work records yet. Click "Add Record" above to add your past experience.</p>
              ) : (
                <div className="space-y-3">
                  {workHistory.map((w, i) => (
                    <div key={w.id || i} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <History className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-navy-900 flex items-center gap-1.5">
                            {w.role}
                            {w.verified && <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-2.5 w-2.5" />}>Verified</Badge>}
                          </div>
                          <div className="text-xs text-gray-600">{w.startDate} → {w.endDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-600">
                        {Array.from({ length: w.rating || 5 }).map((_, k) => (
                          <Star key={k} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Certifications</CardTitle>
                <CardSubtitle>{profile.certifications.length} verified certificates</CardSubtitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCertModalOpen(true)} iconLeft={<PlusCircle className="h-3.5 w-3.5" />}>
                Add Cert
              </Button>
            </CardHeader>
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
                    <Button onClick={() => { update(currentUserId, { expectedDailyWage: wage }); setEditingWage(false); }} size="sm">Save</Button>
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
            <CardBody className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {profile.languages.map((l) => (
                  <Badge key={l} variant="default" iconLeft={<Languages className="h-3 w-3" />}>
                    {l}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  placeholder="e.g. Bhojpuri"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLanguage()}
                />
                <Button size="sm" variant="secondary" onClick={handleAddLanguage}>Add</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Verification</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              {verifications.map((v) => (
                <div
                  key={v.id}
                  onClick={() => v.status !== "verified" && requestVerification(currentUserId, v.type)}
                  className={`flex items-center justify-between p-2.5 rounded-lg transition ${
                    v.status === "verified" ? "bg-cream-100 cursor-default" : "bg-orange-50 border border-orange-200 cursor-pointer hover:bg-orange-100"
                  }`}
                  title={v.status !== "verified" ? "Click to verify now" : "Verified"}
                >
                  <div>
                    <div className="text-sm font-medium text-navy-900 capitalize">{v.type.replace("-", " ")}</div>
                    <div className="text-xs text-gray-600">
                      {v.status === "verified" ? `Verified · Score ${v.score}` : "Click to verify (+10 Trust)"}
                    </div>
                  </div>
                  {v.status === "verified" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Badge variant="orange" size="sm">Verify Now</Badge>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Add Work History Modal */}
      <Modal open={workModalOpen} onClose={() => setWorkModalOpen(false)} title="Add Past Work Experience">
        <div className="space-y-3">
          <Input
            label="Work Role"
            value={workForm.role}
            onChange={(e) => setWorkForm({ ...workForm, role: e.target.value })}
            placeholder="e.g. Mason, Tile Fitter"
          />
          <Input
            label="Contractor / Site Name"
            value={workForm.contractorName}
            onChange={(e) => setWorkForm({ ...workForm, contractorName: e.target.value })}
            placeholder="e.g. Raj BuildWorks"
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
            label="Rating"
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
            <Button onClick={handleSaveWork}>Save Record</Button>
          </div>
        </div>
      </Modal>

      {/* Add Certification Modal */}
      <Modal open={certModalOpen} onClose={() => setCertModalOpen(false)} title="Add Trade Certification">
        <div className="space-y-3">
          <Input
            label="Certificate Title"
            placeholder="e.g. NSDC Advanced Masonry Certification"
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCertModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCert} disabled={!certName.trim()}>
              Save Certificate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
