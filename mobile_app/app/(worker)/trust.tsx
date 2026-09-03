/**
 * Worker Trust — score ring, breakdown, event history,
 * improve-score actions (quiz / work record / certification).
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { calculateTrustScore } from "@/services/trustEngine";
import { quizFor } from "@/services/quizBank";
import { timeAgo } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { TrustRing } from "@/components/ui/TrustRing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sheet, ProgressBar, EmptyState } from "@/components/ui/Feedback";
import { Input, Chip } from "@/components/ui/Input";
import { C, T, R, S } from "@/theme/tokens";

export default function WorkerTrust() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const verifications = useStore((s) => s.verifications);
  const assessments = useStore((s) => s.assessments);
  const applications = useStore((s) => s.applications);
  const payments = useStore((s) => s.payments);
  const safetyReports = useStore((s) => s.safetyReports);
  const fraudSignals = useStore((s) => s.fraudSignals);
  const workHistory = useStore((s) => s.workHistory);
  const events = useStore((s) => s.trustEvents.filter((e) => e.userId === s.currentUser?.id));
  const contractors = useStore((s) => s.contractorProfiles);
  const users = useStore((s) => s.users);
  const completeAssessment = useStore((s) => s.completeAssessment);
  const addWorkHistory = useStore((s) => s.addWorkHistory);
  const addCertification = useStore((s) => s.addCertification);
  const requestVerification = useStore((s) => s.requestVerification);
  const pushToast = useStore((s) => s.pushToast);

  // Sheets
  const [quizOpen, setQuizOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  // Quiz state
  const [selectedSkill, setSelectedSkill] = useState(profile?.profession ?? "Mason");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Work record state
  const [workForm, setWorkForm] = useState({
    role: profile?.profession ?? "Mason",
    contractorId: "",
    startDate: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    rating: 5,
  });

  // Cert state
  const [certName, setCertName] = useState("");

  if (!user || !profile) return null;

  const result = calculateTrustScore({
    user, profile, verifications, assessments, workHistory,
    applications, payments, safetyReports, fraudSignals,
  });

  const quizQuestions = quizFor(selectedSkill);
  const myQuizSkills = [...new Set([profile.profession, ...profile.skills])].filter((s) => quizFor(s).length > 0);

  const myVerifications = verifications.filter((v) => v.userId === user.id);
  const verifyTypes: { value: string; label: string; desc: string }[] = [
    { value: "identity", label: "Identity (Aadhaar/PAN)", desc: "Govt ID check by our team" },
    { value: "address", label: "Address", desc: "Home address confirmation" },
    { value: "skill", label: "Skill", desc: "Prove your trade skill" },
    { value: "work-history", label: "Work History", desc: "Past employer confirmation" },
    { value: "email", label: "Email", desc: "Email address confirmation" },
  ];

  function handleFinishQuiz() {
    let scoreCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) scoreCount += 1;
    });
    const finalScore = Math.round((scoreCount / quizQuestions.length) * 100);
    completeAssessment(user!.id, selectedSkill, finalScore);
    setQuizSubmitted(true);
    setTimeout(() => {
      setQuizOpen(false);
      setQuizSubmitted(false);
      setQuizAnswers({});
    }, 1400);
  }

  function handleSaveWork() {
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
    setWorkOpen(false);
  }

  function handleSaveCert() {
    if (!certName.trim()) return;
    addCertification(user!.id, certName.trim());
    setCertName("");
    setCertOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <TrustRing score={result.score} size={140} />
          <Text style={styles.heroTitle}>Your trust score is your professional passport</Text>
          <Text style={styles.heroSub}>
            It grows with every verified job, completed assessment, and positive review.
          </Text>
        </View>

        {/* Breakdown */}
        <Card>
          <CardHeader title={`Where your ${result.score}/100 comes from`} subtitle="Live from your activity" />
          {result.breakdown.map((b) => (
            <View key={b.category} style={styles.breakRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.breakCat}>{b.category}</Text>
                <Text style={styles.breakReason} numberOfLines={2}>{b.reason}</Text>
              </View>
              <Text style={styles.breakPts}>{b.points}/{b.max}</Text>
            </View>
          ))}
        </Card>

        {/* Recent events */}
        <Card>
          <CardHeader title="Things that changed your score" subtitle="Server-recorded history" />
          {events.length === 0 ? (
            <EmptyState message="No trust events yet — apply to jobs to get started." />
          ) : (
            events.slice(0, 8).map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: e.points >= 0 ? C.green600 : C.red600 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventReason}>{e.reason}</Text>
                  <Text style={styles.eventTime}>{timeAgo(e.createdAt)}</Text>
                </View>
                <Text style={[styles.eventPts, { color: e.points >= 0 ? C.green600 : C.red600 }]}>
                  {e.points >= 0 ? "+" : ""}{e.points}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Improve score */}
        <Card>
          <CardHeader title="Improve your score" subtitle="Tap any option below" />
          <Pressable style={styles.improveRow} onPress={() => setQuizOpen(true)}>
            <View style={[styles.improveIcon, { backgroundColor: C.purple100 }]}><Text>📝</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.improveTitle}>Complete skill assessment</Text>
              <Text style={styles.improveDesc}>Take a quick 3-question quiz</Text>
            </View>
            <Badge label="+8" tone="green" />
          </Pressable>
          <Pressable style={styles.improveRow} onPress={() => setWorkOpen(true)}>
            <View style={[styles.improveIcon, { backgroundColor: C.blue100 }]}><Text>🧾</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.improveTitle}>Verify work history</Text>
              <Text style={styles.improveDesc}>Add completed job records</Text>
            </View>
            <Badge label="+6" tone="green" />
          </Pressable>
          <Pressable style={styles.improveRow} onPress={() => setCertOpen(true)}>
            <View style={[styles.improveIcon, { backgroundColor: C.green100 }]}><Text>🏅</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.improveTitle}>Add certification</Text>
              <Text style={styles.improveDesc}>Add training certificates</Text>
            </View>
            <Badge label="+4" tone="green" />
          </Pressable>
          <Pressable style={styles.improveRow} onPress={() => setVerifyOpen(true)}>
            <View style={[styles.improveIcon, { backgroundColor: C.orange100 }]}><Text>🪪</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.improveTitle}>Request verification</Text>
              <Text style={styles.improveDesc}>Identity, address, skill checks</Text>
            </View>
            <Badge label="+" tone="green" />
          </Pressable>
        </Card>

        {/* Verifications list */}
        <Card>
          <CardHeader title="Your verifications" />
          {myVerifications.length === 0 ? (
            <Text style={styles.empty}>No verification requests yet.</Text>
          ) : (
            myVerifications.map((v) => (
              <View key={v.id} style={styles.eventRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.improveTitle}>{v.type.replace("-", " ").toUpperCase()}</Text>
                </View>
                <Badge label={v.status} tone={v.status === "verified" ? "green" : v.status === "rejected" ? "red" : "amber"} />
              </View>
            ))
          )}
        </Card>

        {/* AI coach */}
        <Card style={{ backgroundColor: C.purple100, borderColor: C.purple100 }}>
          <Text style={styles.coachLabel}>✨ AI Trust Coach</Text>
          <Text style={styles.coachText}>
            Complete one skill assessment and verify your last 2 work records to reach 90+ High Trust.
          </Text>
          <Button label="Ask the AI Coach" variant="ghost" onPress={() => router.push("/(worker)/assistant")} fullWidth />
        </Card>
      </ScrollView>

      {/* Quiz sheet */}
      <Sheet open={quizOpen} onClose={() => setQuizOpen(false)} title="Skill Assessment Quiz">
        {quizSubmitted ? (
          <View style={styles.quizDone}>
            <Text style={styles.quizDoneEmoji}>🎉</Text>
            <Text style={styles.quizDoneText}>Quiz complete — score recorded!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sheetLabel}>Skill to assess</Text>
            <View style={styles.chipWrap}>
              {myQuizSkills.map((s) => (
                <Chip key={s} label={s} active={selectedSkill === s} onPress={() => { setSelectedSkill(s); setQuizAnswers({}); }} small />
              ))}
            </View>
            {quizQuestions.map((q, idx) => (
              <View key={idx} style={{ marginTop: S.lg }}>
                <Text style={styles.quizQ}>{idx + 1}. {q.q}</Text>
                <View style={styles.chipWrap}>
                  {q.options.map((o, oi) => (
                    <Chip
                      key={oi}
                      label={o}
                      active={quizAnswers[idx] === oi}
                      onPress={() => setQuizAnswers({ ...quizAnswers, [idx]: oi })}
                      small
                    />
                  ))}
                </View>
              </View>
            ))}
            <Button
              label="Submit Answers"
              onPress={handleFinishQuiz}
              disabled={Object.keys(quizAnswers).length < quizQuestions.length}
              fullWidth
            />
          </>
        )}
      </Sheet>

      {/* Work record sheet */}
      <Sheet open={workOpen} onClose={() => setWorkOpen(false)} title="Add Work Record">
        <Input label="Role" value={workForm.role} onChangeText={(v) => setWorkForm({ ...workForm, role: v })} />
        <Text style={styles.sheetLabel}>Contractor you worked with</Text>
        <View style={styles.chipWrap}>
          {contractors.map((c) => {
            const cu = users.find((u) => u.id === c.userId);
            return (
              <Chip
                key={c.userId}
                label={c.companyName}
                active={workForm.contractorId === c.userId}
                onPress={() => setWorkForm({ ...workForm, contractorId: c.userId })}
                small
              />
            );
          })}
        </View>
        <Input
          label="Start date (YYYY-MM-DD)"
          value={workForm.startDate}
          onChangeText={(v) => setWorkForm({ ...workForm, startDate: v })}
        />
        <Input
          label="End date (YYYY-MM-DD)"
          value={workForm.endDate}
          onChangeText={(v) => setWorkForm({ ...workForm, endDate: v })}
        />
        <Text style={styles.sheetLabel}>Overall rating from contractor</Text>
        <View style={styles.chipWrap}>
          {[1, 2, 3, 4, 5].map((r) => (
            <Chip key={r} label={"★".repeat(r)} active={workForm.rating === r} onPress={() => setWorkForm({ ...workForm, rating: r })} small />
          ))}
        </View>
        <Button label="Submit for Verification" onPress={handleSaveWork} fullWidth />
      </Sheet>

      {/* Certification sheet */}
      <Sheet open={certOpen} onClose={() => setCertOpen(false)} title="Add Certification">
        <Input
          label="Certificate name"
          value={certName}
          onChangeText={setCertName}
          placeholder='e.g. "ITI Electrical Wiring Course"'
        />
        <Button label="Add Certificate" onPress={handleSaveCert} disabled={certName.trim().length < 2} fullWidth />
      </Sheet>

      {/* Verification request sheet */}
      <Sheet open={verifyOpen} onClose={() => setVerifyOpen(false)} title="Request Verification">
        {verifyTypes.map((t) => {
          const existing = myVerifications.find((v) => v.type === t.value);
          return (
            <Pressable
              key={t.value}
              style={styles.improveRow}
              onPress={() => {
                requestVerification(user!.id, t.value as never);
                setVerifyOpen(false);
              }}
              disabled={existing?.status === "pending" || existing?.status === "verified"}
            >
              <View style={[styles.improveIcon, { backgroundColor: C.orange100 }]}><Text>🪪</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.improveTitle}>{t.label}</Text>
                <Text style={styles.improveDesc}>{t.desc}</Text>
              </View>
              {existing ? (
                <Badge label={existing.status} tone={existing.status === "verified" ? "green" : "amber"} />
              ) : (
                <Badge label="Request" tone="blue" />
              )}
            </Pressable>
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.lg },
  hero: { alignItems: "center", gap: S.md, paddingVertical: S.lg },
  heroTitle: { fontSize: T.lg, fontWeight: "900", color: C.navy900, textAlign: "center", marginTop: S.sm },
  heroSub: { fontSize: T.sm, color: C.gray600, textAlign: "center", lineHeight: 20 },
  breakRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
  breakCat: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  breakReason: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  breakPts: { fontSize: T.sm, fontWeight: "800", color: C.orange600 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
  eventDot: { width: 8, height: 8, borderRadius: 4 },
  eventReason: { fontSize: T.xs, color: C.gray700, fontWeight: "600", flexShrink: 1 },
  eventTime: { fontSize: T.xs, color: C.gray500, marginTop: 2 },
  eventPts: { fontSize: T.sm, fontWeight: "800" },
  improveRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    marginBottom: S.sm, backgroundColor: C.white,
  },
  improveIcon: { width: 36, height: 36, borderRadius: R.sm, alignItems: "center", justifyContent: "center" },
  improveTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900 },
  improveDesc: { fontSize: T.xs, color: C.gray600, marginTop: 1 },
  empty: { fontSize: T.sm, color: C.gray500, paddingVertical: S.md },
  coachLabel: { fontSize: T.sm, fontWeight: "800", color: C.purple600, marginBottom: S.xs },
  coachText: { fontSize: T.sm, color: C.navy900, lineHeight: 20, marginBottom: S.md },
  sheetLabel: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  quizQ: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  quizDone: { alignItems: "center", paddingVertical: S.xxl, gap: S.md },
  quizDoneEmoji: { fontSize: 44 },
  quizDoneText: { fontSize: T.base, fontWeight: "800", color: C.green600 },
});
