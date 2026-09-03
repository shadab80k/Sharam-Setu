/**
 * V3 Avatar — navy circle, initials fallback (same behavior as web).
 * Skeleton — muted shimmer block + list-row variant.
 */
import React, { useEffect, useRef } from "react";
import { Text, View, Animated, StyleSheet, Easing, StyleProp, ViewStyle, Image } from "react-native";
import { C, R, S } from "../../theme/tokens";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
}

export function Avatar({ src, name, size = 48 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.text,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: C.white, fontSize: size * 0.36, fontWeight: "700" }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

/** Shimmer skeleton block. */
export function Skeleton({ width, height, radius = R.md, style }: {
  width: number | string; height: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as never, height, borderRadius: radius, backgroundColor: C.muted, opacity },
        style,
      ]}
    />
  );
}

/** Full skeleton list row for feed loading states. */
export function SkeletonRow() {
  return (
    <View style={sk.row}>
      <Skeleton width={44} height={44} radius={12} />
      <View style={{ flex: 1, gap: S.sm }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} radius={R.sm} />
      </View>
      <Skeleton width={48} height={30} radius={R.pill} />
    </View>
  );
}

const sk = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    padding: S.lg,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    marginBottom: S.md,
  },
});
