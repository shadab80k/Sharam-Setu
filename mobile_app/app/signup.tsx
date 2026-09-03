/**
 * Signup (V3) — 2 clean role cards (Worker / Contractor), name, city Picker.
 * Continue → /otp with signup params carried over (verify completes account).
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Picker } from "@/components/ui/Picker";
import { C, T, R, S } from "@/theme/tokens";
import { CITIES } from "@/utils/cities";

type Role = "worker" | "contractor";

const CITY_OPTIONS = CITIES.map((c) => ({ value: c.name, label: c.name, sub: c.state }));

export default function Signup() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("worker");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const canContinue = name.trim().length >= 2 && city.length > 0;

  function handleContinue() {
    const selected = CITIES.find((c) => c.name === city);
    router.push({
      pathname: "/otp",
      params: {
        phone: "",
        signup: "1",
        name: name.trim(),
        role,
        location: selected?.name ?? city,
      },
    });
  }

  return (
    <SafeAreaView style={st.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        <Text style={st.title}>Create your account</Text>
        <Text style={st.sub}>Takes less than a minute. You'll verify your phone next.</Text>

        {/* Role */}
        <View style={st.roleRow}>
          <RoleCard
            active={role === "worker"}
            onPress={() => setRole("worker")}
            icon="person"
            title="Worker"
            sub="Find jobs, build trust"
          />
          <RoleCard
            active={role === "contractor"}
            onPress={() => setRole("contractor")}
            icon="business"
            title="Contractor"
            sub="Hire skilled workers"
          />
        </View>

        <View style={st.formCard}>
          <Field
            label="Your name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Ram Kumar"
          />
          <Picker
            label="City"
            value={city}
            options={CITY_OPTIONS}
            onChange={setCity}
            placeholder="Select your city"
          />
          <Button label="Continue" onPress={handleContinue} disabled={!canContinue} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleCard({ active, onPress, icon, title, sub }: {
  active: boolean; onPress: () => void; icon: "person" | "business"; title: string; sub: string;
}) {
  return (
    <View
      style={[st.roleCard, active && st.roleCardActive]}
      onTouchEnd={onPress}
    >
      <View style={[st.roleIcon, { backgroundColor: active ? C.primarySoft : C.muted }]}>
        <Icon name={icon} size={22} color={active ? C.primary : C.text2} />
      </View>
      <Text style={[st.roleTitle, { color: active ? C.text : C.text2 }]}>{title}</Text>
      <Text style={st.roleSub}>{sub}</Text>
      {active ? (
        <View style={st.checkDot}>
          <Icon name="checkmark" size={14} color={C.onPrimary} />
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.xl, gap: S.md },
  title: { fontSize: T.title, fontWeight: "800", color: C.text, marginTop: S.xl },
  sub: { fontSize: T.body, color: C.text2, lineHeight: 22, marginBottom: S.md },
  roleRow: { flexDirection: "row", gap: S.md },
  roleCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    gap: S.xs,
    alignItems: "flex-start",
  },
  roleCardActive: { backgroundColor: C.primarySoft },
  roleIcon: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.xs,
  },
  roleTitle: { fontSize: T.body, fontWeight: "700" },
  roleSub: { fontSize: T.caption, color: C.text2 },
  checkDot: {
    position: "absolute",
    top: S.md,
    right: S.md,
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginTop: S.xs,
  },
});
