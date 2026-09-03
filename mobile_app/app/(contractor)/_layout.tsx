/**
 * Contractor tab group — Swiggy-style bottom bar, MAX 4 visible tabs:
 * Home · Jobs · Workers · Profile. All other screens hidden (href: null),
 * reachable via Home pipeline chips + Profile links.
 */
import React from "react";
import { Tabs } from "expo-router";
import { useStore } from "@/store";
import { NavIcon } from "@/components/ui/Swiggy";
import { C } from "@/theme/tokens";

const TAB_BAR_STYLE = {
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
};

export default function ContractorLayout() {
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700", marginTop: 1 },
        tabBarIconStyle: { marginTop: 4 },
        tabBarBadgeStyle: { backgroundColor: C.primary, color: C.white, fontSize: 10, fontWeight: "800" },
      }}
    >
      {/* ── 4 visible tabs ── */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <NavIcon name="home" focused={focused} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ focused }) => <NavIcon name="briefcase" focused={focused} /> }} />
      <Tabs.Screen name="workers" options={{ title: "Workers", tabBarIcon: ({ focused }) => <NavIcon name="people" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <NavIcon name="person" focused={focused} /> }} />

      {/* ── hidden routes (push-only) ── */}
      <Tabs.Screen name="applicants" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
