/**
 * Contractor Profile — company identity, reputation metrics, edit sheet
 * (name/company/business type/city), avatar upload, links, logout.
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
import { Sheet, ProgressBar } from "@/components/ui/Feedback";
import { Input, Chip } from "@/components/ui/Input";
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
  const paidCount = payments.filter((p) => p.status === "paid").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity */}
        <View style={styles.identity}>
          <Pressable onPress={pickAvatar} disabled={avatarBusy}>
            <Avatar src={user.avatar} name={profile.companyName} size={84} />
            <View style={styles.camBadge}><Text style={styles.camText}>📷</Text></View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.companyName}</Text>
            <View style={styles.badgeRow}>
              <Badge label={profile.businessType || "Contractor"} tone="blue" />
              <Badge label={`★ ${profile.rating.toFixed(1)}`} tone="amber" />
              <Badge label={`Trust ${profile.trustScore}`} tone="green" />
            </View>
            <Text style={styles.meta}>{user.name} · {city.name}</Text>
          </View>
          <Button label="Edit" variant="secondary" size="sm" onPress={openEdit} />
        </View>

        {/* Reputation */}
        <Card>
          <CardHeader title="Your reputation" subtitle="What workers see about you" />
          <View style={styles.repRow}>
            <View style={styles.repCell}>
              <Text style={styles.repNum}>{profile.rating.toFixed(1)}★</Text>
              <Text style={styles.repLabel}>Worker rating</Text>
            </View>
            <View style={styles.repCell}>
              <Text style={styles.repNum}>{profile.completedJobs}</Text>
              <Text style={styles.repLabel}>Jobs completed</Text>
            </View>
            <View style={styles.repCell}>
              <Text style={styles.repNum}>{activeJobs}</Text>
              <Text style={styles.repLabel}>Active jobs</Text>
            </View>
          </View>
          {profile.paidPayments > 0 && (
            <View style={{ marginTop: S.md }}>
              <View style={styles.relRow}>
                <Text style={styles.relLabel}>On-time payment reliability</Text>
                <Text style={[styles.relValue, { color: profile.paymentReliability >= 70 ? C.green600 : C.orange600 }]}>
                  {profile.paymentReliability}%
                </Text>
              </View>
              <ProgressBar value={profile.paymentReliability} tone={profile.paymentReliability >= 70 ? C.green600 : C.orange600} height={7} />
              <Text style={styles.relNote}>from {profile.paidPayments} paid wage records — pay on time to keep this high</Text>
            </View>
          )}
        </Card>

        {/* Links */}
        <Card>
          {[
            { icon: "🧰", label: "My Jobs", go: "/(contractor)/jobs" },
            { icon: "👷", label: "Find Workers", go: "/(contractor)/workers" },
            { icon: "📋", label: "Applicants", go: "/(contractor)/applicants" },
            { icon: "💰", label: "Payments", go: "/(contractor)/payments" },
            { icon: "⭐", label: "Reviews", go: "/(contractor)/reviews" },
            { icon: "🔔", label: "Notifications", go: "/(contractor)/notifications" },
          ].map((r) => (
            <Pressable key={r.go} style={styles.linkRow} onPress={() => router.push(r.go as never)}>
              <Text style={{ fontSize: 18 }}>{r.icon}</Text>
              <Text style={styles.linkText}>{r.label}</Text>
              <Text style={styles.chev}>›</Text>
            </Pressable>
          ))}
        </Card>

        {/* Support */}
        <Card>
          <CardHeader title="Support" />
          <Pressable style={styles.linkRow} onPress={() => Linking.openURL("mailto:help@shramsetu.in")}>
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <Text style={styles.linkText}>help@shramsetu.in</Text>
          </Pressable>
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

      {/* Edit sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Company Profile">
        <Input label="Your name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <Input label="Company name" value={form.companyName} onChangeText={(v) => setForm({ ...form, companyName: v })} />
        <Text style={styles.label}>Business type</Text>
        <View style={styles.chipWrap}>
          {BUSINESS_TYPES.map((b) => (
            <Chip key={b} label={b} active={form.businessType === b} onPress={() => setForm({ ...form, businessType: b })} small />
          ))}
        </View>
        <Text style={styles.label}>City</Text>
        <View style={styles.chipWrap}>
          {CITIES.map((c) => (
            <Chip key={c.id} label={c.name} active={form.location === c.id} onPress={() => setForm({ ...form, location: c.id })} small />
          ))}
        </View>
        <Button label="Save Changes" onPress={save} loading={saving} disabled={!form.name.trim() || !form.companyName.trim()} fullWidth />
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
  name: { fontSize: T.xl, fontWeight: "900", color: C.navy900, marginBottom: S.sm },
  badgeRow: { flexDirection: "row", gap: S.sm, flexWrap: "wrap", marginBottom: S.sm },
  meta: { fontSize: T.xs, color: C.gray500, fontWeight: "600" },
  repRow: { flexDirection: "row", gap: S.sm },
  repCell: { flex: 1, alignItems: "center", gap: 2 },
  repNum: { fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  repLabel: { fontSize: T.xs, color: C.gray500, fontWeight: "600", textAlign: "center" },
  relRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: S.xs },
  relLabel: { fontSize: T.sm, color: C.gray600, fontWeight: "700" },
  relValue: { fontSize: T.sm, fontWeight: "900" },
  relNote: { fontSize: T.xs, color: C.gray500, marginTop: S.xs },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingVertical: S.md, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  linkText: { flex: 1, fontSize: T.base, fontWeight: "700", color: C.navy900 },
  chev: { fontSize: 22, color: C.gray300, fontWeight: "700" },
  label: { fontSize: T.sm, fontWeight: "700", color: C.navy900, marginBottom: S.sm },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginBottom: S.lg },
});
