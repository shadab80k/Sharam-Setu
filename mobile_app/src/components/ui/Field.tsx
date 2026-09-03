/**
 * V3 Field — muted fill input, orange focus ring, NO border.
 * TextArea variant + Label helper. Also re-exports old `Input` name
 * until all screens are rewritten.
 */
import React, { useState } from "react";
import { Text, TextInput, View, StyleSheet, TextInputProps, StyleProp, ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { C, T, R, S } from "../../theme/tokens";

interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Ionicons name shown at the left (e.g. search, call) */
  icon?: React.ComponentProps<typeof Icon>["name"];
  style?: StyleProp<ViewStyle>;
}

export function Field({ label, error, hint, icon, style, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.wrap}>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <View style={[st.box, focused && st.boxFocused, error && st.boxError]}>
        {icon ? <Icon name={icon} size={18} color={focused ? C.primary : C.text3} /> : null}
        <TextInput
          placeholderTextColor={C.text3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[st.input, icon ? { marginLeft: S.sm } : null, style]}
          {...rest}
        />
      </View>
      {error ? <Text style={st.error}>{error}</Text> : null}
      {hint && !error ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

interface TextAreaProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextArea({ label, error, hint, style, ...rest }: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={st.wrap}>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.text3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        multiline
        style={[st.area, focused && st.areaFocused, style]}
        {...rest}
      />
      {error ? <Text style={st.error}>{error}</Text> : null}
      {hint && !error ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: S.lg, gap: S.xs + 2 },
  label: { color: C.text, fontSize: T.caption, fontWeight: "700" },
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.muted,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    height: 50,
  },
  boxFocused: { backgroundColor: C.primarySoft },
  boxError: { backgroundColor: C.redSoft },
  input: { flex: 1, fontSize: T.body, color: C.text, paddingVertical: 0 },
  area: {
    backgroundColor: C.muted,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    paddingTop: S.md,
    minHeight: 110,
    fontSize: T.body,
    color: C.text,
    textAlignVertical: "top",
  },
  areaFocused: { backgroundColor: C.primarySoft },
  error: { color: C.red, fontSize: T.caption, marginTop: S.xs },
  hint: { color: C.text3, fontSize: T.caption, marginTop: S.xs },
});
