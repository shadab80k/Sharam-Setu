/**
 * Root layout — session restore + role gate + first-run intro gate + ToastHost.
 *
 * Auth rules (same as web):
 *   • No session → only welcome/otp/signup/intro/splash accessible.
 *   • Session restored on cold start → straight to the role home (intro skipped).
 *   • Wrong-role tab (worker opening /contractor/*) → bounced to own home.
 * First-run rules:
 *   • Fresh install (no session, intro not seen) → /intro carousel once.
 *   • After Get Started/Skip → never again (AsyncStorage `shramsetu.hasSeenIntro`).
 */
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [firstRunReady, setFirstRunReady] = useState(false);

  // Cold-start: validate the persisted cookie, then load app data.
  useEffect(() => {
    (async () => {
      const user = await restoreSession();
      if (user) await bootstrap();
      setFirstRunReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First-run gate: fresh install without a session → intro carousel (once ever).
  useEffect(() => {
    if (!firstRunReady || currentUser) return; // logged-in users never see intro
    (async () => {
      const sawIntro = await AsyncStorage.getItem("shramsetu.hasSeenIntro");
      if (!sawIntro) router.replace("/intro");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstRunReady, currentUser]);

  // Role gate — runs after any navigation.
  useEffect(() => {
    if (!loaded && !currentUser) return; // still restoring
    const inAuth =
      pathname === "/" || pathname === "/otp" || pathname === "/signup" ||
      pathname === "/intro" || pathname === "/splash";
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="intro" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(worker)" />
        <Stack.Screen name="(contractor)" />
      </Stack>
      {booting ? (
        <View style={styles.boot}>
          <ActivityIndicator size="large" color={C.primary} />
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
    backgroundColor: "rgba(246,247,249,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
});
