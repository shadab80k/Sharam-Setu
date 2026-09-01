"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Push-notification foundation (app-side only, zero external config):
 * 1. `pushPermission` — the browser Notification permission state.
 * 2. `enablePush()` — asks the user for permission; nothing is sent anywhere,
 *    no service-worker/FCM keys are required. Stores the choice locally so
 *    a dismissed prompt isn't nagged on every visit.
 * 3. `notify()` — shows a native browser notification while the tab is in the
 *    background, and an in-app toast otherwise (already handled by callers).
 *
 * When a real provider (FCM/web-push) is configured later, only the
 * registration/subscription part needs to be added — call sites stay the same.
 */

const PREF_KEY = "shramsetu-push-opt-in";

type PushPermission = "unsupported" | NotificationPermission;

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const permissionRef = useRef<PushPermission>("unsupported");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // Respect a stored opt-out even if the browser permission is still "default"
    const optedOut = localStorage.getItem(PREF_KEY) === "off";
    const current = optedOut && Notification.permission === "default" ? "denied" : Notification.permission;
    setPermission(current);
    permissionRef.current = current;
  }, []);

  const enablePush = useCallback(async (): Promise<PushPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    let result = Notification.permission;
    if (result === "default") result = await Notification.requestPermission();
    setPermission(result);
    permissionRef.current = result;
    if (result === "denied") localStorage.setItem(PREF_KEY, "off");
    else localStorage.removeItem(PREF_KEY);
    return result;
  }, []);

  /** Fire-and-forget system notification; silently no-ops without permission. */
  const notify = useCallback((title: string, options?: { body?: string; tag?: string }) => {
    if (permissionRef.current !== "granted" || typeof document === "undefined") return;
    if (document.visibilityState === "visible") return; // in-app toasts cover the foreground
    try {
      new Notification(title, { body: options?.body, tag: options?.tag });
    } catch {
      // Some browsers require a service-worker registration for the constructor; failing here is fine.
    }
  }, []);

  return { permission, enablePush, notify };
}
