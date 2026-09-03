/**
 * Signup — name, role, city for new phone-OTP users.
 * The verify-otp endpoint requires name+role when the number is unregistered,
 * so this screen completes the signup via verifyOtp with those details.
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Input, Chip } from "@/components/ui/Input";
import { CITIES } from "@/utils/cities";
import { C, T, R, S } from "@/theme/tokens";

export default function SignupScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const verifyOtp = useStore((s) => s.verifyOtp);
  const sendOtp = useStore((s) => s.sendOtp);

  const [name, setName] = useState("");
  const [role, setRole] = useState<"worker" | "contractor">("worker");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);

  const cityOptions = CITIES.map((c) => ({ value: c.id, label: c.name }));

  async function handleSignup() {
    if (name.trim().length < 2 || !city) return;
    setBusy(true);
    // The OTP consumed at this point — request a fresh code for this number
    // and tell the user to enter it, since verify-otp both signs up & logs in.
    await sendOtp(phone);
    router.replace({
      pathname: "/otp",
      params: { phone, signup: "1", name: name.trim(), role, location: city },
    });
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.sub}>For +91 {phone}</Text>

        <Input label="Your full name" value={name} onChangeText={setName} placeholder="e.g. Ramesh Kumar" />

        <Text style={styles.label}>I am a…</Text>
        <View style={styles.roleRow}>
          {(["worker", "contractor"] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={[styles.roleCard, role === r && styles.roleActive]}
            >
              <Text style={styles.roleEmoji}>{r === "worker" ? "👷" : "🏗️"}</Text>
              <Text style={[styles.roleName, role === r && styles.roleNameActive]}>
                {r === "worker" ? "Worker" : "Contractor"}
              </Text>
              <Text style={styles.roleSub}>
                {r === "worker" ? "I'm looking for jobs" : "I hire workers"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>City you work in</Text>
        <View style={styles.cityWrap}>
          {cityOptions.map((c) => (
            <Chip key={c.value} label={c.label} active={city === c.value} onPress={() => setCity(c.value)} />
          ))}
        </View>

        <Button
          label="Continue"
          onPress={handleSignup}
          loading={busy}
          disabled={name.trim().length < 2 || !city}
          fullWidth
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.xl, gap: S.md, paddingBottom: S.xxxl },
  back: { alignSelf: "flex-start", paddingVertical: S.xs },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900, marginTop: S.xl },
  sub: { fontSize: T.sm, color: C.gray500, marginBottom: S.md },
  label: { color: C.navy900, fontSize: T.sm, fontWeight: "700", marginTop: S.sm },
  roleRow: { flexDirection: "row", gap: S.md },
  roleCard: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.gray200,
    borderRadius: R.lg,
    padding: S.lg,
    alignItems: "center",
    gap: S.xs,
  },
  roleActive: { borderColor: C.orange600, backgroundColor: C.orange100 },
  roleEmoji: { fontSize: 28 },
  roleName: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  roleNameActive: { color: C.orange600 },
  roleSub: { fontSize: T.xs, color: C.gray500, textAlign: "center" },
  cityWrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
});
