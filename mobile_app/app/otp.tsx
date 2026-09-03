/**
 * OTP verify — 6-digit code entry with auto-focus boxes.
 * New numbers return signupRequired → routes to /signup with the phone carried over.
 */
import React, { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
      // signup=1 means verify-otp is completing a NEW account (name/role/city set).
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
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>{signup === "1" ? "Confirm your number" : "Enter the code"}</Text>
        <Text style={styles.sub}>
          {signup === "1"
            ? `We sent a fresh code to +91 ${phone} to activate your new account.`
            : `Sent to +91 ${phone}. ${"\n"}Wrong number? Go back and edit.`}
        </Text>

        <View style={styles.boxes}>
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
              style={[styles.box, d ? styles.boxFilled : null]}
              selectionColor={C.orange600}
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

        <Pressable
          onPress={() => {
            useStore.getState().sendOtp(phone);
          }}
          style={styles.resend}
        >
          <Text style={styles.resendText}>Resend code</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  scroll: { padding: S.xl, gap: S.lg },
  back: { alignSelf: "flex-start", paddingVertical: S.xs },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { fontSize: T.xxl, fontWeight: "900", color: C.navy900, marginTop: S.xl },
  sub: { fontSize: T.sm, color: C.gray500, lineHeight: 20 },
  boxes: { flexDirection: "row", gap: S.sm, marginVertical: S.xl },
  box: {
    flex: 1,
    aspectRatio: 0.8,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.gray300,
    borderRadius: R.md,
    textAlign: "center",
    fontSize: T.xl,
    fontWeight: "800",
    color: C.navy900,
  },
  boxFilled: { borderColor: C.navy900 },
  resend: { alignItems: "center", paddingVertical: S.md },
  resendText: { color: C.orange600, fontSize: T.sm, fontWeight: "700" },
});
