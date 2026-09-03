import React from "react";
import { Text, View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { C, T, R, S } from "../../theme/tokens";

type Tone =
  | "default" | "green" | "blue" | "purple" | "red" | "amber" | "navy" | "orange" | "gray";

const TONES: Record<Tone, { bg: string; text: string; border: string }> = {
  default: { bg: C.gray100, text: C.gray700, border: C.gray200 },
  green: { bg: C.green100, text: C.green600, border: C.green100 },
  blue: { bg: C.blue100, text: C.blue600, border: C.blue100 },
  purple: { bg: C.purple100, text: C.purple600, border: C.purple100 },
  red: { bg: C.red100, text: C.red600, border: C.red100 },
  amber: { bg: C.amber100, text: "#B45309", border: C.amber100 },
  navy: { bg: "#EBF1F8", text: C.navy800, border: "#DCE7F2" },
  orange: { bg: C.orange100, text: C.orange600, border: C.orange100 },
  gray: { bg: C.gray100, text: C.gray600, border: C.gray200 },
};

/** Status string (application/payment/job status) → badge tone. */
export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["paid", "active", "verified", "selected", "completed", "resolved", "available", "success"].includes(s)) return "green";
  if (["pending", "due", "applied", "viewed", "investigating", "working", "draft"].includes(s)) return "amber";
  if (["overdue", "rejected", "suspended", "unavailable", "dismissed"].includes(s)) return "red";
  if (["shortlisted", "interview"].includes(s)) return "blue";
  return "gray";
}

interface BadgeProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = "default", size = "sm", style }: BadgeProps) {
  const t = TONES[tone];
  const isSm = size === "sm";
  return (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: R.pill,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 8 : 12,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: t.text,
          fontSize: isSm ? T.xs : T.sm,
          fontWeight: "600",
          textTransform: "capitalize",
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/** Status badge with the right tone auto-derived. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status.replace("-", " ")} tone={statusTone(status)} />;
}
