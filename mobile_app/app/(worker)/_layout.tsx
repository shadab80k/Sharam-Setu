/**
 * Worker tab group — bottom tabs: Home · Jobs · Money · Assistant · Profile.
 * Notifications/reports/settings are pushed screens off profile.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { C, T } from "@/theme/tokens";

function TabIcon({ emoji, focus }: { emoji: string; focus: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focus ? 1 : 0.55 }}>{emoji}</Text>;
}

function TabLabel({ label, focus }: { label: string; focus: boolean }) {
  return (
    <Text style={{ fontSize: T.xs, fontWeight: focus ? "800" : "600", color: focus ? C.orange600 : C.gray500 }}>
      {label}
    </Text>
  );
}

export default function WorkerLayout() {
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.orange600,
        tabBarInactiveTintColor: C.gray500,
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.gray200, height: 64, paddingBottom: 6 },
        tabBarBadgeStyle: { backgroundColor: C.orange600, color: C.white },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focus={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ focused }) => <TabIcon emoji="🧰" focus={focused} /> }} />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: ({ focused }) => <TabIcon emoji="💰" focus={focused} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistant", tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focus={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focus={focused} /> }} />
    </Tabs>
  );
}
