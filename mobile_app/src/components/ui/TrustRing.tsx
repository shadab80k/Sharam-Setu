/**
 * V3 TrustRing — thin stroke (5), tier color, score + label centered.
 * Same visual language as web TrustRing, lighter weight.
 */
import React, { useEffect, useRef } from "react";
import { Text, View, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, trustColor, trustLabel } from "../../theme/tokens";

/** RN Animated can't attach to an SVG component directly — wrap via createAnimatedComponent. */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function TrustRing({ score, size = 96, showLabel = true }: {
  score: number; size?: number; showLabel?: boolean;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const offset = useRef(new Animated.Value(circumference)).current;

  useEffect(() => {
    offset.setValue(circumference);
    Animated.timing(offset, {
      toValue: circumference * (1 - score / 100),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG attributes are not native-driver props
    }).start();
  }, [score, circumference, offset]);

  const color = trustColor(score);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.muted} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: size * 0.27, fontWeight: "800", color: C.text }}>{score}</Text>
        {showLabel && (
          <Text style={{ fontSize: Math.max(8.5, size * 0.088), color: C.text2, fontWeight: "600", marginTop: 1 }}>
            {trustLabel(score)}
          </Text>
        )}
      </View>
    </View>
  );
}
