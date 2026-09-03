/**
 * V3 Picker — muted value row (label + current value + chevron) that opens a
 * Sheet radio-list. Chip-wall Selects are replaced by this single pattern.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Sheet } from "./Sheet";
import { Icon } from "./Icon";
import { C, T, R, S } from "../../theme/tokens";

export interface PickerOption {
  value: string;
  label: string;
  sub?: string;
}

interface PickerProps {
  label?: string;
  value: string;
  options: PickerOption[];
  onChange: (v: string) => void;
  placeholder?: string;
}

export function Picker({ label, value, options, onChange, placeholder }: PickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={st.wrap}>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <Pressable style={({ pressed }) => [st.row, pressed && st.pressed]} onPress={() => setOpen(true)}>
        <View style={{ flex: 1 }}>
          <Text style={selected ? st.value : st.placeholder}>
            {selected ? selected.label : placeholder || "Select"}
          </Text>
        </View>
        <Icon name="chevron-down" size={18} color={C.text3} />
      </Pressable>

      <Sheet open={open} onClose={() => setOpen(false)} title={label || "Select"}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            style={({ pressed }) => [st.opt, o.value === value && st.optActive, pressed && { opacity: 0.7 }]}
            onPress={() => { onChange(o.value); setOpen(false); }}
          >
            <View style={{ flex: 1 }}>
              <Text style={st.optText}>{o.label}</Text>
              {o.sub ? <Text style={st.optSub}>{o.sub}</Text> : null}
            </View>
            {o.value === value ? <Icon name="checkmark" size={20} color={C.primary} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: S.lg, gap: S.xs + 2 },
  label: { color: C.text, fontSize: T.caption, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.muted,
    borderRadius: R.md,
    paddingHorizontal: S.md,
    height: 50,
  },
  pressed: { opacity: 0.7 },
  value: { color: C.text, fontSize: T.body, fontWeight: "600" },
  placeholder: { color: C.text3, fontSize: T.body, fontWeight: "500" },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: S.sm + 2,
    paddingHorizontal: S.sm,
    borderRadius: R.md,
  },
  optActive: { backgroundColor: C.primarySoft },
  optText: { color: C.text, fontSize: T.body, fontWeight: "600" },
  optSub: { color: C.text2, fontSize: T.caption, marginTop: 1 },
});
