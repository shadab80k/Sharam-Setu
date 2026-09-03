/**
 * Contractor Jobs — my jobs list with status, applicants count, edit/close actions.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { formatINR, formatDate } from "@/utils";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Sheet } from "@/components/ui/Feedback";
import { SkeletonRow } from "@/components/ui/Avatar";
import { Input, Chip } from "@/components/ui/Input";
import { Card, CardHeader } from "@/components/ui/Card";
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>My Jobs</Text>
        </View>
        <Button label="+ Post Job" size="sm" onPress={() => router.push("/(contractor)/jobs/new")} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => bootstrap()} />}
      >
        {loading && sorted.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Text style={{ fontSize: 40 }}>🧰</Text>}
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
                <View style={styles.jobMetaRow}>
                  <Text style={styles.jobMeta}>{job.workersHired}/{job.workersNeeded} hired</Text>
                  <Text style={styles.jobMeta}>{jobApps.length} applicant{jobApps.length === 1 ? "" : "s"}</Text>
                  {newApps > 0 && job.status === "active" && (
                    <View style={styles.newBadge}><Text style={styles.newBadgeText}>{newApps} new</Text></View>
                  )}
                </View>
                {job.status === "active" && (
                  <View style={styles.actions}>
                    <Button label="View Applicants" size="sm" onPress={() => router.push({ pathname: "/(contractor)/jobs/[id]", params: { id: job.id } })} />
                    <Button label="Edit" variant="secondary" size="sm" onPress={() => openEdit(job)} />
                    <Button label="Close" variant="destructive" size="sm" onPress={() => handleClose(job)} />
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      <Sheet open={!!editJob} onClose={() => setEditJob(null)} title="Edit Job">
        <Input label="Job title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
        <Input label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline style={{ height: 90, textAlignVertical: "top" }} />
        <Input label="Daily wage (₹)" value={form.wagePerDay} onChangeText={(v) => setForm({ ...form, wagePerDay: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Input label="Workers needed" value={form.workersNeeded} onChangeText={(v) => setForm({ ...form, workersNeeded: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Button label="Save Changes" onPress={saveEdit} loading={saving} disabled={!form.title.trim()} fullWidth />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  jobMetaRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginBottom: S.md },
  jobMeta: { fontSize: T.xs, color: C.gray500, fontWeight: "700" },
  newBadge: { backgroundColor: C.orange600, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 2 },
  newBadgeText: { color: C.white, fontSize: 10, fontWeight: "800" },
  actions: { flexDirection: "row", gap: S.sm, flexWrap: "wrap" },
});
