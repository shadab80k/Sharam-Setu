"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@insforge/sdk/ssr";
import { useStore } from "@/lib/store";
import { useBrowserNotifications } from "@/lib/hooks/useBrowserNotifications";

/**
 * Subscribes to the signed-in user's realtime channel.
 * Server-side DB triggers publish: notification, application_status,
 * payment_status, trust_score. Any of them rehydrates the store
 * (idempotent bootstrap) so all dashboards stay live.
 *
 * When a `notification` event arrives while the tab is in the background
 * (and the user opted in), a native browser notification is raised too —
 * the app-side push foundation. No service-worker/FCM config is involved.
 */
export function useRealtimeSync() {
  const currentUserId = useStore((s) => s.currentUserId);
  const bootstrap = useStore((s) => s.bootstrap);
  const bootstrapping = useRef(false);
  const { notify } = useBrowserNotifications();

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const channel = `user:${currentUserId}`;

    const refresh = (pushAlert = false) => {
      if (bootstrapping.current) return;
      bootstrapping.current = true;
      const seenTopId = useStore
        .getState()
        .notifications.filter((n) => n.userId === currentUserId)[0]?.id;
      bootstrap().finally(() => {
        bootstrapping.current = false;
        if (pushAlert) {
          // Fresh notification from the server → surface it as a system notification
          const latest = useStore
            .getState()
            .notifications.filter((n) => n.userId === currentUserId)[0];
          if (latest && latest.id !== seenTopId) {
            notify(latest.title, { body: latest.message, tag: latest.id });
          }
        }
      });
    };

    (async () => {
      try {
        const client = createBrowserClient();
        await client.realtime.connect();
        const res = await client.realtime.subscribe(channel);
        if (!res.ok || cancelled) return;

        const events = ["notification", "application_status", "payment_status", "trust_score"];
        const handlers = events.map((ev) => {
          const fn = () => refresh(ev === "notification");
          client.realtime.on(ev, fn);
          return { ev, fn };
        });

        cleanup = () => {
          for (const { ev, fn } of handlers) client.realtime.off(ev, fn);
          client.realtime.unsubscribe(channel);
        };
      } catch (e) {
        // Realtime is an enhancement; app still works with manual navigation refresh.
        console.warn("[realtime] unavailable:", (e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [currentUserId, bootstrap, notify]);
}
