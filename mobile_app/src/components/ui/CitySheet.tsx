/**
 * CitySheet — Swiggy-style location change: bottom sheet with search +
 * city list (wage base shown as sub). Selecting saves via the store's
 * profile update (worker: updateWorkerProfile / contractor: updateContractorProfile).
 */
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "./Sheet";
import { C, T, R, S } from "../../theme/tokens";
import { CITIES, getCity } from "../../utils/cities";

export function CitySheet({
  open, onClose, currentCityId, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  currentCityId: string;
  onSelect: (cityId: string) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q));
  }, [query]);

  function handlePick(cityId: string) {
    onSelect(cityId);
    setQuery("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Change location">
      {/* Search */}
      <View style={st.search}>
        <Ionicons name="search" size={16} color={C.text3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search city…"
          placeholderTextColor={C.text3}
          style={st.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close" size={15} color={C.text3} />
          </Pressable>
        ) : null}
      </View>

      {/* Detect row (visual anchor like Swiggy) */}
      <Pressable style={st.detect} onPress={() => handlePick(getCity(currentCityId).id)}>
        <View style={st.detectIcon}>
          <Ionicons name="locate" size={16} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.detectTitle}>Use current city</Text>
          <Text style={st.detectSub}>{getCity(currentCityId).name} — GPS auto-detect coming soon</Text>
        </View>
      </Pressable>

      {/* City list */}
      <Text style={st.listLabel}>POPULAR CITIES</Text>
      <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
        {list.map((c) => {
          const active = c.id === currentCityId;
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [st.row, active && st.rowActive, pressed && { opacity: 0.7 }]}
              onPress={() => handlePick(c.id)}
            >
              <View style={[st.rowIcon, active && { backgroundColor: C.primarySoft }]}>
                <Ionicons name="location" size={15} color={active ? C.primary : C.text3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.rowName, active && { color: C.primary, fontWeight: "800" }]}>{c.name}</Text>
                <Text style={st.rowSub}>{c.state} · avg ₹{c.wageBase}/day base</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={20} color={C.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={15} color={C.text3} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const st = StyleSheet.create({
  search: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.muted, borderRadius: R.pill,
    paddingHorizontal: S.lg, height: 44, marginBottom: S.md,
  },
  searchInput: { flex: 1, fontSize: T.body, color: C.text, paddingVertical: 0 },
  detect: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.primarySoft, borderRadius: R.md,
    padding: S.md, marginBottom: S.md,
  },
  detectIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.surface,
    alignItems: "center", justifyContent: "center",
  },
  detectTitle: { fontSize: T.body, fontWeight: "800", color: C.text },
  detectSub: { fontSize: T.tiny, color: C.text2, marginTop: 1 },
  listLabel: {
    fontSize: 10, fontWeight: "800", color: C.text3,
    letterSpacing: 0.8, marginBottom: S.xs,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingVertical: S.sm + 2, paddingHorizontal: S.xs,
    borderRadius: R.md,
  },
  rowActive: { backgroundColor: C.primarySoft },
  rowIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.muted,
    alignItems: "center", justifyContent: "center",
  },
  rowName: { fontSize: T.body, fontWeight: "700", color: C.text },
  rowSub: { fontSize: T.tiny, color: C.text3, marginTop: 1 },
});
