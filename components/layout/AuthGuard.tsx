"use client";

import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

export function AuthGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const currentUserId = useStore((s) => s.currentUserId);
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId));
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUserId || !user) {
      router.replace("/");
    } else if (user.role !== role) {
      // redirect to their correct role home
      router.replace(`/${user.role}/dashboard`);
    }
  }, [mounted, currentUserId, user, role, router]);

  if (!mounted || !currentUserId || !user || user.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    );
  }
  return <>{children}</>;
}

