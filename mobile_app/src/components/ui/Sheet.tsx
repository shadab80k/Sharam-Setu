/**
 * V3 Sheet — bottom sheet: dark overlay, white surface, top handle,
 * optional title row with close button, safe-area padded.
 */
import React from "react";
import {
  Modal, Pressable, View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { C, T, R, S } from "../../theme/tokens";

export function Sheet({
  open, onClose, title, children, maxH = "85%",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxH?: string | number;
}) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={st.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ justifyContent: "flex-end" }}>
          <Pressable style={[st.sheet, { maxHeight: maxH as never }]} onPress={() => undefined}>
            <View style={st.handle} />
            {title ? (
              <View style={st.titleRow}>
                <Text style={st.title}>{title}</Text>
                <Pressable onPress={onClose} hitSlop={10} style={st.closeBtn}>
                  <Icon name="close" size={18} color={C.text2} />
                </Pressable>
              </View>
            ) : null}
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: S.lg, paddingBottom: S.xxl }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            <SafeAreaView edges={["bottom"]} style={{ flex: 0 }} />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: C.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.lg + 6,
    borderTopRightRadius: R.lg + 6,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: R.pill,
    backgroundColor: C.hairline,
    marginTop: S.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.xs,
  },
  title: { color: C.text, fontSize: T.title - 3, fontWeight: "700" },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: R.pill,
    backgroundColor: C.muted,
    alignItems: "center",
    justifyContent: "center",
  },
});
