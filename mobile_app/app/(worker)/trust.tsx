/**
 * Worker Trust (V3) — score hero, breakdown bars, event timeline,
 * improve-score ListRows → quiz / work record / cert / verification Sheets.
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
import { Badge, DotText } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chips";
import { Field } from "@/components/ui/Field";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
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

  const [quizOpen, setQuizOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const [selectedSkill, setSelectedSkill] = useState(profile?.profession ?? "Mason");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [workForm, setWorkForm] = useState({
    role: profile?.profession ?? "Mason",
    contractorId: "",
    startDate: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    rating: 5,
  });

  const [certName, setCertName] = useState("");

  if (!user || !profile) return null;

  const result = calculateTrustScore({
    user, profile, verifications, assessments, workHistory,
    applications, payments, safetyReports, fraudSignals,
  });

  const quizQuestions = quizFor(selectedSkill);
  const myQuizSkills = [...new Set([profile.profession, ...profile.skills])].filter((s) => quizFor(s).length > 0);

  const myVerifications = verifications.filter((v) => v.userId === user.id);
  const verifyTypes: { value: string; label: string; desc: string; icon: string }[] = [
    { value: "identity", label: "Identity (Aadhaar/PAN)", desc: "Govt ID check by our team", icon: "card-outline" },
    { value: "address", label: "Address", desc: "Home address confirmation", icon: "location-outline" },
    { value: "skill", label: "Skill", desc: "Prove your trade skill", icon: "construct-outline" },
    { value: "work-history", label: "Work History", desc: "Past employer confirmation", icon: "time-outline" },
    { value: "email", label: "Email", desc: "Email address confirmation", icon: "mail-outline" },
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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        {/* Hero */}
        <View style={st.hero}>
          <TrustRing score={result.score} size={148} />
          <Text style={st.heroTitle}>Your trust score is your professional passport</Text>
          <Text style={st.heroSub}>
            It grows with every verified job, completed assessment, and positive review.
          </Text>
        </View>

        {/* Breakdown */}
        <Card>
          <CardHeader title={`Where your ${result.score}/100 comes from`} subtitle="Live from your activity" />
          {result.breakdown.map((b) => (
            <View key={b.category} style={st.breakRow}>
              <View style={{ flex: 1, gap: S.xs }}>
                <View style={st.breakTop}>
                  <Text style={st.breakCat}>{b.category}</Text>
                  <Text style={st.breakPts}>{b.points}/{b.max}</Text>
                </View>
                <ProgressBar value={(b.points / Math.max(1, b.max)) * 100} height={4} />
                <Text style={st.breakReason} numberOfLines={2}>{b.reason}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Recent events */}
        <Card>
          <CardHeader title="Things that changed your score" subtitle="Server-recorded history" />
          {events.length === 0 ? (
            <EmptyState message="No trust events yet — apply to jobs to get started." />
          ) : (
            <View>
              {events.slice(0, 8).map((e) => (
                <ListRow
                  key={e.id}
                  icon={e.points >= 0 ? "trending-up-outline" : "trending-down-outline"}
                  iconTone={e.points >= 0 ? "green" : "red"}
                  title={e.reason}
                  sub={timeAgo(e.createdAt)}
                  trailing={
                    <Text style={[st.eventPts, { color: e.points >= 0 ? C.green : C.red }]}>
                      {e.points >= 0 ? "+" : ""}{e.points}
                    </Text>
                  }
                  divider
                />
              ))}
            </View>
          )}
        </Card>

        {/* Improve score */}
        <Card>
          <CardHeader title="Improve your score" subtitle="Tap any option below" />
          <ListRow
            icon="school-outline" iconTone="purple"
            title="Complete skill assessment" sub="Take a quick 3-question quiz"
            trailing={<Badge label="+8" tone="green" />} chevron
            onPress={() => setQuizOpen(true)} divider
          />
          <ListRow
            icon="receipt-outline" iconTone="blue"
            title="Verify work history" sub="Add completed job records"
            trailing={<Badge label="+6" tone="green" />} chevron
            onPress={() => setWorkOpen(true)} divider
          />
          <ListRow
            icon="ribbon-outline" iconTone="green"
            title="Add certification" sub="Add training certificates"
            trailing={<Badge label="+4" tone="green" />} chevron
            onPress={() => setCertOpen(true)} divider
          />
          <ListRow
            icon="shield-checkmark-outline" iconTone="primary"
            title="Request verification" sub="Identity, address, skill checks"
            trailing={<Badge label="+" tone="green" />} chevron
            onPress={() => setVerifyOpen(true)}
          />
        </Card>

        {/* Verifications list */}
        <Card>
          <CardHeader title="Your verifications" />
          {myVerifications.length === 0 ? (
            <Text style={st.empty}>No verification requests yet.</Text>
          ) : (
            <View>
              {myVerifications.map((v) => (
                <ListRow
                  key={v.id}
                  icon="ribbon-outline" iconTone="muted"
                  title={v.type.replace("-", " ").toUpperCase()}
                  trailing={<Badge label={v.status} tone={v.status === "verified" ? "green" : v.status === "rejected" ? "red" : "amber"} />}
                  divider
                />
              ))}
            </View>
          )}
        </Card>

        {/* AI coach */}
        <Card style={{ marginBottom: S.xl }}>
          <View style={st.coachRow}>
            <View style={st.coachIcon}>
              <Icon name="sparkles" size={18} color={C.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.coachLabel}>AI Trust Coach</Text>
              <Text style={st.coachText}>
                Complete one skill assessment and verify your last 2 work records to reach 90+ High Trust.
              </Text>
            </View>
          </View>
          <Button label="Ask the AI Coach" variant="secondary" onPress={() => router.push("/(worker)/assistant")} fullWidth />
        </Card>
      </ScrollView>

      {/* Quiz sheet */}
      <Sheet open={quizOpen} onClose={() => setQuizOpen(false)} title="Skill Assessment Quiz">
        {quizSubmitted ? (
          <View style={st.quizDone}>
            <View style={st.quizDoneCircle}>
              <Icon name="checkmark" size={34} color={C.green} />
            </View>
            <Text style={st.quizDoneText}>Quiz complete — score recorded!</Text>
          </View>
        ) : (
          <>
            <Text style={st.sheetLabel}>Skill to assess</Text>
            <View style={st.chipWrap}>
              {myQuizSkills.map((s) => (
                <Chip key={s} label={s} active={selectedSkill === s} onPress={() => { setSelectedSkill(s); setQuizAnswers({}); }} small />
              ))}
            </View>
            {quizQuestions.map((q, idx) => (
              <View key={idx} style={{ marginTop: S.lg }}>
                <Text style={st.quizQ}>{idx + 1}. {q.q}</Text>
                <View style={st.chipWrap}>
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
            <View style={{ marginTop: S.lg }}>
              <Button
                label="Submit Answers"
                onPress={handleFinishQuiz}
                disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                fullWidth
              />
            </View>
          </>
        )}
      </Sheet>

      {/* Work record sheet */}
      <Sheet open={workOpen} onClose={() => setWorkOpen(false)} title="Add Work Record">
        <Field label="Role" value={workForm.role} onChangeText={(v: string) => setWorkForm({ ...workForm, role: v })} />
        <Text style={st.sheetLabel}>Contractor you worked with</Text>
        <View style={st.chipWrap}>
          {contractors.map((c) => (
            <Chip
              key={c.userId}
              label={c.companyName}
              active={workForm.contractorId === c.userId}
              onPress={() => setWorkForm({ ...workForm, contractorId: c.userId })}
              small
            />
          ))}
        </View>
        <Field label="Start date (YYYY-MM-DD)" value={workForm.startDate} onChangeText={(v: string) => setWorkForm({ ...workForm, startDate: v })} />
        <Field label="End date (YYYY-MM-DD)" value={workForm.endDate} onChangeText={(v: string) => setWorkForm({ ...workForm, endDate: v })} />
        <Text style={st.sheetLabel}>Overall rating from contractor</Text>
        <View style={st.chipWrap}>
          {[1, 2, 3, 4, 5].map((r) => (
            <Chip key={r} label={"★".repeat(r)} active={workForm.rating === r} onPress={() => setWorkForm({ ...workForm, rating: r })} small />
          ))}
        </View>
        <Button label="Submit for Verification" onPress={handleSaveWork} fullWidth />
      </Sheet>

      {/* Certification sheet */}
      <Sheet open={certOpen} onClose={() => setCertOpen(false)} title="Add Certification">
        <Field
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
            <ListRow
              key={t.value}
              icon={t.icon as never} iconTone="primary"
              title={t.label} sub={t.desc}
              trailing={existing
                ? <Badge label={existing.status} tone={existing.status === "verified" ? "green" : "amber"} />
                : <Badge label="Request" tone="blue" />}
              chevron
              divider
              onPress={() => {
                if (existing?.status === "pending" || existing?.status === "verified") return;
                requestVerification(user!.id, t.value as never);
                setVerifyOpen(false);
              }}
            />
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },
  hero: { alignItems: "center", gap: S.md, paddingVertical: S.md },
  heroTitle: { fontSize: T.body + 3, fontWeight: "800", color: C.text, textAlign: "center", marginTop: S.xs },
  heroSub: { fontSize: T.caption + 1, color: C.text2, textAlign: "center", lineHeight: 21 },
  breakRow: { paddingVertical: S.sm, gap: S.xs },
  breakTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakCat: { fontSize: T.caption + 1, fontWeight: "700", color: C.text },
  breakPts: { fontSize: T.caption, fontWeight: "800", color: C.primary },
  breakReason: { fontSize: T.tiny, color: C.text3, lineHeight: 16 },
  eventPts: { fontSize: T.body, fontWeight: "800" },
  empty: { fontSize: T.caption + 1, color: C.text3, paddingVertical: S.md },
  coachRow: { flexDirection: "row", gap: S.md, alignItems: "flex-start", marginBottom: S.md },
  coachIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.purpleSoft, alignItems: "center", justifyContent: "center" },
  coachLabel: { fontSize: T.caption, fontWeight: "800", color: C.purple, textTransform: "uppercase", letterSpacing: 0.4 },
  coachText: { fontSize: T.caption + 1, color: C.text2, lineHeight: 20, marginTop: 2 },
  sheetLabel: { fontSize: T.caption, fontWeight: "700", color: C.text, marginBottom: S.sm, marginTop: S.xs },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.md },
  quizQ: { fontSize: T.caption + 1, fontWeight: "700", color: C.text, marginBottom: S.sm },
  quizDone: { alignItems: "center", paddingVertical: S.xxl, gap: S.md },
  quizDoneCircle: {
    width: 72, height: 72, borderRadius: 72 * 0.36,
    backgroundColor: C.greenSoft, alignItems: "center", justifyContent: "center",
  },
  quizDoneText: { fontSize: T.body, fontWeight: "800", color: C.green, textAlign: "center" },
});
