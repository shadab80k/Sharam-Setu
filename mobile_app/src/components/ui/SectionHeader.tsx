/**
 * V3 SectionHeader — "Recommended jobs" + optional "See all" link.
 * Screen-level section titles (inside cards use CardHeader).
 */
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Icon } from "./Icon";
import { C, T, S } from "../../theme/tokens";

export function SectionHeader({
  title, action, onAction, style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: object;
}) {
  return (
    <View style={[st.wrap, style]}>
      <Text style={st.title}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={st.action} hitSlop={8}>
          <Text style={st.actionText}>{action}</Text>
          <Icon name="chevron-forward" size={14} color={C.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.sm,
    marginTop: S.xs,
  },
  title: { color: C.text, fontSize: T.body + 1, fontWeight: "700" },
  action: { flexDirection: "row", alignItems: "center", gap: 1 },
  actionText: { color: C.primary, fontSize: T.caption, fontWeight: "700" },
});
