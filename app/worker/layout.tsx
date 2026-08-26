"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="worker">
      <AppShell role="worker">{children}</AppShell>
    </AuthGuard>
  );
}
