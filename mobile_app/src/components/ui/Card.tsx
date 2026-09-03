/**
 * V3 Card — white surface, radius 18, single soft shadow, NO border.
 * Pressable variant for tappable cards.
 */
import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, Pressable } from "react-native";
import { C, T, R, S, shadow } from "../../theme/tokens";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [st.card, pressed && st.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[st.card, style]}>{children}</View>;
}

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  /** Right-aligned node — link, badge, switch… */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({ title, subtitle, right, style }: CardHeaderProps) {
  return (
    <View style={[st.header, style]}>
      <View style={{ flex: 1 }}>
        {title ? <Text style={st.title}>{title}</Text> : null}
        {subtitle ? <Text style={st.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    ...shadow,
  },
  pressed: { opacity: 0.9 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: S.md,
    marginBottom: S.md,
  },
  title: { color: C.text, fontSize: T.body + 1, fontWeight: "700" },
  subtitle: { color: C.text2, fontSize: T.caption, marginTop: 2 },
});
