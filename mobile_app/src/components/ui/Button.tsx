/**
 * V3 Button — orange fill (primary) / muted fill (secondary) / text / danger-soft.
 * No outlines anywhere. 40/48/54 touch heights.
 */
import React from "react";
import { Text, StyleSheet, Pressable, ActivityIndicator, ViewStyle } from "react-native";
import { Icon, IconName } from "./Icon";
import { C, T, R } from "../../theme/tokens";

export type BtnVariant = "primary" | "secondary" | "text" | "danger";
export type BtnSize = "sm" | "md" | "lg";

/** V2 variant names accepted while screens are being rewritten — mapped, never styled differently. */
const LEGACY_VARIANT: Record<string, BtnVariant> = {
  link: "text", ghost: "text", destructive: "danger",
  success: "primary", navy: "primary", orange: "primary", outline: "secondary",
};

interface BtnProps {
  label: string;
  onPress: () => void;
  /** "primary" | "secondary" | "text" | "danger" (old names auto-mapped) */
  variant?: string;
  size?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}

export function Button({
  label, onPress, variant: rawVariant = "primary", size: rawSize = "lg",
  disabled, loading, fullWidth, icon, style,
}: BtnProps) {
  const variant = (LEGACY_VARIANT[rawVariant] ?? rawVariant) as BtnVariant;
  const size = (rawSize === "xl" ? "lg" : rawSize) as BtnSize;
  const height = size === "sm" ? 40 : size === "md" ? 48 : 54;
  const font = size === "sm" ? T.caption : T.body;

  const fill =
    variant === "primary" ? C.primary :
    variant === "secondary" ? C.muted :
    variant === "danger" ? C.redSoft : "transparent";
  const fg =
    variant === "primary" ? C.onPrimary :
    variant === "danger" ? C.red :
    variant === "secondary" ? C.text : C.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        st.base,
        {
          height,
          backgroundColor: variant === "text" ? "transparent" : fill,
          paddingHorizontal: variant === "text" ? 4 : 20,
          opacity: disabled ? 0.4 : pressed && variant !== "text" ? 0.85 : 1,
        },
        fullWidth && st.full,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: font, fontWeight: "700" }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: R.md,
  },
  full: { alignSelf: "stretch" },
});
