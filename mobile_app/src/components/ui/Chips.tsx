/**
 * V3 Chips — minimal toggle pills. Selected = primarySoft fill + orange text.
 * ChipRow wraps with even spacing; used for filters and multi-selects.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { C, T, R, S } from "../../theme/tokens";

export function Chip({
  label, active, onPress, small,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        st.chip,
        small && st.chipSmall,
        active && st.chipActive,
        pressed && st.chipPressed,
      ]}
    >
      <Text style={[st.text, small && st.textSmall, active && st.textActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontal scrolling filter row (Jobs category filters). */
export function ChipRow({
  items, value, onChange, scrollable = true,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  scrollable?: boolean;
}) {
  const chips = items.map((it) => (
    <Chip key={it.value} label={it.label} active={it.value === value} onPress={() => onChange(it.value)} />
  ));
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: S.sm, paddingVertical: S.xs }}
        style={{ flexGrow: 0 }}
      >
        {chips}
      </ScrollView>
    );
  }
  return <View style={st.wrap}>{chips}</View>;
}

const st = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: {
    backgroundColor: C.muted,
    borderRadius: R.pill,
    paddingHorizontal: S.md + 2,
    height: 40,
    justifyContent: "center",
  },
  chipSmall: {
    paddingHorizontal: S.md,
    height: 32,
  },
  chipActive: { backgroundColor: C.primarySoft },
  chipPressed: { opacity: 0.7 },
  text: { color: C.text2, fontSize: T.caption, fontWeight: "600" },
  textSmall: { fontSize: T.tiny },
  textActive: { color: C.primary, fontWeight: "700" },
});
