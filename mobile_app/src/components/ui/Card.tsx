import React from "react";
import { Text, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { C, T, R, S } from "../../theme/tokens";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function Card({ children, style, onPress }: CardProps) {
  return (
    <View style={[styles.card, style]} onTouchEnd={onPress}>
      {children}
    </View>
  );
}

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({ title, subtitle, right, style }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={{ flex: 1 }}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.gray200,
    padding: S.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: S.md,
    marginBottom: S.md,
  },
  title: {
    color: C.navy900,
    fontSize: T.md,
    fontWeight: "700",
  },
  subtitle: {
    color: C.gray600,
    fontSize: T.xs,
    marginTop: 2,
  },
});
