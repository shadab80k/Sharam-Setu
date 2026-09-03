/**
 * App-internal restore screen — covers the gap after the native splash hides
 * while session restore / bootstrap is still running. Centered logo mark +
 * thin activity indicator; blank screen never shows.
 */
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { C, T, S } from "@/theme/tokens";

export default function Splash() {
  return (
    <View style={st.wrap}>
      <View style={st.mark}>
        <Text style={st.markText}>S</Text>
      </View>
      <Text style={st.name}>ShramSetu</Text>
      <View style={st.loaderRow}>
        <ActivityIndicator size="small" color={C.primary} />
        <Text style={st.caption}>Restoring your session…</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", gap: S.sm },
  mark: {
    width: 84, height: 84,
    borderRadius: 26,
    backgroundColor: C.text,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: C.primary, fontSize: 40, fontWeight: "900" },
  name: { fontSize: T.title, fontWeight: "800", color: C.text },
  loaderRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.md },
  caption: { color: C.text2, fontSize: T.caption, fontWeight: "500" },
});
