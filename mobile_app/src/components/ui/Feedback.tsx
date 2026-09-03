import React, { useEffect } from "react";
import {
  View, Text, Animated, Easing, StyleSheet, Pressable, Modal, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, T, R, S } from "../../theme/tokens";
import { useStore } from "../../store";

/** Global toast host — renders at the top, auto-dismisses after 3.2s. */
export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;
  const latest = toasts[toasts.length - 1];
  const tone =
    latest.type === "success" ? C.green600 : latest.type === "error" ? C.red600 : C.navy800;

  return (
    <View style={styles.host} pointerEvents="none">
      <View style={[styles.toast, { borderLeftColor: tone }]}>
        <Text style={styles.toastText}>{latest.message}</Text>
      </View>
    </View>
  );
}

/** Bottom-sheet modal — mobile replacement for web's centered Modal. */
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
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: maxH as any }]} onPress={() => undefined}>
          <SafeAreaView edges={["bottom"]} style={{ flex: 0 }}>
            <View style={styles.handle} />
            {title ? <Text style={styles.title}>{title}</Text> : null}
            <ScrollView
              contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Section tabs (pill style) — used on Money/Applicants screens. */
export function Tabs({
  value, onChange, items,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
      {items.map((t) => {
        const active = t.value === value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Progress bar. */
export function ProgressBar({ value, tone = C.orange600, height = 8 }: { value: number; tone?: string; height?: number }) {
  return (
    <View style={[styles.barTrack, { height }]}>
      <View style={[styles.barFill, { width: `${Math.min(100, Math.max(0, value))}%` }, { backgroundColor: tone }]} />
    </View>
  );
}

/** Empty state with icon, message, optional CTA. */
export function EmptyState({ icon, message, ctaLabel, onCta }: {
  icon?: React.ReactNode;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyText}>{message}</Text>
      {ctaLabel && onCta ? (
        <Pressable onPress={onCta} style={styles.emptyCta}>
          <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: C.white,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.gray200,
    borderLeftWidth: 4,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    marginHorizontal: S.lg,
    maxWidth: "92%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: { color: C.navy900, fontSize: T.sm, fontWeight: "600" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(7,27,51,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.cream50,
    borderTopLeftRadius: R.lg + 8,
    borderTopRightRadius: R.lg + 8,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: R.pill,
    backgroundColor: C.gray300,
    marginTop: S.sm,
    marginBottom: S.xs,
  },
  title: {
    fontSize: T.lg,
    fontWeight: "800",
    color: C.navy900,
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
  },
  tab: {
    paddingHorizontal: S.lg,
    height: 40,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.gray300,
    backgroundColor: C.white,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: C.navy900,
    borderColor: C.navy900,
  },
  tabText: { color: C.navy900, fontSize: T.sm, fontWeight: "600" },
  tabTextActive: { color: C.white },
  barTrack: {
    flex: 1,
    backgroundColor: C.gray200,
    borderRadius: R.pill,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: R.pill },
  empty: {
    alignItems: "center",
    paddingVertical: S.xxxl,
    paddingHorizontal: S.xxl,
    gap: S.md,
  },
  emptyText: {
    color: C.gray600,
    fontSize: T.base,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyCta: {
    backgroundColor: C.orange600,
    borderRadius: R.md,
    paddingHorizontal: S.xl,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCtaText: { color: C.white, fontWeight: "700", fontSize: T.base },
});
