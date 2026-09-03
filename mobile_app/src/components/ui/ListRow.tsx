/**
 * V3 ListRow — the workhorse row: leading icon/avatar, title + sub,
 * trailing node, optional chevron, optional hairline divider.
 * Used for jobs, workers, notifications, settings, ledger entries…
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Icon, IconName } from "./Icon";
import { Avatar } from "./Avatar";
import { C, T, R, S } from "../../theme/tokens";

interface ListRowProps {
  /** Ionicons name for the tonal leading square */
  icon?: IconName;
  iconTone?: "primary" | "green" | "amber" | "red" | "blue" | "purple" | "muted";
  /** Or an avatar instead of an icon square */
  avatar?: { src?: string | null; name: string };
  title: string;
  sub?: string;
  sub2?: string;
  /** Right side node — amount, badge, switch… */
  trailing?: React.ReactNode;
  /** Trailing caption under the trailing node (e.g. timestamp) */
  trailingSub?: string;
  chevron?: boolean;
  onPress?: () => void;
  /** Bottom hairline divider (for stacked rows inside a card) */
  divider?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  icon, iconTone = "muted", avatar, title, sub, sub2,
  trailing, trailingSub, chevron, onPress, divider, style,
}: ListRowProps) {
  const body = (
    <>
      {/* Leading */}
      {avatar ? (
        <Avatar src={avatar.src} name={avatar.name} size={44} />
      ) : icon ? (
        <ToneBox icon={icon} tone={iconTone} />
      ) : null}

      {/* Middle */}
      <View style={st.mid}>
        <Text style={st.title} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={st.sub} numberOfLines={1}>{sub}</Text> : null}
        {sub2 ? <Text style={st.sub2} numberOfLines={1}>{sub2}</Text> : null}
      </View>

      {/* Trailing */}
      {(trailing || trailingSub || chevron) && (
        <View style={st.end}>
          {trailing}
          {trailingSub ? <Text style={st.trailingSub}>{trailingSub}</Text> : null}
          {chevron ? <Icon name="chevron-forward" size={18} color={C.text3} /> : null}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [st.row, pressed && st.pressed, divider && st.divider, style]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={[st.row, divider && st.divider, style]}>{body}</View>;
}

function ToneBox({ icon, tone }: { icon: IconName; tone: NonNullable<ListRowProps["iconTone"]> }) {
  const bg =
    tone === "primary" ? C.primarySoft : tone === "green" ? C.greenSoft :
    tone === "amber" ? C.amberSoft : tone === "red" ? C.redSoft :
    tone === "blue" ? C.blueSoft : tone === "purple" ? C.purpleSoft : C.muted;
  const fg =
    tone === "primary" ? C.primary : tone === "green" ? C.green :
    tone === "amber" ? C.amber : tone === "red" ? C.red :
    tone === "blue" ? C.blue : tone === "purple" ? C.purple : C.text2;
  return (
    <View style={st.iconBox}>
      <Icon name={icon} size={20} color={fg} />
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    minHeight: 64,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.xs,
  },
  pressed: { opacity: 0.6 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  iconBox: {
    width: 44, height: 44,
    borderRadius: R.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: { flex: 1, gap: 1 },
  title: { color: C.text, fontSize: T.body, fontWeight: "600" },
  sub: { color: C.text2, fontSize: T.caption, fontWeight: "400" },
  sub2: { color: C.text3, fontSize: T.tiny, fontWeight: "400" },
  end: { alignItems: "flex-end", gap: 2, maxWidth: "45%" },
  trailingSub: { color: C.text3, fontSize: T.tiny },
});
