/**
 * Root layout — session restore + role gate + ToastHost.
 *
 * Auth rules (same as web):
 *   • No session → only welcome/otp/signup accessible; role tabs redirect back.
 *   • Session restored on cold start → straight to the role home.
 *   • Wrong-role tab (worker opening /contractor/*) → bounced to own home.
 */
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { ToastHost } from "@/components/ui/Feedback";
import { C } from "@/theme/tokens";

function roleHome(role: string | undefined): string {
  return role === "contractor" ? "/(contractor)/home" : "/(worker)/home";
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
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

  // Role gate — runs after any navigation.
  useEffect(() => {
    if (!loaded && !currentUser) return; // still restoring
    const inAuth = pathname === "/" || pathname === "/otp" || pathname === "/signup";
    const inWorker = pathname.startsWith("/(worker)") || pathname.startsWith("/worker");
    const inContractor = pathname.startsWith("/(contractor)") || pathname.startsWith("/contractor");

    if (!currentUser && !inAuth) {
      router.replace("/");
      return;
    }
    if (currentUser) {
      const isWorkerSide = currentUser.role === "worker";
      const wrongSide = (isWorkerSide && inContractor) || (!isWorkerSide && inWorker);
      if (inAuth || wrongSide) {
        router.replace(roleHome(currentUser.role));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentUser, loaded]);

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
    position: "absolute" as const,
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(252,250,246,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
