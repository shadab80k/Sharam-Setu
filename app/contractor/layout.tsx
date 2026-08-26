"use client";

import { AuthGuard } from "@/components/layout/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard role="contractor">
      <AppShell role="contractor">{children}</AppShell>
    </AuthGuard>
  );
}
