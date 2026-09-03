import React from "react";
import {
  Text, TextInput, View, StyleSheet, TextInputProps,
} from "react-native";
import { C, T, R, S } from "../../theme/tokens";

interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, style, ...rest }: FieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.gray500}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

interface SelectProps {
  label?: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

/** iOS-style dropdown — renders as a row of chips when options ≤ 6, else a modal-less picker via chips. */
export function Select({ label, value, onValueChange, options, placeholder }: SelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Chip key={o.value} active={active} label={o.label} onPress={() => onValueChange(o.value)} />
          );
        })}
      </View>
      {!selectedLabel && placeholder ? <Text style={styles.hint}>{placeholder}</Text> : null}
    </View>
  );
}

interface ChipPropsT {
  label: string;
  active?: boolean;
  onPress?: () => void;
  small?: boolean;
}

export function Chip({ label, active, onPress, small }: ChipPropsT) {
  return (
    <View
      style={[
        styles.chip,
        small && styles.chipSmall,
        active
          ? { backgroundColor: C.orange600, borderColor: C.orange600 }
          : { backgroundColor: C.cream50, borderColor: C.gray300 },
      ]}
      onTouchEnd={onPress}
    >
      <Text
        style={[
          styles.chipText,
          small && styles.chipTextSmall,
          { color: active ? C.white : C.navy900 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: S.lg },
  label: {
    color: C.navy900,
    fontSize: T.sm,
    fontWeight: "700",
    marginBottom: S.sm,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray300,
    borderRadius: R.md,
    height: 50,
    paddingHorizontal: S.lg,
    fontSize: T.base,
    color: C.navy900,
  },
  inputError: { borderColor: C.red600 },
  error: { color: C.red600, fontSize: T.xs, marginTop: 4 },
  hint: { color: C.gray500, fontSize: T.xs, marginTop: 4 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm + 2,
    minHeight: 44,
    justifyContent: "center",
  },
  chipSmall: {
    paddingHorizontal: S.md,
    paddingVertical: 4,
    minHeight: 34,
  },
  chipText: {
    fontSize: T.sm,
    fontWeight: "600",
  },
  chipTextSmall: { fontSize: T.xs },
});
