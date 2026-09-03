/**
 * Worker Profile (V3) — identity hero with avatar upload, stat tiles, About
 * edit, skills chips, cert ListRows, links ListRow, details/skill/cert Sheets.
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
import { StatTile, StatRow } from "@/components/ui/StatTile";
import { Sheet } from "@/components/ui/Sheet";
import { Field, TextArea } from "@/components/ui/Field";
import { Picker } from "@/components/ui/Picker";
import { Chip } from "@/components/ui/Chips";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
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
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        {/* Identity card */}
        <View style={st.identity}>
          <Pressable onPress={() => pickAvatar(false)} disabled={avatarBusy}>
            <Avatar src={user.avatar} name={user.name} size={84} />
            <View style={st.camBadge}>
              <Icon name="camera" size={13} color={C.onPrimary} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={st.nameRow}>
              <Text style={st.name}>{user.name}</Text>
              {verifiedBadge && (
                <View style={st.verifiedBadge}>
                  <Icon name="checkmark" size={11} color={C.onPrimary} />
                </View>
              )}
            </View>
            <Text style={st.meta}>
              {profile.profession} · {profile.experienceYears} yrs · {city.name}
            </Text>
            <Text style={st.meta}>{formatINR(profile.expectedDailyWage)}/day expected</Text>
            <View style={{ marginTop: S.sm, flexDirection: "row", gap: S.sm }}>
              <Badge label={`Trust ${profile.trustScore}`} tone="green" />
              {profile.rating > 0 && <Badge label={`★ ${profile.rating.toFixed(1)}`} tone="amber" />}
            </View>
          </View>
        </View>

        {/* Quick stats */}
        <StatRow>
          <StatTile label="Active" value={String(activeApps)} sub="applications" tone="blue" />
          <StatTile label="Jobs" value={String(profile.completedJobs)} sub="completed" tone="green" />
          <StatTile label="Profile" value={`${profile.profileCompletion}%`} sub="complete" tone="primary" />
        </StatRow>

        {/* About */}
        <Card>
          <CardHeader
            title="About me"
            right={<Button label={bioEdit ? "Cancel" : "Edit"} variant="text" size="sm" onPress={() => { setBio(profile.bio); setBioEdit(!bioEdit); }} />}
          />
          {bioEdit ? (
            <View style={{ gap: S.md }}>
              <TextArea value={bio} onChangeText={setBio} placeholder="Tell contractors about your work…" />
              <Button label="Save" onPress={saveBio} size="sm" />
            </View>
          ) : (
            <Text style={st.body}>{profile.bio || "No bio yet — add one to earn trust."}</Text>
          )}
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader
            title="Skills"
            subtitle="Better matches with more skills"
            right={<Button label="Add" variant="text" size="sm" onPress={() => setSkillOpen(true)} />}
          />
          <View style={st.chipWrap}>
            {profile.skills.length === 0 && <Text style={st.body}>No skills added yet.</Text>}
            {profile.skills.map((s) => (
              <Chip
                key={s}
                label={s}
                active
                onPress={() => removeSkill(user.id, s)}
                small
              />
            ))}
          </View>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader
            title="Certifications"
            subtitle={`${profile.certifications.length} certificates`}
            right={<Button label="Add" variant="text" size="sm" onPress={() => setCertOpen(true)} />}
          />
          {profile.certifications.length === 0 ? (
            <Text style={st.body}>No certifications yet — add training certificates to boost trust.</Text>
          ) : (
            <View>
              {profile.certifications.map((c, i) => (
                <ListRow
                  key={c}
                  icon="ribbon-outline"
                  iconTone="green"
                  title={c}
                  divider={i < profile.certifications.length - 1}
                />
              ))}
            </View>
          )}
        </Card>

        {/* Links */}
        <Card style={{ paddingHorizontal: S.md }}>
          {[
            { icon: "shield-checkmark-outline" as const, tone: "green" as const, label: "Trust & Verifications", go: "/(worker)/trust" },
            { icon: "rocket-outline" as const, tone: "primary" as const, label: "Career Roadmap", go: "/(worker)/career" },
            { icon: "documents-outline" as const, tone: "blue" as const, label: "My Applications", go: "/(worker)/applications" },
            { icon: "notifications-outline" as const, tone: "amber" as const, label: "Notifications", go: "/(worker)/notifications" },
            { icon: "warning-outline" as const, tone: "red" as const, label: "Report a Safety Issue", go: "/(worker)/report" },
            { icon: "settings-outline" as const, tone: "muted" as const, label: "Settings", go: "/(worker)/settings" },
          ].map((r, i, arr) => (
            <ListRow
              key={r.go}
              icon={r.icon}
              iconTone={r.tone}
              title={r.label}
              chevron
              divider={i < arr.length - 1}
              onPress={() => router.push(r.go as never)}
            />
          ))}
        </Card>

        <Button
          label="Log out"
          variant="danger"
          icon="log-out-outline"
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
        <Field label="Full name" icon="person-outline" value={details.name} onChangeText={(v: string) => setDetails({ ...details, name: v })} />
        <Picker
          label="Profession"
          value={details.profession}
          options={PROFESSION_NAMES.map((p) => ({ value: p, label: p }))}
          onChange={(v) => setDetails({ ...details, profession: v })}
        />
        <Field label="Years of experience" value={details.experienceYears} onChangeText={(v: string) => setDetails({ ...details, experienceYears: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Field label="Expected daily wage (₹)" value={details.expectedDailyWage} onChangeText={(v: string) => setDetails({ ...details, expectedDailyWage: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Field label="Preferred radius (km)" value={details.preferredRadiusKm} onChangeText={(v: string) => setDetails({ ...details, preferredRadiusKm: v.replace(/\D/g, "") })} keyboardType="number-pad" />
        <Picker
          label="City"
          value={CITIES.find((c) => c.id === details.location)?.name ?? ""}
          options={CITIES.map((c) => ({ value: c.name, label: c.name, sub: c.state }))}
          onChange={(name) => setDetails({ ...details, location: CITIES.find((c) => c.name === name)?.id ?? details.location })}
        />
        <Picker
          label="Availability"
          value={AVAILABILITY_OPTIONS.find((a) => a.value === details.availability)?.label ?? ""}
          options={AVAILABILITY_OPTIONS.map((a) => ({ value: a.label, label: a.label }))}
          onChange={(label) => setDetails({ ...details, availability: AVAILABILITY_OPTIONS.find((a) => a.label === label)?.value ?? "available" })}
        />
        <Button label="Save Changes" onPress={saveDetails} loading={saving} fullWidth />
      </Sheet>

      {/* Skill sheet */}
      <Sheet open={skillOpen} onClose={() => setSkillOpen(false)} title="Add a Skill">
        <Field
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
        <Field
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

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingBottom: S.xxxl, gap: S.md },
  identity: { flexDirection: "row", gap: S.lg, alignItems: "center" },
  camBadge: {
    position: "absolute", right: -4, bottom: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: C.white,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  name: { fontSize: T.title, fontWeight: "800", color: C.text },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
  },
  meta: { fontSize: T.caption, color: C.text2, marginTop: 2, fontWeight: "500" },
  body: { fontSize: T.caption + 1, color: C.text2, lineHeight: 21 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
});
