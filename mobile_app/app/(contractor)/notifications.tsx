/**
 * Contractor Notifications (V3) — type-icon ListRows, unread tint, mark read.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { timeAgo } from "@/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRow } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";
import { Icon } from "@/components/ui/Icon";
import { C, T, R, S } from "@/theme/tokens";
import type { NotificationType } from "@/types";

const TYPE_META: Record<NotificationType, { icon: string; tone: "primary" | "green" | "amber" | "red" | "blue" | "purple" | "muted" }> = {
  job: { icon: "briefcase-outline", tone: "primary" },
  payment: { icon: "wallet-outline", tone: "green" },
  trust: { icon: "shield-checkmark-outline", tone: "blue" },
  verification: { icon: "ribbon-outline", tone: "purple" },
  application: { icon: "documents-outline", tone: "blue" },
  safety: { icon: "warning-outline", tone: "red" },
  ai: { icon: "sparkles", tone: "purple" },
  system: { icon: "notifications-outline", tone: "muted" },
};

export default function ContractorNotifications() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const notifications = useStore((s) =>
    s.notifications.filter((n) => n.userId === s.currentUser?.id).slice()
  );
  const loading = useStore((s) => s.loading);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);

  if (!user) return null;

  const sorted = notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const unread = sorted.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <View style={st.head}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </Pressable>
        <Text style={st.title}>Notifications</Text>
        {unread > 0 && (
          <Button label={`Mark all (${unread})`} variant="text" size="sm" onPress={() => markAllRead(user.id)} />
        )}
      </View>
      <ScrollView contentContainerStyle={st.scroll}>
        {loading && sorted.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState icon="notifications-off-outline" message="No notifications yet.\nWe'll ping you about applicants and payments." />
        ) : (
          <View style={st.listCard}>
            {sorted.map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.system;
              return (
                <ListRow
                  key={n.id}
                  icon={meta.icon as never}
                  iconTone={meta.tone}
                  title={n.title}
                  sub={n.message}
                  sub2={timeAgo(n.createdAt)}
                  divider={i < sorted.length - 1}
                  style={n.read ? undefined : { backgroundColor: C.primarySoft }}
                  onPress={() => markRead(n.id)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  backBtn: { width: 38, height: 38, borderRadius: R.pill, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: T.title + 2, fontWeight: "800", color: C.text },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl },
  listCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
  },
});
