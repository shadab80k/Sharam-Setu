/**
 * Contractor Profile (V3) — company identity, reputation metrics with
 * payment-reliability bar, links ListRows, edit Sheet, avatar upload.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "@/store";
import { CITIES, getCity } from "@/utils/cities";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Field } from "@/components/ui/Field";
import { Picker } from "@/components/ui/Picker";
import { StatTile, StatRow } from "@/components/ui/StatTile";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";

const BUSINESS_TYPES = ["Residential", "Commercial", "Infrastructure", "Renovation"];

export default function ContractorProfile() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.contractorProfiles.find((p) => p.userId === s.currentUser?.id));
  const jobs = useStore((s) => s.jobs.filter((j) => j.contractorId === s.currentUser?.id));
  const payments = useStore((s) => s.payments.filter((p) => p.contractorId === s.currentUser?.id));
  const update = useStore((s) => s.updateContractorProfile);
  const uploadAvatar = useStore((s) => s.uploadAvatar);
  const logout = useStore((s) => s.logout);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", businessType: "", location: "" });

  if (!user || !profile) return null;
  const city = getCity(user.location || "lucknow");

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      useStore.getState().pushToast("error", "Photo permission needed");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]?.uri) {
      setAvatarBusy(true);
      try { await uploadAvatar(res.assets[0].uri); } finally { setAvatarBusy(false); }
    }
  }

  function openEdit() {
    setForm({
      name: user!.name,
      companyName: profile!.companyName,
      businessType: profile!.businessType || BUSINESS_TYPES[0],
      location: user!.location || "lucknow",
    });
    setEditOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      await update(user!.id, {
        name: form.name.trim(),
        companyName: form.companyName.trim(),
        businessType: form.businessType,
        location: form.location,
      });
      setEditOpen(false);
    } catch { /* toasted */ } finally { setSaving(false); }
  }

  const activeJobs = jobs.filter((j) => j.status === "active").length;

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        {/* Identity */}
        <View style={st.identity}>
          <Pressable onPress={pickAvatar} disabled={avatarBusy}>
            <Avatar src={user.avatar} name={profile.companyName} size={84} />
            <View style={st.camBadge}>
              <Icon name="camera" size={13} color={C.onPrimary} />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{profile.companyName}</Text>
            <View style={st.badgeRow}>
              <Badge label={profile.businessType || "Contractor"} tone="blue" />
              <Badge label={`★ ${profile.rating.toFixed(1)}`} tone="amber" />
              <Badge label={`Trust ${profile.trustScore}`} tone="green" />
            </View>
            <Text style={st.meta}>{user.name} · {city.name}</Text>
          </View>
        </View>

        {/* Reputation */}
        <Card>
          <CardHeader title="Your reputation" subtitle="What workers see about you" />
          <StatRow>
            <StatTile label="Rating" value={`${profile.rating.toFixed(1)}★`} sub="worker-rated" tone="amber" />
            <StatTile label="Jobs" value={String(profile.completedJobs)} sub="completed" tone="green" />
            <StatTile label="Active" value={String(activeJobs)} sub="jobs now" tone="primary" />
          </StatRow>
          {profile.paidPayments > 0 && (
            <View style={{ marginTop: S.md }}>
              <View style={st.relRow}>
                <Text style={st.relLabel}>On-time payment reliability</Text>
                <Text style={[st.relValue, { color: profile.paymentReliability >= 70 ? C.green : C.primary }]}>
                  {profile.paymentReliability}%
                </Text>
              </View>
              <ProgressBar
                value={profile.paymentReliability}
                tone={profile.paymentReliability >= 70 ? C.green : C.primary}
                height={7}
              />
              <Text style={st.relNote}>from {profile.paidPayments} paid wage records — pay on time to keep this high</Text>
            </View>
          )}
        </Card>

        {/* Links */}
        <Card style={{ paddingHorizontal: S.md }}>
          {[
            { icon: "briefcase-outline" as const, tone: "primary" as const, label: "My Jobs", go: "/(contractor)/jobs" },
            { icon: "people-outline" as const, tone: "blue" as const, label: "Find Workers", go: "/(contractor)/workers" },
            { icon: "documents-outline" as const, tone: "blue" as const, label: "Applicants", go: "/(contractor)/applicants" },
            { icon: "wallet-outline" as const, tone: "green" as const, label: "Payments", go: "/(contractor)/payments" },
            { icon: "star-outline" as const, tone: "amber" as const, label: "Reviews", go: "/(contractor)/reviews" },
            { icon: "notifications-outline" as const, tone: "amber" as const, label: "Notifications", go: "/(contractor)/notifications" },
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

        {/* Support */}
        <Card style={{ marginBottom: S.xl, paddingHorizontal: S.md }}>
          <ListRow
            icon="mail-outline"
            iconTone="muted"
            title="Support"
            sub="help@shramsetu.in"
            chevron
            onPress={() => Linking.openURL("mailto:help@shramsetu.in")}
          />
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

      {/* Edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Company Profile">
        <Field label="Your name" value={form.name} onChangeText={(v: string) => setForm({ ...form, name: v })} />
        <Field label="Company name" value={form.companyName} onChangeText={(v: string) => setForm({ ...form, companyName: v })} />
        <Picker
          label="Business type"
          value={form.businessType}
          options={BUSINESS_TYPES.map((b) => ({ value: b, label: b }))}
          onChange={(v) => setForm({ ...form, businessType: v })}
        />
        <Picker
          label="City"
          value={CITIES.find((c) => c.id === form.location)?.name ?? ""}
          options={CITIES.map((c) => ({ value: c.name, label: c.name, sub: c.state }))}
          onChange={(name) => setForm({ ...form, location: CITIES.find((c) => c.name === name)?.id ?? form.location })}
        />
        <Button label="Save Changes" onPress={save} loading={saving} disabled={!form.name.trim() || !form.companyName.trim()} fullWidth />
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
  name: { fontSize: T.title, fontWeight: "800", color: C.text, marginBottom: S.xs },
  badgeRow: { flexDirection: "row", gap: S.sm, flexWrap: "wrap", marginBottom: S.xs },
  meta: { fontSize: T.caption, color: C.text2, fontWeight: "500" },
  relRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.xs },
  relLabel: { fontSize: T.caption + 1, color: C.text2, fontWeight: "600" },
  relValue: { fontSize: T.body + 1, fontWeight: "800" },
  relNote: { fontSize: T.tiny, color: C.text3, marginTop: S.xs, lineHeight: 15 },
});
