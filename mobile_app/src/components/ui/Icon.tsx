/**
 * Ionicons wrapper — the ONLY way screens use icons.
 * `tone` renders the icon inside a soft tonal square (no borders).
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, S } from "../../theme/tokens";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color = C.text2 }: IconProps) {
  return <Ionicons name={name} size={size} color={color} />;
}

type Tone = "primary" | "green" | "amber" | "red" | "blue" | "purple" | "muted";

const TONE: Record<Tone, { fg: string; bg: string }> = {
  primary: { fg: C.primary, bg: C.primarySoft },
  green:   { fg: C.green,   bg: C.greenSoft },
  amber:   { fg: C.amber,   bg: C.amberSoft },
  red:     { fg: C.red,     bg: C.redSoft },
  blue:    { fg: C.blue,    bg: C.blueSoft },
  purple:  { fg: C.purple,  bg: C.purpleSoft },
  muted:   { fg: C.text2,   bg: C.muted },
};

/** Icon in a soft tonal square — list rows, empty states, headers. */
export function ToneIcon({
  name, tone = "muted", size = 20, box = 38,
}: {
  name: IconName; tone?: Tone; size?: number; box?: number;
}) {
  const t = TONE[tone];
  return (
    <View style={[st.box, { width: box, height: box, borderRadius: box * 0.28, backgroundColor: t.bg }]}>
      <Ionicons name={name} size={size} color={t.fg} />
    </View>
  );
}

export { TONE };
export type { Tone };

const st = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center" },
});
