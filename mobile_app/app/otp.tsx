/**
 * OTP verify (V3) — 6 muted-fill code boxes, orange when filled.
 * New numbers return signupRequired → /signup carries params; signup=1 means
 * this verify CREATES the account (name/role/city included).
 */
import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { C, T, R, S } from "@/theme/tokens";

const CODE_LEN = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, signup, name, role, location } = useLocalSearchParams<{
    phone: string; signup?: string; name?: string; role?: "worker" | "contractor"; location?: string;
  }>();
  const verifyOtp = useStore((s) => s.verifyOtp);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const code = digits.join("");

  function setDigit(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, j) => (j === i ? "" : x)));
      return;
    }
    // Paste or fast typing — fill forward from position i.
    setDigits((d) => {
      const next = [...d];
      for (let k = 0; k < clean.length && i + k < CODE_LEN; k++) next[i + k] = clean[k];
      return next;
    });
    const nextIdx = Math.min(i + clean.length, CODE_LEN - 1);
    inputs.current[nextIdx]?.focus();
  }

  async function handleVerify() {
    if (code.length !== CODE_LEN) return;
    setBusy(true);
    try {
      const user = signup === "1"
        ? await verifyOtp(phone, code, name, role, location)
        : await verifyOtp(phone, code);
      if (user) {
        router.replace(user.role === "worker" ? "/(worker)/onboarding" : "/(contractor)/home");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={st.back}>
          <Icon name="chevron-back" size={20} color={C.text2} />
        </Pressable>

        <View style={st.iconWrap}>
          <View style={st.iconBox}>
            <Icon name="chatbox-ellipses" size={26} color={C.primary} />
          </View>
        </View>
        <Text style={st.title}>{signup === "1" ? "Confirm your number" : "Enter the code"}</Text>
        <Text style={st.sub}>
          {signup === "1"
            ? `We sent a fresh code to +91 ${phone} to activate your new account.`
            : `Sent to +91 ${phone}. Wrong number? Go back and edit.`}
        </Text>

        <View style={st.boxes}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !digits[i] && i > 0) {
                  inputs.current[i - 1]?.focus();
                }
              }}
              keyboardType="number-pad"
              maxLength={CODE_LEN}
              autoFocus={i === 0}
              style={[st.box, d ? st.boxFilled : null]}
              selectionColor={C.primary}
            />
          ))}
        </View>

        <Button
          label="Verify & Continue"
          onPress={handleVerify}
          loading={busy}
          disabled={code.length !== CODE_LEN}
          fullWidth
        />

        <Pressable onPress={() => { useStore.getState().sendOtp(phone); }} style={st.resend} hitSlop={10}>
          <Text style={st.resendText}>Resend code</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.xl, gap: S.md },
  back: {
    width: 40, height: 40,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  iconWrap: { alignItems: "center", marginTop: S.xl },
  iconBox: {
    width: 72, height: 72,
    borderRadius: 24,
    backgroundColor: C.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: T.title, fontWeight: "800", color: C.text, textAlign: "center", marginTop: S.md },
  sub: { fontSize: T.body, color: C.text2, textAlign: "center", lineHeight: 22 },
  boxes: { flexDirection: "row", gap: S.sm, marginVertical: S.lg },
  box: {
    flex: 1,
    aspectRatio: 0.8,
    backgroundColor: C.muted,
    borderRadius: R.md,
    textAlign: "center",
    fontSize: T.title,
    fontWeight: "800",
    color: C.text,
  },
  boxFilled: { backgroundColor: C.primarySoft, color: C.primary },
  resend: { alignItems: "center", paddingVertical: S.md },
  resendText: { color: C.primary, fontSize: T.body, fontWeight: "700" },
});
