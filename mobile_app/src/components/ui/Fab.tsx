/**
 * V3 Fab — floating action button (orange circle, icon) for "Post Job" etc.
 */
import React from "react";
import { StyleSheet, Pressable, View, Text, StyleProp, ViewStyle } from "react-native";
import { Icon, IconName } from "./Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, T, R, S, shadow } from "../../theme/tokens";

export function Fab({
  icon, label, onPress, bottom = 0,
}: {
  icon: IconName;
  label?: string;
  onPress: () => void;
  /** Extra bottom offset above the tab bar */
  bottom?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { bottom: insets.bottom + 18 + bottom }]}>
      <Pressable onPress={onPress} style={({ pressed }) => [st.btn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
        <Icon name={icon} size={label ? 20 : 24} color={C.onPrimary} />
        {label ? <Text style={st.label}>{label}</Text> : null}
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: "absolute", right: S.lg, alignItems: "flex-end" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: S.lg + 2,
    height: 52,
    ...shadow,
  },
  label: { color: C.onPrimary, fontSize: T.body, fontWeight: "700" },
});
