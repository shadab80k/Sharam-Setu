/**
 * V3 EmptyState — tonal icon circle + message + optional CTA.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Icon, IconName } from "./Icon";
import { Button } from "./Button";
import { C, T, S } from "../../theme/tokens";

type Tone = "primary" | "green" | "amber" | "red" | "blue" | "purple" | "muted";

const BG: Record<Tone, string> = {
  primary: C.primarySoft, green: C.greenSoft, amber: C.amberSoft, red: C.redSoft,
  blue: C.blueSoft, purple: C.purpleSoft, muted: C.muted,
};
const FG: Record<Tone, string> = {
  primary: C.primary, green: C.green, amber: C.amber, red: C.red,
  blue: C.blue, purple: C.purple, muted: C.text3,
};

export function EmptyState({
  icon, message, ctaLabel, onCta, tone = "muted",
}: {
  icon?: IconName;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
  tone?: Tone;
}) {
  return (
    <View style={st.wrap}>
      <View style={[st.circle, { backgroundColor: BG[tone] }]}>
        <Icon name={icon ?? "folder-open-outline"} size={30} color={FG[tone]} />
      </View>
      <Text style={st.text}>{message}</Text>
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} onPress={onCta} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: S.xxxl, paddingHorizontal: S.xxl, gap: S.md },
  circle: {
    width: 72, height: 72,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: C.text2, fontSize: T.body, textAlign: "center", lineHeight: 23, fontWeight: "500" },
});
