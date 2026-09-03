/**
 * V3 Feedback — floating toast pills (white surface, colored dot).
 * Sheet/Tabs/ProgressBar/EmptyState moved to dedicated files; re-exported
 * here so existing screen imports keep resolving during the phase rewrite.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../../store";
import { C, T, R, S, shadow } from "../../theme/tokens";

export { Sheet } from "./Sheet";
export { Tabs } from "./Tabs";
export { ProgressBar } from "./ProgressBar";
export { EmptyState } from "./EmptyState";

/** Global toast host — top-center floating pill, auto-dismisses after 3.2s. */
export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;
  const latest = toasts[toasts.length - 1];
  const dot =
    latest.type === "success" ? C.green :
    latest.type === "error" ? C.red : C.primary;

  return (
    <View style={[st.host, { top: insets.top + 10 }]} pointerEvents="none">
      <View style={st.pill}>
        <View style={[st.dot, { backgroundColor: dot }]} />
        <Text style={st.text} numberOfLines={2}>{latest.message}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 9999 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.surface,
    borderRadius: R.pill,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm + 2,
    marginHorizontal: S.lg,
    maxWidth: "92%",
    ...shadow,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { color: C.text, fontSize: T.caption, fontWeight: "600", flexShrink: 1 },
});
