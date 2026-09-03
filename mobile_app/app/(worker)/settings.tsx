/**
 * Settings (V3) — language rows (English active / Hindi locked),
 * account info, about, logout.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge, DotText } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";

export default function WorkerSettings() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  if (!user) return null;

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={st.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={st.title}>Settings</Text>

        {/* Language */}
        <Card style={{ paddingHorizontal: S.md }}>
          <CardHeader title="Language" subtitle="App display language" style={{ paddingHorizontal: 0 }} />
          <ListRow
            icon="language-outline"
            iconTone="green"
            title="English"
            sub="Active"
            trailing={<DotText text="Active" tone="green" />}
            divider
          />
          <ListRow
            icon="language-outline"
            iconTone="muted"
            title="हिंदी"
            sub="Coming soon"
            trailing={<Badge label="Soon" tone="amber" />}
          />
          <Text style={st.hindiNote}>
            Hindi translation is being finalized and will arrive in a coming update.
          </Text>
        </Card>

        {/* Account */}
        <Card style={{ paddingHorizontal: S.md }}>
          <CardHeader title="Account" style={{ paddingHorizontal: 0 }} />
          <InfoRow label="Name" value={user.name} />
          <InfoRow label="Phone" value={`+91 ${user.phone}`} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Status" value={user.status} last />
        </Card>

        {/* About */}
        <Card style={{ marginBottom: S.xl }}>
          <CardHeader title="About ShramSetu" />
          <Text style={st.body}>
            ShramSetu connects workers with verified contractors — with AI job matching, a trust score earned through real work, wage estimates, and an AI assistant. Version 1.0.0
          </Text>
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
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[st.acctRow, !last && st.acctDivider]}>
      <Text style={st.acctLabel}>{label}</Text>
      <Text style={st.acctValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl, gap: S.md },
  backBtn: { width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  title: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  hindiNote: { fontSize: T.tiny, color: C.text3, marginTop: S.sm, marginBottom: S.md },
  acctRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: S.sm + 2, gap: S.md },
  acctDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  acctLabel: { fontSize: T.caption + 1, color: C.text2, fontWeight: "600" },
  acctValue: { fontSize: T.caption + 1, color: C.text, fontWeight: "700", flex: 1, textAlign: "right" },
  body: { fontSize: T.caption + 1, color: C.text2, lineHeight: 21 },
});
