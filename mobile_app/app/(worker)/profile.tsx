/**
 * Worker Profile — avatar upload (camera/gallery), bio & skills editing,
 * certifications, details edit sheet, and links to everything else
 * (trust, career, applications, notifications, report, settings, logout).
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "@/store";
import { PROFESSION_NAMES, AVAILABILITY_OPTIONS } from "@/services/professions";
import { CITIES, getCity } from "@/utils/cities";
import { formatINR } from "@/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Feedback";
import { Input, Chip } from "@/components/ui/Input";
import { C, T, R, S } from "@/theme/tokens";

export default function WorkerProfile() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const applications = useStore((s) => s.applications.filter((a) => a.workerId === s.currentUser?.id));
  const verifications = useStore((s) => s.verifications);
  const update = useStore((s) => s.updateWorkerProfile);
  const addSkill = useStore((s) => s.addSkill);
  const removeSkill = useStore((s) => s.removeSkill);
  const addCertification = useStore((s) => s.addCertification);
  const uploadAvatar = useStore((s) => s.uploadAvatar);
  const logout = useStore((s) => s.logout);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [bioEdit, setBioEdit] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [newSkill, setNewSkill] = useState("");
  const [newCert, setNewCert] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [details, setDetails] = useState({
    name: user?.name ?? "",
    profession: profile?.profession ?? "Mason",
    experienceYears: String(profile?.experienceYears ?? 0),
    expectedDailyWage: String(profile?.expectedDailyWage ?? 0),
    location: user?.location ?? "lucknow",
    preferredRadiusKm: String(profile?.preferredRadiusKm ?? 10),
    availability: profile?.availability ?? "available" as "available" | "working" | "unavailable",
  });

  if (!user || !profile) return null;
  const city = getCity(user.location || "lucknow");

  async function pickAvatar(useCamera: boolean) {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      useStore.getState().pushToast("error", "Camera/photo permission needed");
      return;
    }
    const res = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]?.uri) {
      setAvatarBusy(true);
      try { await uploadAvatar(res.assets[0].uri); } finally { setAvatarBusy(false); }
    }
  }

  function openDetails() {
    setDetails({
      name: user!.name,
      profession: profile!.profession,
      experienceYears: String(profile!.experienceYears),
      expectedDailyWage: String(profile!.expectedDailyWage),
      location: user!.location || "lucknow",
      preferredRadiusKm: String(profile!.preferredRadiusKm),
      availability: profile!.availability,
    });
    setDetailsOpen(true);
  }

  async function saveDetails() {
    setSaving(true);
    try {
      await update(user!.id, {
        name: details.name.trim(),
        profession: details.profession,
        experienceYears: Number(details.experienceYears) || 0,
        expectedDailyWage: Number(details.expectedDailyWage) || 0,
        preferredRadiusKm: Number(details.preferredRadiusKm) || 10,
        availability: details.availability,
        location: details.location,
      });
      setDetailsOpen(false);
    } catch { /* toast already shown */ } finally { setSaving(false); }
  }

  async function saveBio() {
    await update(user!.id, { bio });
    setBioEdit(false);
  }

  const activeApps = applications.filter((a) => !["completed", "rejected"].includes(a.status)).length;
  const verifiedBadge = verifications.some((v) => v.userId === user.id && v.status === "verified");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity card */}
        <View style={styles.identity}>
          <Pressable onPress={() => pickAvatar(false)} disabled={avatarBusy}>
            <Avatar src={user.avatar} name={user.name} size={84} />
            <View style={styles.camBadge}><Text style={styles.camText}>📷</Text></View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name}</Text>
              {verifiedBadge && <Text>✅</Text>}
            </View>
            <Text style={styles.meta}>
              {profile.profession} · {profile.experienceYears} yrs · {city.name}
            </Text>
            <Text style={styles.meta}>{formatINR(profile.expectedDailyWage)}/day expected</Text>
            <View style={{ marginTop: S.sm, flexDirection: "row", gap: S.sm }}>
              <Badge label={`Trust ${profile.trustScore}`} tone="green" />
              {profile.rating > 0 && <Badge label={`★ ${profile.rating.toFixed(1)}`} tone="amber" />}
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <View style={styles.statRow}>
          <View style={styles.statCell}><Text style={styles.statNum}>{activeApps}</Text><Text style={styles.statLabel}>Active applications</Text></View>
          <View style={styles.statCell}><Text style={styles.statNum}>{profile.completedJobs}</Text><Text style={styles.statLabel}>Jobs done</Text></View>
          <View style={styles.statCell}><Text style={styles.statNum}>{profile.profileCompletion}%</Text><Text style={styles.statLabel}>Profile complete</Text></View>
        </View>

        {/* About */}
        <Card>
          <CardHeader
            title="About me"
            right={<Button label={bioEdit ? "Cancel" : "Edit"} variant="link" size="sm" onPress={() => { setBio(profile.bio); setBioEdit(!bioEdit); }} />}
          />
          {bioEdit ? (
            <View style={{ gap: S.md }}>
              <Input value={bio} onChangeText={setBio} multiline placeholder="Tell contractors about your work…" style={{ height: 90, textAlignVertical: "top" }} />
              <Button label="Save" onPress={saveBio} size="sm" />
            </View>
          ) : (
            <Text style={styles.body}>{profile.bio || "No bio yet — add one to earn trust."}</Text>
          )}
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader
            title="Skills"
            subtitle="Better matches with more skills"
            right={<Button label="+ Add" variant="link" size="sm" onPress={() => setSkillOpen(true)} />}
          />
          <View style={styles.chipWrap}>
            {profile.skills.length === 0 && <Text style={styles.body}>No skills added yet.</Text>}
            {profile.skills.map((s) => (
              <Pressable key={s} style={styles.skillChip} onPress={() => removeSkill(user.id, s)}>
                <Text style={styles.skillText}>{s} ✕</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader
            title="Certifications"
            subtitle={`${profile.certifications.length} certificates`}
            right={<Button label="+ Add" variant="link" size="sm" onPress={() => setCertOpen(true)} />}
          />
          {profile.certifications.length === 0 ? (
            <Text style={styles.body}>No certifications yet — add training certificates to boost trust.</Text>
          ) : (
            profile.certifications.map((c) => (
              <View key={c} style={styles.certRow}>
                <Text>🏅</Text>
                <Text style={styles.certName}>{c}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Links */}
        <Card>
          {[
            { icon: "🛡️", label: "Trust & Verifications", go: "/(worker)/trust" },
            { icon: "🚀", label: "Career Roadmap", go: "/(worker)/career" },
            { icon: "📋", label: "My Applications", go: "/(worker)/applications" },
            { icon: "🔔", label: "Notifications", go: "/(worker)/notifications" },
            { icon: "⚠️", label: "Report a Safety Issue", go: "/(worker)/report" },
            { icon: "⚙️", label: "Settings", go: "/(worker)/settings" },
          ].map((r) => (
            <Pressable key={r.go} style={styles.linkRow} onPress={() => router.push(r.go as never)}>
              <Text style={{ fontSize: 18 }}>{r.icon}</Text>
              <Text style={styles.linkText}>{r.label}</Text>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          ))}
        </Card>

        <Button
          label="Log out"
          variant="destructive"
          onPress={() =>
            Alert.alert("Log out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Log out", style: "destructive", onPress: () => { logout(); router.replace("/"); } },
            ])
          }
          fullWidth
        />
      </ScrollView>

      {/* Details sheet */}
      <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Edit Profile Details">
        <Input label="Full name" value={details.name} onChangeText={(v) => setDetails({ ...details, name: v })} />
        <Text style={styles.sheetLabel}>Profession</Text>
        <View style={styles.chipWrap}>
          {PROFESSION_NAMES.map((p) => (
            <Chip key={p} label={p} active={details.profession === p} onPress={() => setDetails({ ...details, profession: p })} small />
          ))}
        </View>
        <Input label="Years of experience" value={details.experienceYears} onChangeText={(v) => setDetails({ ...details, experienceYears: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Input label="Expected daily wage (₹)" value={details.expectedDailyWage} onChangeText={(v) => setDetails({ ...details, expectedDailyWage: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Input label="Preferred radius (km)" value={details.preferredRadiusKm} onChangeText={(v) => setDetails({ ...details, preferredRadiusKm: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Text style={styles.sheetLabel}>City</Text>
        <View style={styles.chipWrap}>
          {CITIES.map((c) => (
            <Chip key={c.id} label={c.name} active={details.location === c.id} onPress={() => setDetails({ ...details, location: c.id })} small />
          ))}
        </View>
        <Text style={styles.sheetLabel}>Availability</Text>
        <View style={styles.chipWrap}>
          {AVAILABILITY_OPTIONS.map((a) => (
            <Chip key={a.value} label={a.label} active={details.availability === a.value} onPress={() => setDetails({ ...details, availability: a.value })} small />
          ))}
        </View>
        <Button label="Save Changes" onPress={saveDetails} loading={saving} fullWidth />
      </Sheet>

      {/* Skill sheet */}
      <Sheet open={skillOpen} onClose={() => setSkillOpen(false)} title="Add a Skill">
        <Input
          label="Skill name"
          value={newSkill}
          onChangeText={setNewSkill}
          placeholder='e.g. "Waterproofing"'
        />
        <Button
          label="Add Skill"
          onPress={async () => {
            if (newSkill.trim()) {
              await addSkill(user!.id, newSkill.trim());
              setNewSkill("");
              setSkillOpen(false);
            }
          }}
          disabled={newSkill.trim().length < 2}
          fullWidth
        />
      </Sheet>

      {/* Cert sheet */}
      <Sheet open={certOpen} onClose={() => setCertOpen(false)} title="Add Certification">
        <Input
          label="Certificate name"
          value={newCert}
          onChangeText={setNewCert}
          placeholder='e.g. "ITI Plumbing Course"'
        />
        <Button
          label="Add Certificate"
          onPress={async () => {
            if (newCert.trim()) {
              await addCertification(user!.id, newCert.trim());
              setNewCert("");
              setCertOpen(false);
            }
          }}
          disabled={newCert.trim().length < 2}
          fullWidth
        />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.lg },
  identity: { flexDirection: "row", gap: S.lg, alignItems: "center" },
  camBadge: {
    position: "absolute", right: -4, bottom: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.orange600, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: C.white,
  },
  camText: { fontSize: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  name: { fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  meta: { fontSize: T.xs, color: C.gray500, marginTop: 2, fontWeight: "600" },
  statRow: { flexDirection: "row", gap: S.sm },
  statCell: {
    flex: 1, backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md, alignItems: "center", gap: 2,
  },
  statNum: { fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  statLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600", textAlign: "center" },
  body: { fontSize: T.sm, color: C.gray600, lineHeight: 20 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  skillChip: { backgroundColor: C.blue100, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 6 },
  skillText: { color: C.blue600, fontSize: T.xs, fontWeight: "700" },
  certRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.sm },
  certName: { fontSize: T.sm, fontWeight: "700", color: C.navy900, flex: 1 },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  linkText: { flex: 1, fontSize: T.base, fontWeight: "700", color: C.navy900 },
  chev: { fontSize: 22, color: C.gray300, fontWeight: "700" },
  sheetLabel: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
});
