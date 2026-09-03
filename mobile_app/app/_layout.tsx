/**
 * Root layout — auth gate + ToastHost.
 * Restores the persisted cookie session on cold start, then boots data.
 */
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { ToastHost } from "@/components/ui/Feedback";
import { C, T } from "@/theme/tokens";

export default function RootLayout() {
  const currentUser = useStore((s) => s.currentUser);
  const loaded = useStore((s) => s.loaded);
  const loading = useStore((s) => s.loading);
  const restoreSession = useStore((s) => s.restoreSession);
  const bootstrap = useStore((s) => s.bootstrap);

  // Cold-start: validate the persisted cookie, then load app data.
  useEffect(() => {
    (async () => {
      const user = await restoreSession();
      if (user) await bootstrap();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const booting = loading || (!!currentUser && !loaded);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.cream50 } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(worker)" />
        <Stack.Screen name="(contractor)" />
      </Stack>
      {booting ? (
        <View style={styles.boot}>
          <ActivityIndicator size="large" color={C.orange600} />
        </View>
      ) : null}
      <ToastHost />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(252,250,246,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
