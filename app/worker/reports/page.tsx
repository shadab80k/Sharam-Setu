"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, Shield, FileText, PlusCircle, X, Briefcase, Users, DollarSign } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import type { ReportCategory, ReportSeverity } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { value: "unsafe-workplace", label: "Unsafe workplace" },
  { value: "payment-dispute", label: "Payment dispute" },
  { value: "fake-job", label: "Fake job posting" },
  { value: "harassment", label: "Harassment" },
  { value: "fraud", label: "Fraud" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function WorkerReportsPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const reports = useStore((s) => s.safetyReports.filter((r) => r.reporterId === currentUserId));
  const submit = useStore((s) => s.submitReport);
  const pushToast = useStore((s) => s.pushToast);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ category: ReportCategory; severity: ReportSeverity; jobId: string; description: string }>({
    category: "unsafe-workplace",
    severity: "medium",
    jobId: "",
    description: "",
  });

  function handleOpenCategory(cat: ReportCategory) {
    setForm((prev) => ({ ...prev, category: cat }));
    setOpen(true);
  }

  function handleSubmit() {
    if (!form.description.trim()) {
      pushToast("error", "Please describe what happened in detail");
      return;
    }
    submit({
      reporterId: currentUserId,
      category: form.category,
      severity: form.severity,
      jobId: form.jobId || undefined,
      description: form.description,
    });
    setOpen(false);
    setForm({ category: "unsafe-workplace", severity: "medium", jobId: "", description: "" });
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Your safety matters.</h2>
          <p className="text-sm text-gray-700 mt-1">File a report about unsafe workplaces, payment issues, or fraud. Admin reviews within 48 hours.</p>
        </div>
        <Button onClick={() => setOpen(true)} iconLeft={<PlusCircle className="h-4 w-4" />}>File a report</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: <Shield className="h-5 w-5" />, label: "Report unsafe workplace", desc: "Site safety, equipment, hazards", category: "unsafe-workplace" as ReportCategory },
          { icon: <DollarSign className="h-5 w-5" />, label: "Report payment issue", desc: "Withheld wages, delayed payments", category: "payment-dispute" as ReportCategory },
          { icon: <AlertTriangle className="h-5 w-5" />, label: "Report fraud", desc: "Fake jobs, fake contractors", category: "fraud" as ReportCategory },
        ].map((c) => (
          <Card key={c.label} className="p-5 hover:shadow-elevated transition cursor-pointer" onClick={() => handleOpenCategory(c.category)}>
            <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
              {c.icon}
            </div>
            <div className="text-sm font-semibold text-navy-900">{c.label}</div>
            <div className="text-xs text-gray-600 mt-1">{c.desc}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your reports</CardTitle>
          <CardSubtitle>{reports.length} reports filed</CardSubtitle>
        </CardHeader>
        <CardBody>
          {reports.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-8">You haven't filed any reports yet.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => {
                const sev = r.severity;
                return (
                  <div key={r.id} className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            sev === "critical" ? "red" :
                            sev === "high" ? "orange" :
                            sev === "medium" ? "amber" : "blue"
                          }>{sev.toUpperCase()}</Badge>
                          <Badge variant="default" className="capitalize">{r.category.replace("-", " ")}</Badge>
                          <Badge variant={
                            r.status === "resolved" ? "green" :
                            r.status === "investigating" ? "blue" :
                            r.status === "dismissed" ? "gray" : "amber"
                          }>{r.status}</Badge>
                        </div>
                        <p className="text-sm text-navy-900 mt-2">{r.description}</p>
                        <div className="text-xs text-gray-600 mt-1.5">Filed {formatDate(r.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="File a new report">
        <div className="space-y-3">
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ReportCategory })}
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Severity"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value as ReportSeverity })}
            options={SEVERITY_OPTIONS}
          />
          <Input
            label="Related job (optional)"
            placeholder="Job ID or title"
            value={form.jobId}
            onChange={(e) => setForm({ ...form, jobId: e.target.value })}
          />
          <Textarea
            label="What happened?"
            placeholder="Describe the issue in detail…"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="p-3 rounded-lg bg-blue-100 text-xs text-blue-600">
            Reports are reviewed by ShramSetu admins. You can track status under "Your reports".
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSubmit}>Submit report</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
