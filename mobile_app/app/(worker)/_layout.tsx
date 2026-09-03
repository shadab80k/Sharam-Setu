/**
 * Worker tab group (V3) — white bar, hairline top, Ionicons, orange active.
 * Tabs: Home · Jobs · Money · Assistant · Profile.
 */
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "@/store";
import { C, T } from "@/theme/tokens";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Ionicons name={name} size={23} color={focused ? C.primary : C.text3} />;
}

export default function WorkerLayout() {
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.hairline,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 7,
          paddingTop: 5,
        },
        tabBarLabelStyle: { fontSize: T.tiny, fontWeight: "700" },
        tabBarBadgeStyle: { backgroundColor: C.primary, color: C.onPrimary },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "briefcase" : "briefcase-outline"} focused={focused} /> }} />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "wallet" : "wallet-outline"} focused={focused} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Assistant", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "person" : "person-outline"} focused={focused} /> }} />
    </Tabs>
  );
}
