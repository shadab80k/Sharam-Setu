import React from "react";
import {
  Text, TouchableOpacity, ActivityIndicator, ViewStyle, StyleProp,
} from "react-native";
import { C, T, R, S } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "destructive" | "success" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const VARIANT: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: C.orange600, text: C.white },
  secondary: { bg: C.white, text: C.navy900, border: C.gray300 },
  destructive: { bg: C.red600, text: C.white },
  success: { bg: C.green600, text: C.white },
  ghost: { bg: "transparent", text: C.navy900 },
  link: { bg: "transparent", text: C.orange600 },
};

const SIZE: Record<Size, { h: number; px: number; font: number }> = {
  sm: { h: 40, px: S.lg, font: T.sm },
  md: { h: 50, px: S.xl, font: T.base },
  lg: { h: 56, px: S.xxl, font: T.md },
};

export function Button({
  label, onPress, variant = "primary", size = "md",
  loading, disabled, fullWidth, icon, style,
}: ButtonProps) {
  const v = VARIANT[variant];
  const sz = SIZE[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          height: sz.h,
          paddingHorizontal: sz.px,
          borderRadius: R.md,
          backgroundColor: v.bg,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: S.sm,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && { alignSelf: "stretch" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={{
              color: v.text,
              fontSize: sz.font,
              fontWeight: variant === "primary" || variant === "destructive" || variant === "success" ? "700" : "600",
            }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
