"use client";

import { Button } from "@/components/ui/Button";
import { Bell, BellRing, CheckCircle2 } from "lucide-react";
import { useBrowserNotifications } from "@/lib/hooks/useBrowserNotifications";
import { useStore } from "@/lib/store";

/**
 * Small opt-in control for the app-side push foundation: asks the browser
 * for Notification permission (no server/provider involved) and confirms
 * the state. Hidden entirely where unsupported or already granted.
 */
export function PushOptIn() {
  const { permission, enablePush } = useBrowserNotifications();
  const pushToast = useStore((s) => s.pushToast);

  if (permission === "unsupported" || permission === "granted") return null;

  return (
    <Button
      variant="secondary"
      size="sm"
      iconLeft={permission === "denied" ? <Bell className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
      onClick={async () => {
        const result = await enablePush();
        if (result === "granted") pushToast("success", "Browser alerts enabled");
        else if (result === "denied") pushToast("info", "Alerts blocked — allow them in your browser settings");
      }}
    >
      {permission === "denied" ? "Alerts blocked in browser" : "Enable browser alerts"}
    </Button>
  );
}

/** Confirmation chip for pages that want to show push is active. */
export function PushActiveChip() {
  const { permission } = useBrowserNotifications();
  if (permission !== "granted") return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
      <CheckCircle2 className="h-3.5 w-3.5" /> Browser alerts on
    </span>
  );
}
