/**
 * Swiggy-style primitives — the visual language of food-delivery apps:
 * green rating pills, dashed dividers, offer strips, category circles,
 * filled chunky bottom-nav icons.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Icon, IconName } from "./Icon";
import { Ionicons } from "@expo/vector-icons";
import { C, T, R, S } from "../../theme/tokens";

/* ---------------- Rating pill (green, Swiggy restaurant card) ---------------- */

export function RatingPill({
  value, count, size = "md",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md" | "lg";
}) {
  if (!value || value <= 0) return null;
  const h = size === "lg" ? 30 : size === "md" ? 26 : 20;
  const fs = size === "lg" ? T.body : size === "md" ? T.caption : T.tiny;
  return (
    <View style={[rp.pill, { height: h, paddingHorizontal: size === "lg" ? 10 : 7 }]}>
      <Text style={[rp.text, { fontSize: fs }]}>
        {value.toFixed(1)} <Ionicons name="star" size={fs - 1} color={C.white} />
      </Text>
      {count !== undefined && count > 0 ? (
        <Text style={[rp.count, { fontSize: fs - 2 }]}>{count > 99 ? "99+" : count}</Text>
      ) : null}
    </View>
  );
}

const rp = StyleSheet.create({
  pill: {
    backgroundColor: C.green,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  text: { color: C.white, fontWeight: "800", overflow: "hidden" },
  count: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
});

/** Inline meta: "4.5 ★ (12)" colored by tier — rows, contractor cards. */
export function RatingMeta({ value, count }: { value: number; count?: number }) {
  if (!value || value <= 0) return null;
  const color = value >= 4 ? C.green : value >= 3 ? C.primary : C.red;
  return (
    <Text style={{ color, fontSize: T.caption, fontWeight: "700" }}>
      {value.toFixed(1)} ★{count ? ` (${count})` : ""}
    </Text>
  );
}

/* ---------------- Dashed divider (Blinkit/Swiggy card seam) ---------------- */

export function DashedDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  // RN has no dashed line natively — row of alternating blocks
  return (
    <View style={[dd.row, style]}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View key={i} style={i % 2 === 0 ? dd.dash : dd.gap} />
      ))}
    </View>
  );
}

const dd = StyleSheet.create({
  row: { flexDirection: "row", height: 1, width: "100%", overflow: "hidden" },
  dash: { flex: 1, height: 1, backgroundColor: C.hairline },
  gap: { flex: 1, height: 1 },
});

/* ---------------- Offer strip (dashed-border promo row) ---------------- */

export function OfferStrip({
  icon, text, onPress, tone = "primary",
}: {
  icon?: IconName;
  text: string;
  onPress?: () => void;
  tone?: "primary" | "green" | "purple" | "amber";
}) {
  const fg = tone === "green" ? C.green : tone === "purple" ? C.purple : tone === "amber" ? C.amber : C.primary;
  const body = (
    <View style={os.strip}>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text style={[os.text, { color: fg }]} numberOfLines={2}>{text}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={14} color={fg} /> : null}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress} style={os.press}>{body}</Pressable>;
  }
  return body;
}

const os = StyleSheet.create({
  press: { marginBottom: S.md },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.hairline,
    borderRadius: R.md,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.md,
    backgroundColor: C.surface,
  },
  text: { flex: 1, fontSize: T.caption, fontWeight: "700", lineHeight: 18 },
});

/* ---------------- Category circle (Blinkit horizontal shelf) ---------------- */

const CATEGORY_TONES = ["primary", "blue", "purple", "green", "amber", "red"] as const;
export type CatTone = (typeof CATEGORY_TONES)[number];

const TONE_BG: Record<CatTone, string> = {
  primary: C.primarySoft, blue: C.blueSoft, purple: C.purpleSoft,
  green: C.greenSoft, amber: C.amberSoft, red: C.redSoft,
};
const TONE_FG: Record<CatTone, string> = {
  primary: C.primary, blue: C.blue, purple: C.purple,
  green: C.green, amber: C.amber, red: C.red,
};

export function CategoryCircle({
  label, icon, tone = "primary", active, size = 64, onPress,
}: {
  label: string;
  icon: IconName;
  tone?: CatTone;
  active?: boolean;
  size?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={cc.wrap} disabled={!onPress}>
      <View
        style={[
          cc.circle,
          {
            width: size, height: size,
            borderRadius: size / 2,
            backgroundColor: active ? TONE_FG[tone] : TONE_BG[tone],
            borderWidth: active ? 0 : 1.5,
            borderColor: TONE_FG[tone] + "40",
          },
        ]}
      >
        <Icon name={icon} size={size * 0.38} color={active ? C.white : TONE_FG[tone]} />
      </View>
      <Text style={[cc.label, active && cc.labelActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const cc = StyleSheet.create({
  wrap: { alignItems: "center", width: 76, gap: S.xs + 2 },
  circle: { alignItems: "center", justifyContent: "center" },
  label: { fontSize: T.tiny, color: C.text2, fontWeight: "600", textAlign: "center" },
  labelActive: { color: C.text, fontWeight: "700" },
});

/* ---------------- Bottom-nav icon (filled, chunky, Swiggy-style) ---------------- */

export function NavIcon({
  name, focused, badge,
}: {
  name: IconName;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={ni.wrap}>
      <Ionicons
        name={name}
        size={25}
        color={focused ? C.primary : C.text3}
        style={focused ? { transform: [{ scale: 1.05 }] } : undefined}
      />
      {badge && badge > 0 ? (
        <View style={ni.badge}>
          <Text style={ni.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const ni = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", width: 44, height: 28 },
  badge: {
    position: "absolute",
    top: -4, right: 4,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: C.white, fontSize: 9.5, fontWeight: "800" },
});
