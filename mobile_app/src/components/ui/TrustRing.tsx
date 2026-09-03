import React, { useEffect, useRef } from "react";
import { Text, View, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { C, trustColor, trustLabel } from "../../theme/tokens";

interface TrustRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

/** RN Animated can't attach to an SVG component directly — wrap via createAnimatedComponent. */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Animated trust ring — same visual language as the web app's TrustRing:
 * circular progress stroke colored by trust tier, score in the center.
 * Uses plain RN Animated (no react-native-reanimated dependency).
 */
export function TrustRing({ score, size = 96, showLabel = true }: TrustRingProps) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  // strokeDashoffset animates from full circumference (empty) to the score fraction.
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
  const label = trustLabel(score);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.gray200}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress */}
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
        <Text style={{ fontSize: size * 0.26, fontWeight: "800", color: C.navy900 }}>
          {score}
        </Text>
        {showLabel && (
          <Text style={{ fontSize: Math.max(9, size * 0.09), color: C.gray500, fontWeight: "600", marginTop: 1 }}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}
