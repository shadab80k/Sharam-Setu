"use client";

import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

import { InitialLoadingScreen } from "@/components/ui/InitialLoadingScreen";

export function AuthGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [checked, setChecked] = useState(false);
  const currentUserId = useStore((s) => s.currentUserId);
  const loaded = useStore((s) => s.loaded);
  const loading = useStore((s) => s.loading);
  const bootstrap = useStore((s) => s.bootstrap);
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Session cookie → server → store hydration (redirects if unauthenticated)
    bootstrap().finally(() => setChecked(true));
  }, [bootstrap]);

  useEffect(() => {
    if (!checked || !loaded) return;
    if (!currentUserId || !user) {
      router.replace("/");
    } else if (user.role !== role) {
      router.replace(`/${user.role}/dashboard`);
    }
  }, [checked, loaded, currentUserId, user, role, router]);

  // Loading: initial mount, session check, or store hydration
  if (!mounted || !checked || loading || !loaded || !currentUserId || !user || user.role !== role) {
    return <InitialLoadingScreen />;
  }

  return <>{children}</>;
}
