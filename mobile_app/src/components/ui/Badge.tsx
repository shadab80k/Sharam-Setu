/**
 * V3 Badge — soft tonal fill, no border. Dot variant for live states.
 * StatusBadge auto-derives tone (same status map as web).
 */
import React from "react";
import { Text, View, StyleProp, ViewStyle } from "react-native";
import { C, T, R, S } from "../../theme/tokens";

type Tone =
  | "default" | "green" | "blue" | "purple" | "red" | "amber"
  | "orange" | "gray" | "navy";

const TONES: Record<Tone, { bg: string; text: string }> = {
  default: { bg: C.muted, text: C.text2 },
  green: { bg: C.greenSoft, text: C.green },
  blue: { bg: C.blueSoft, text: C.blue },
  purple: { bg: C.purpleSoft, text: C.purple },
  red: { bg: C.redSoft, text: C.red },
  amber: { bg: C.amberSoft, text: C.amber },
  orange: { bg: C.primarySoft, text: C.primary },
  gray: { bg: C.muted, text: C.text2 },
  navy: { bg: C.muted, text: C.text },
};

/** Status string (application/payment/job status) → badge tone. */
export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["paid", "active", "verified", "selected", "completed", "resolved", "available", "success", "hired"].includes(s)) return "green";
  if (["pending", "due", "applied", "viewed", "investigating", "working", "draft"].includes(s)) return "amber";
  if (["overdue", "rejected", "suspended", "unavailable", "dismissed", "cancelled"].includes(s)) return "red";
  if (["shortlisted", "interview"].includes(s)) return "blue";
  return "gray";
}

interface BadgeProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = "default", size = "sm", dot, style }: BadgeProps) {
  const t = TONES[tone];
  const isSm = size === "sm";
  return (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderRadius: R.pill,
          paddingVertical: isSm ? 3 : 5,
          paddingHorizontal: isSm ? 10 : 14,
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        },
        style,
      ]}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.text }} /> : null}
      <Text
        style={{ color: t.text, fontSize: isSm ? T.tiny : T.caption, fontWeight: "600", textTransform: "capitalize" }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/** Status badge with the right tone auto-derived. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status.replace(/-/g, " ")} tone={statusTone(status)} />;
}

/** Small colored dot + text — inline meta ("● Available"). */
export function DotText({ text, tone = "green" }: { text: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: S.xs }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.text }} />
      <Text style={{ color: t.text, fontSize: T.caption, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}
