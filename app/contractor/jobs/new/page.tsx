"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, ArrowRight, CheckCircle2, Briefcase, MapPin, Wallet, Calendar, Users, Shield, Sparkles, Plus, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/utils/cities";
import { estimateWage } from "@/lib/services/wageEstimator";

const STEPS = [
  { key: "details", label: "Job details" },
  { key: "skills", label: "Skills" },
  { key: "wage", label: "Location & wage" },
  { key: "schedule", label: "Schedule" },
  { key: "review", label: "Review & publish" },
];

export default function PostJobPage() {
  const router = useRouter();
  const createJob = useStore((s) => s.createJob);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "Mason - Residential Building",
    category: "Mason",
    description: "Looking for an experienced mason for a 14-day residential project. Must be reliable and skilled in brickwork and plastering.",
    requiredSkills: ["Masonry", "Brickwork"],
    location: "lucknow",
    wagePerDay: 950,
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
    workersNeeded: 3,
    paymentFrequency: "weekly" as "daily" | "weekly" | "on-completion",
    safetyNotes: "Hard hat and safety boots required. Site induction on day 1. Emergency contact on site.",
  });
  const [newSkill, setNewSkill] = useState("");

  const city = CITIES.find((c) => c.id === form.location) || CITIES[0];
  const wageEst = estimateWage(form.category, 5, form.location, "intermediate");

  function addSkill() {
    if (!newSkill) return;
    if (!form.requiredSkills.includes(newSkill)) {
      setForm({ ...form, requiredSkills: [...form.requiredSkills, newSkill] });
    }
    setNewSkill("");
  }

  function removeSkill(s: string) {
    setForm({ ...form, requiredSkills: form.requiredSkills.filter((x) => x !== s) });
  }

  async function publish() {
    const city = CITIES.find((c) => c.id === form.location) || CITIES[0];
    try {
      const newJob = await createJob({
        contractorId: "",
        title: form.title,
        category: form.category,
        description: form.description,
        location: city.id,
        latitude: city.latitude,
        longitude: city.longitude,
        wagePerDay: form.wagePerDay,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        workersNeeded: form.workersNeeded,
        requiredSkills: form.requiredSkills,
        paymentFrequency: form.paymentFrequency,
        safetyNotes: form.safetyNotes,
      });
      router.push(`/contractor/jobs/${newJob.id}`);
    } catch {
      // toast already surfaced by the store
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h2 className="text-2xl font-bold text-navy-900">Post a new job</h2>
        <p className="text-sm text-gray-700 mt-1">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i < step ? "bg-green-600 text-white" : i === step ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-500"
            }`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <div className={`text-xs font-medium hidden sm:block ${i === step ? "text-orange-600" : i < step ? "text-green-600" : "text-gray-500"}`}>
              {s.label}
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-green-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardBody>
            {step === 0 && (
              <div className="space-y-4">
                <Input label="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  options={[
                    { value: "Mason", label: "Mason" },
                    { value: "Painter", label: "Painter" },
                    { value: "Plumber", label: "Plumber" },
                    { value: "Electrician", label: "Electrician" },
                    { value: "Carpenter", label: "Carpenter" },
                    { value: "Tile Fitter", label: "Tile Fitter" },
                    { value: "Helper", label: "Helper" },
                  ]}
                />
                <Textarea
                  label="Description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  helper="Describe the work, expectations, and any specific requirements"
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-navy-900 mb-2">Required skills</div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {form.requiredSkills.map((s) => (
                      <Badge key={s} variant="green" className="cursor-pointer" onClick={() => removeSkill(s)}>
                        {s} <X className="h-3 w-3 ml-0.5" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Tiling, Plumbing, Wiring"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    />
                    <Button onClick={addSkill} iconLeft={<Plus className="h-4 w-4" />}>Add</Button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Suggested: {["Masonry", "Brickwork", "Plastering", "Tiling", "Plumbing"].filter((s) => !form.requiredSkills.includes(s)).join(" · ")}</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Select
                  label="Location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  options={CITIES.map((c) => ({ value: c.id, label: `${c.name}, ${c.state}` }))}
                />
                <div>
                  <Input
                    label="Daily wage (₹)"
                    type="number"
                    value={form.wagePerDay}
                    onChange={(e) => setForm({ ...form, wagePerDay: Number(e.target.value) })}
                    iconLeft={<span>₹</span>}
                  />
                  <div className="mt-2 p-3 rounded-lg bg-blue-100">
                    <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Fair wage estimate</div>
                    <div className="text-sm text-navy-900 mt-1">
                      ₹{wageEst.low} – ₹{wageEst.high}/day · <span className="font-semibold">Recommended ₹{wageEst.recommended}/day</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{wageEst.factors.join(" · ")}</div>
                  </div>
                </div>
                <Input
                  label="Number of workers needed"
                  type="number"
                  value={form.workersNeeded}
                  onChange={(e) => setForm({ ...form, workersNeeded: Number(e.target.value) })}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  <Input label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <Select
                  label="Payment frequency"
                  value={form.paymentFrequency}
                  onChange={(e) => setForm({ ...form, paymentFrequency: e.target.value as any })}
                  options={[
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                    { value: "on-completion", label: "On completion" },
                  ]}
                />
                <Textarea
                  label="Safety notes"
                  rows={3}
                  value={form.safetyNotes}
                  onChange={(e) => setForm({ ...form, safetyNotes: e.target.value })}
                  helper="Site safety, equipment, and precautions"
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-green-100 border border-green-100">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Ready to publish
                  </div>
                  <p className="text-sm text-navy-900 mt-1">
                    Job will be visible to all matching workers in {city.name}.
                  </p>
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Title</span>
                    <span className="font-medium text-navy-900">{form.title}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Category</span>
                    <span className="font-medium text-navy-900">{form.category}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium text-navy-900">{city.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Wage</span>
                    <span className="font-medium text-navy-900">₹{form.wagePerDay}/day</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Workers needed</span>
                    <span className="font-medium text-navy-900">{form.workersNeeded}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Skills</span>
                    <span className="font-medium text-navy-900">{form.requiredSkills.join(", ")}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} iconRight={<ArrowRight className="h-4 w-4" />}>
                  Continue
                </Button>
              ) : (
                <Button onClick={publish} variant="success" iconLeft={<CheckCircle2 className="h-4 w-4" />}>
                  Publish job
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <Card className="bg-blue-100 border-blue-100">
            <CardBody>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="text-sm font-semibold text-blue-600">Estimated reach</div>
              </div>
              <div className="text-2xl font-bold text-navy-900">24 workers</div>
              <div className="text-xs text-gray-600">within 10 km in {city.name}</div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Live preview</CardTitle></CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div className="text-xs text-gray-600">{form.category}</div>
                <div className="text-sm font-semibold text-navy-900">{form.title}</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <MapPin className="h-3 w-3" /> {city.name}
                </div>
                <div className="text-base font-bold text-navy-900">₹{form.wagePerDay}/day</div>
                <div className="flex flex-wrap gap-1">
                  {form.requiredSkills.slice(0, 3).map((s) => (
                    <Badge key={s} variant="default">{s}</Badge>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
