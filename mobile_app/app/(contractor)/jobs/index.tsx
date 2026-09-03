/**
 * Contractor Jobs (V3) — my jobs list with status badges, applicant counts,
 * new-badge, Edit Sheet + Close confirm.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Button } from "@/components/ui/Button";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { SkeletonRow } from "@/components/ui/Avatar";
import { Field, TextArea } from "@/components/ui/Field";
import { Card, CardHeader } from "@/components/ui/Card";
import { Fab } from "@/components/ui/Fab";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";
import type { Job } from "@/types";

export default function ContractorJobs() {
  const router = useRouter();
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === s.currentUser?.id));
  const apps = useStore((s) => s.applications);
  const closeJob = useStore((s) => s.closeJob);
  const updateJob = useStore((s) => s.updateJob);
  const bootstrap = useStore((s) => s.bootstrap);
  const loading = useStore((s) => s.loading);

  const [editJob, setEditJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", wagePerDay: "", workersNeeded: "" });

  function openEdit(job: Job) {
    setForm({
      title: job.title,
      description: job.description,
      wagePerDay: String(job.wagePerDay),
      workersNeeded: String(job.workersNeeded),
    });
    setEditJob(job);
  }

  async function saveEdit() {
    if (!editJob) return;
    setSaving(true);
    try {
      await updateJob(editJob.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        wagePerDay: Number(form.wagePerDay) || editJob.wagePerDay,
        workersNeeded: Number(form.workersNeeded) || editJob.workersNeeded,
      });
      setEditJob(null);
    } catch { /* toasted */ } finally { setSaving(false); }
  }

  function handleClose(job: Job) {
    Alert.alert("Close this job?", `"${job.title}" will stop accepting applications.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Close Job", style: "destructive", onPress: () => closeJob(job.id) },
    ]);
  }

  const sorted = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>My Jobs</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && sorted.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            tone="primary"
            message="You haven't posted any jobs yet."
            ctaLabel="Post your first job"
            onCta={() => router.push("/(contractor)/jobs/new")}
          />
        ) : (
          sorted.map((job) => {
            const jobApps = apps.filter((a) => a.jobId === job.id);
            const newApps = jobApps.filter((a) => a.status === "applied").length;
            return (
              <Card key={job.id}>
                <CardHeader
                  title={job.title}
                  subtitle={`${formatINR(job.wagePerDay)}/day · ${job.location} · starts ${formatDate(job.startDate)}`}
                  right={<StatusBadge status={job.status} />}
                />
                <View style={st.jobMetaRow}>
                  <Text style={st.jobMeta}>{job.workersHired}/{job.workersNeeded} hired</Text>
                  <Text style={st.jobMeta}>{jobApps.length} applicant{jobApps.length === 1 ? "" : "s"}</Text>
                  {newApps > 0 && job.status === "active" && (
                    <Badge label={`${newApps} new`} tone="orange" />
                  )}
                </View>
                {job.status === "active" && (
                  <View style={st.actions}>
                    <Button label="Applicants" size="sm" icon="people-outline" onPress={() => router.push({ pathname: "/(contractor)/jobs/[id]", params: { id: job.id } })} />
                    <Button label="Edit" variant="secondary" size="sm" onPress={() => openEdit(job)} />
                    <Button label="Close" variant="danger" size="sm" onPress={() => handleClose(job)} />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Post job FAB */}
      <Fab icon="add" label="Post Job" onPress={() => router.push("/(contractor)/jobs/new")} />

      <Sheet open={!!editJob} onClose={() => setEditJob(null)} title="Edit Job">
        <Field label="Job title" value={form.title} onChangeText={(v: string) => setForm({ ...form, title: v })} />
        <TextArea label="Description" value={form.description} onChangeText={(v: string) => setForm({ ...form, description: v })} />
        <Field label="Daily wage (₹)" value={form.wagePerDay} onChangeText={(v: string) => setForm({ ...form, wagePerDay: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Field label="Workers needed" value={form.workersNeeded} onChangeText={(v: string) => setForm({ ...form, workersNeeded: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Button label="Save Changes" onPress={saveEdit} loading={saving} disabled={!form.title.trim()} fullWidth />
      </Sheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: 120, gap: S.md },
  jobMetaRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.md },
  jobMeta: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  actions: { flexDirection: "row", gap: S.sm, flexWrap: "wrap" },
});
