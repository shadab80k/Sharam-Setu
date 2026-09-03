/**
 * V3 Tabs — segmented control: muted container, white active pill.
 * Single-row variants scroll horizontally when items overflow.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { C, T, R, S } from "../../theme/tokens";

export function Tabs({
  value, onChange, items, scrollable,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; count?: number }[];
  /** Force horizontal scrolling (long label sets) */
  scrollable?: boolean;
}) {
  const row = items.map((t) => {
    const active = t.value === value;
    return (
      <Pressable
        key={t.value}
        onPress={() => onChange(t.value)}
        style={({ pressed }) => [st.tab, active && st.tabActive, pressed && { opacity: 0.8 }]}
      >
        <Text style={[st.tabText, active && st.tabTextActive]} numberOfLines={1}>
          {t.label}
        </Text>
        {t.count !== undefined ? (
          <View style={[st.count, active && st.countActive]}>
            <Text style={[st.countText, active && st.countTextActive]}>{t.count}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={st.track}>
        {row}
      </ScrollView>
    );
  }
  return <View style={st.track}>{row}</View>;
}

const st = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: C.muted,
    borderRadius: R.md,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: R.md - 3,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: S.sm,
  },
  tabActive: { backgroundColor: C.surface },
  tabText: { color: C.text2, fontSize: T.caption, fontWeight: "600" },
  tabTextActive: { color: C.text, fontWeight: "700" },
  count: {
    minWidth: 20,
    borderRadius: R.pill,
    backgroundColor: C.surface,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: "center",
  },
  countActive: { backgroundColor: C.primarySoft },
  countText: { color: C.text2, fontSize: T.tiny, fontWeight: "700" },
  countTextActive: { color: C.primary },
});
