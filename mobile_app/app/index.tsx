/**
 * Welcome / Login (V3) — phone OTP primary, email toggle, demo ListRows.
 * Premium minimal: logo + tagline top, one card, everything else quiet.
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { C, T, R, S } from "@/theme/tokens";

const DEMO = [
  { icon: "person" as const, tone: "primary" as const, email: "worker@shramsetu.local", title: "Try Worker demo", sub: "Jobs, trust score, money tracking" },
  { icon: "business" as const, tone: "blue" as const, email: "contractor@shramsetu.local", title: "Try Contractor demo", sub: "Post jobs, hire, pay, review" },
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

  async function handleEmailLogin() {
    setBusy("email");
    try {
      const user = await loginByEmail(email, password);
      if (user) router.replace(user.role === "worker" ? "/(worker)/home" : "/(contractor)/home");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
          {/* Brand */}
          <View style={st.brand}>
            <View style={st.logo}>
              <Text style={st.logoText}>S</Text>
            </View>
            <Text style={st.brandName}>ShramSetu</Text>
            <Text style={st.tagline}>Work you can trust</Text>
          </View>

          {/* Phone OTP — primary path */}
          <View style={st.card}>
            <Field
              label="Mobile number"
              icon="call"
              value={phone}
              onChangeText={(t: string) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Button
              label="Continue"
              onPress={() => router.push({ pathname: "/otp", params: { phone } })}
              disabled={phone.length !== 10}
              fullWidth
            />
          </View>

          {/* Email login toggle */}
          {emailMode ? (
            <View style={st.card}>
              <Field label="Email" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              <Field label="Password" icon="lock-closed" value={password} onChangeText={setPassword} placeholder="••••••" secureTextEntry />
              <Button label="Login" onPress={handleEmailLogin} loading={busy === "email"} disabled={!email || password.length < 6} fullWidth />
              <Pressable onPress={() => router.push("/signup")} style={st.switchLink} hitSlop={8}>
                <Text style={st.switchText}>New to ShramSetu? <Text style={{ color: C.primary, fontWeight: "700" }}>Create account</Text></Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setEmailMode(true)} style={st.switchLink} hitSlop={8}>
              <Text style={st.switchText}>Login with email instead</Text>
            </Pressable>
          )}

          {/* Demo accounts */}
          <View style={{ marginTop: S.xl }}>
            <SectionHeader title="Just exploring?" />
            <View style={st.demoCard}>
              {DEMO.map((d, i) => (
                <ListRow
                  key={d.email}
                  icon={d.icon}
                  iconTone={d.tone}
                  title={d.title}
                  sub={busy === d.email ? "Signing in…" : d.sub}
                  chevron
                  divider={i === 0}
                  onPress={() => handleDemo(d.email)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.xl, paddingBottom: S.xxxl },
  brand: { alignItems: "center", marginTop: S.xxxl, marginBottom: S.xxl, gap: S.xs },
  logo: {
    width: 80, height: 80,
    borderRadius: 24,
    backgroundColor: C.text,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.md,
  },
  logoText: { color: C.primary, fontSize: 38, fontWeight: "900" },
  brandName: { fontSize: T.title + 4, fontWeight: "800", color: C.text },
  tagline: { fontSize: T.body, color: C.text2, fontWeight: "500" },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
  },
  switchLink: { alignItems: "center", paddingVertical: S.sm },
  switchText: { color: C.text2, fontSize: T.body, fontWeight: "600" },
  demoCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.lg,
    paddingVertical: S.xs,
  },
});
