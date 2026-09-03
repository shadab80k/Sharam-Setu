/**
 * V3 ProgressBar — 6px rounded, hairline-track, tonal fill.
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { C, R } from "../../theme/tokens";

export function ProgressBar({
  value, tone = C.primary, height = 6, track = C.muted,
}: {
  value: number;
  tone?: string;
  height?: number;
  track?: string;
}) {
  const pct = `${Math.min(100, Math.max(0, value))}%` as `${number}%`;
  return (
    <View style={[st.track, { height, backgroundColor: track }]}>
      <View style={[st.fill, { width: pct, backgroundColor: tone }]} />
    </View>
  );
}

const st = StyleSheet.create({
  track: { flex: 1, borderRadius: R.pill, overflow: "hidden" },
  fill: { height: "100%", borderRadius: R.pill },
});
