/**
 * V3 StatTile — borderless value block: icon + tiny label + big value + optional trend.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Icon, IconName } from "./Icon";
import { C, T, R, S } from "../../theme/tokens";

export function StatTile({
  icon, label, value, sub, tone = "muted", onPress,
}: {
  icon?: IconName;
  label: string;
  value: string | number;
  sub?: string;
  tone?: "primary" | "green" | "amber" | "red" | "blue" | "purple" | "muted";
  onPress?: () => void;
}) {
  const fg =
    tone === "primary" ? C.primary : tone === "green" ? C.green : tone === "amber" ? C.amber :
    tone === "red" ? C.red : tone === "blue" ? C.blue : tone === "purple" ? C.purple : C.text2;

  const body = (
    <>
      {icon ? (
        <View style={st.iconRow}>
          <Icon name={icon} size={15} color={fg} />
          <Text style={[st.label, { color: fg }]} numberOfLines={1}>{label}</Text>
        </View>
      ) : (
        <Text style={st.label} numberOfLines={1}>{label}</Text>
      )}
      <Text style={st.value} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={st.sub} numberOfLines={1}>{sub}</Text> : null}
    </>
  );

  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [st.tile, pressed && { opacity: 0.7 }]}>{body}</Pressable>;
  }
  return <View style={st.tile}>{body}</View>;
}

/** Row of 2–3 equal tiles. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={st.row}>{children}</View>;
}

const st = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: C.muted,
    borderRadius: R.md,
    padding: S.md,
    gap: 2,
    alignItems: "flex-start",
  },
  row: { flexDirection: "row", gap: S.sm },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { color: C.text2, fontSize: T.tiny, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { color: C.text, fontSize: T.title - 2, fontWeight: "800", marginTop: 2 },
  sub: { color: C.text3, fontSize: T.tiny, fontWeight: "500" },
});
