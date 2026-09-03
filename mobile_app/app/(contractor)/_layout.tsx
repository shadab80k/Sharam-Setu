/**
 * Contractor tab group — bottom tabs: Home · Jobs · Workers · Applicants · Profile.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useStore } from "@/store";
import { C, T } from "@/theme/tokens";

function TabIcon({ emoji, focus }: { emoji: string; focus: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focus ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function ContractorLayout() {
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.orange600,
        tabBarInactiveTintColor: C.gray500,
        tabBarStyle: { backgroundColor: C.white, borderTopColor: C.gray200, height: 64, paddingBottom: 6 },
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
      <Tabs.Screen name="workers" options={{ title: "Workers", tabBarIcon: ({ focused }) => <TabIcon emoji="👷" focus={focused} /> }} />
      <Tabs.Screen name="applicants" options={{ title: "Applicants", tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focus={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focus={focused} /> }} />
    </Tabs>
  );
}
