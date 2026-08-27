"use client";

import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

import { InitialLoadingScreen } from "@/components/ui/InitialLoadingScreen";

// Global flag so client-side SPA navigation is instant (0ms)
let isAppInitialized = false;

export function AuthGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(isAppInitialized);
  const currentUserId = useStore((s) => s.currentUserId);
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const router = useRouter();

  useEffect(() => {
    if (!isAppInitialized) {
      const timer = setTimeout(() => {
        isAppInitialized = true;
        setMounted(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUserId || !user) {
      router.replace("/");
    } else if (user.role !== role) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [mounted, currentUserId, user, role, router]);

  // Show full loading skeleton on initial mount so shimmer is visible and elegant
  if (!mounted || !currentUserId || !user || user.role !== role) {
    return <InitialLoadingScreen />;
  }

  return <>{children}</>;
}

