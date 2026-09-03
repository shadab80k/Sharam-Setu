/**
 * Notifications — bell list with mark-read / mark-all-read.
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { timeAgo } from "@/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { SkeletonRow } from "@/components/ui/Avatar";
import { C, T, R, S } from "@/theme/tokens";
import type { NotificationType } from "@/types";

const TYPE_EMOJI: Record<NotificationType, string> = {
  job: "🧰", payment: "💰", trust: "🛡️", verification: "🪪",
  application: "📋", safety: "⚠️", ai: "✨", system: "🔔",
};

export default function WorkerNotifications() {
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.backText}>← Back</Text></Pressable>
        <Text style={styles.title}>Notifications</Text>
        {unread > 0 && (
          <Button label={`Mark all (${unread})`} variant="link" size="sm" onPress={() => markAllRead(user.id)} />
        )}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && sorted.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <EmptyState icon={<Text style={{ fontSize: 40 }}>🔔</Text>} message="No notifications yet.\nWe'll ping you about jobs and payments." />
        ) : (
          sorted.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.row, !n.read && styles.rowUnread]}
              onPress={() => markRead(n.id)}
            >
              <Text style={{ fontSize: 22 }}>{TYPE_EMOJI[n.type] ?? "🔔"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, !n.read && { color: C.navy900 }]}>{n.title}</Text>
                <Text style={styles.rowMsg} numberOfLines={3}>{n.message}</Text>
                <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  head: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm },
  backText: { color: C.gray600, fontSize: T.sm, fontWeight: "700" },
  title: { flex: 1, fontSize: T.xl, fontWeight: "900", color: C.navy900 },
  scroll: { padding: S.lg, paddingTop: S.sm, paddingBottom: S.xxxl, gap: S.md },
  row: {
    flexDirection: "row", gap: S.md,
    backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.gray200,
    padding: S.md, alignItems: "flex-start",
  },
  rowUnread: { borderColor: C.orange500, backgroundColor: C.orange100 },
  rowTitle: { fontSize: T.sm, fontWeight: "800", color: C.gray700 },
  rowMsg: { fontSize: T.xs, color: C.gray600, marginTop: 2, lineHeight: 17 },
  rowTime: { fontSize: T.xs, color: C.gray500, marginTop: 4 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.orange600, marginTop: 4 },
});
