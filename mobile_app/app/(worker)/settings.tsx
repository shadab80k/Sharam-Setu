/**
 * Settings — language toggle (English active, Hindi visible but locked for v1.1),
 * account info, about, logout.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { C, T, R, S } from "@/theme/tokens";

export default function WorkerSettings() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.title}>Settings</Text>

        {/* Language */}
        <Card>
          <CardHeader title="Language" subtitle="App display language" />
          <View style={styles.langRow}>
            <View style={[styles.langOpt, styles.langActive]}>
              <Text style={styles.langEmoji}>🇬🇧</Text>
              <Text style={styles.langName}>English</Text>
              <Badge label="✓ Active" tone="green" />
            </View>
            <View style={styles.langOpt}>
              <Text style={styles.langEmoji}>🇮🇳</Text>
              <Text style={styles.langName}>हिंदी</Text>
              <Badge label="🔒 Coming soon" tone="amber" />
            </View>
          </View>
          <Text style={styles.hindiNote}>
            Hindi translation is being finalized and will arrive in a coming update.
          </Text>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader title="Account" />
          <View style={styles.acctRow}><Text style={styles.acctLabel}>Name</Text><Text style={styles.acctValue}>{user.name}</Text></View>
          <View style={styles.acctRow}><Text style={styles.acctLabel}>Phone</Text><Text style={styles.acctValue}>+91 {user.phone}</Text></View>
          <View style={styles.acctRow}><Text style={styles.acctLabel}>Email</Text><Text style={styles.acctValue}>{"<"}{user.email}{">"}</Text></View>
          <View style={styles.acctRow}><Text style={styles.acctLabel}>Role</Text><Text style={styles.acctValue}>{user.role}</Text></View>
          <View style={styles.acctRow}><Text style={styles.acctLabel}>Status</Text><Badge label={user.status} tone={user.status === "active" ? "green" : "red"} /></View>
        </Card>

        {/* About */}
        <Card>
          <CardHeader title="About ShramSetu" />
          <Text style={styles.body}>
            ShramSetu connects workers with verified contractors — with AI job matching, a trust score earned through real work, wage estimates, and an AI assistant. Version 1.0.0
          </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.lg, paddingTop: S.md, paddingBottom: S.xxxl, gap: S.lg },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  langRow: { flexDirection: "row", gap: S.md, marginTop: S.xs },
  langOpt: {
    flex: 1,
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: R.md,
    padding: S.md, alignItems: "center", gap: S.xs,
    opacity: 0.75,
  },
  langActive: { borderColor: C.green600, backgroundColor: C.green100, opacity: 1 },
  langEmoji: { fontSize: 26 },
  langName: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  hindiNote: { fontSize: T.xs, color: C.gray500, marginTop: S.md },
  acctRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: S.sm, gap: S.md },
  acctLabel: { fontSize: T.sm, color: C.gray500, fontWeight: "700" },
  acctValue: { fontSize: T.sm, color: C.navy900, fontWeight: "700", flex: 1, textAlign: "right" },
  body: { fontSize: T.sm, color: C.gray600, lineHeight: 20 },
});
