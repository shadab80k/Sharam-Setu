"use client";

import { useEffect, useRef } from "react";
import { createBrowserClient } from "@insforge/sdk/ssr";
import { useStore } from "@/lib/store";

/**
 * Subscribes to the signed-in user's realtime channel.
 * Server-side DB triggers publish: notification, application_status,
 * payment_status, trust_score. Any of them rehydrates the store
 * (idempotent bootstrap) so all dashboards stay live.
 */
export function useRealtimeSync() {
  const currentUserId = useStore((s) => s.currentUserId);
  const bootstrap = useStore((s) => s.bootstrap);
  const bootstrapping = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const channel = `user:${currentUserId}`;

    const refresh = () => {
      if (bootstrapping.current) return;
      bootstrapping.current = true;
      bootstrap().finally(() => { bootstrapping.current = false; });
    };

    (async () => {
      try {
        const client = createBrowserClient();
        await client.realtime.connect();
        const res = await client.realtime.subscribe(channel);
        if (!res.ok || cancelled) return;

        const events = ["notification", "application_status", "payment_status", "trust_score"];
        const handlers = events.map((ev) => {
          const fn = () => refresh();
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
  }, [currentUserId, bootstrap]);
}
