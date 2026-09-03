/**
 * Worker tab group — Swiggy-style bottom bar: chunky FILLED icons,
 * soft top shadow (no harsh hairline), orange active + tiny bold label.
 */
import React from "react";
import { Tabs } from "expo-router";
import { useStore } from "@/store";
import { NavIcon } from "@/components/ui/Swiggy";
import { C } from "@/theme/tokens";

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
          borderTopWidth: 0,
          height: 66,
          paddingBottom: 9,
          paddingTop: 7,
          elevation: 14,
          shadowColor: "#0E1C2E",
          shadowOpacity: 0.09,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -5 },
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700", marginTop: 1 },
        tabBarIconStyle: { marginTop: 4 },
        tabBarBadgeStyle: { backgroundColor: C.primary, color: C.white, fontSize: 10, fontWeight: "800" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <NavIcon name="home" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ focused }) => <NavIcon name="briefcase" focused={focused} /> }} />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: ({ focused }) => <NavIcon name="wallet" focused={focused} /> }} />
      <Tabs.Screen name="assistant" options={{ title: "Sahayak", tabBarIcon: ({ focused }) => <NavIcon name="chatbubbles" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <NavIcon name="person" focused={focused} /> }} />
    </Tabs>
  );
}
