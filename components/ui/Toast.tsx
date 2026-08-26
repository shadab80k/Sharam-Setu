"use client";

import { useStore } from "@/lib/store";
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function ToastViewport() {
  const [mounted, setMounted] = useState(false);
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : Info;
        const color =
          t.type === "success"
            ? "border-green-100 bg-green-100 text-green-600"
            : t.type === "error"
            ? "border-red-100 bg-red-100 text-red-600"
            : "border-blue-100 bg-blue-100 text-blue-600";
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-elevated animate-fade-in",
              "min-w-[280px]"
            )}
          >
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border", color)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="flex-1 text-sm text-navy-900 mt-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-500 hover:text-navy-900 -mr-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
