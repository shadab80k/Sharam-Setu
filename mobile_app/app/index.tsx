/**
 * Welcome / Login — phone OTP (primary), demo accounts, email login + signup.
 * Mirrors the web LoginPageClient flow for mazdur-first usage: one big phone
 * field, one green button; everything else tucked below.
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { C, T, R, S } from "@/theme/tokens";

const DEMO = [
  { role: "Worker", email: "worker@shramsetu.local" },
  { role: "Contractor", email: "contractor@shramsetu.local" },
];

export default function Welcome() {
  const router = useRouter();
  const loginByEmail = useStore((s) => s.loginByEmail);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [emailMode, setEmailMode] = useState(false);

  async function handleDemo(demoEmail: string) {
    setBusy(demoEmail);
    try {
      const user = await loginByEmail(demoEmail, "demo1234");
      if (user) {
        router.replace(user.role === "worker" ? "/(worker)/home" : "/(contractor)/home");
      }
    } finally {
      setBusy(null);
    }
  }

  function handleSendOtp() {
    router.push({ pathname: "/otp", params: { phone } });
  }

  function handleEmailLogin() {
    setBusy("email");
    loginByEmail(email, password).then((user) => {
      if (user) router.replace(user.role === "worker" ? "/(worker)/home" : "/(contractor)/home");
      setBusy(null);
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.brandName}>ShramSetu</Text>
            <Text style={styles.tagline}>The bridge between workers and work</Text>
          </View>

          {/* Phone OTP — primary path */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login with your phone</Text>
            <Text style={styles.cardSub}>We'll send a 6-digit code by SMS</Text>
            <Input
              label="Mobile number"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Button
              label="Send Code"
              onPress={handleSendOtp}
              disabled={phone.length !== 10}
              fullWidth
            />
          </View>

          {/* Email login toggle */}
          {emailMode ? (
            <View style={styles.card}>
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••" secureTextEntry />
              <Button label="Login" onPress={handleEmailLogin} loading={busy === "email"} disabled={!email || password.length < 6} fullWidth />
              <Pressable onPress={() => router.push("/signup")} style={styles.switchLink}>
                <Text style={styles.switchText}>New here? <Text style={{ color: C.orange600, fontWeight: "700" }}>Create an account</Text></Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEmailMode(true)} style={styles.switchLink}>
              <Text style={styles.switchText}>Login with email instead</Text>
            </Pressable>
          )}

          {/* Demo accounts */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Quick demo access</Text>
            <Text style={styles.demoSub}>Explore with seeded evaluator accounts</Text>
            <View style={{ flexDirection: "row", gap: S.md }}>
              {DEMO.map((d) => (
                <Pressable
                  key={d.role}
                  style={[styles.demoBtn, d.role === "Worker" ? { backgroundColor: C.orange100 } : { backgroundColor: C.blue100 }]}
                  onPress={() => handleDemo(d.email)}
                  disabled={busy !== null}
                >
                  <Text style={styles.demoRole}>{d.role}</Text>
                  <Text style={styles.demoHint}>{busy === d.email ? "Signing in…" : "Tap to enter"}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.xl, paddingBottom: S.xxxl, gap: S.lg },
  brand: { alignItems: "center", marginTop: S.xl, marginBottom: S.lg, gap: S.xs },
  logo: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: C.navy900, alignItems: "center", justifyContent: "center",
    marginBottom: S.sm,
  },
  logoText: { color: C.orange500, fontSize: 40, fontWeight: "900" },
  brandName: { fontSize: T.xxl, fontWeight: "900", color: C.navy900 },
  tagline: { fontSize: T.sm, color: C.gray500, fontWeight: "500" },
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: S.xl,
    gap: S.md,
  },
  cardTitle: { fontSize: T.lg, fontWeight: "800", color: C.navy900 },
  cardSub: { fontSize: T.sm, color: C.gray500, marginTop: -S.xs },
  switchLink: { alignItems: "center", paddingVertical: S.sm },
  switchText: { color: C.gray600, fontSize: T.sm, fontWeight: "600" },
  demoBox: {
    marginTop: S.md,
    backgroundColor: C.cream100,
    borderRadius: R.lg,
    padding: S.xl,
    gap: S.sm,
  },
  demoTitle: { fontSize: T.sm, fontWeight: "800", color: C.navy900, textAlign: "center" },
  demoSub: { fontSize: T.xs, color: C.gray600, textAlign: "center", marginBottom: S.xs },
  demoBtn: {
    flex: 1,
    borderRadius: R.md,
    paddingVertical: S.md,
    alignItems: "center",
    gap: 2,
  },
  demoRole: { fontSize: T.base, fontWeight: "800", color: C.navy900 },
  demoHint: { fontSize: T.xs, color: C.gray600, fontWeight: "600" },
});
