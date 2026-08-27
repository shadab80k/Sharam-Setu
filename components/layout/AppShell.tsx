"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastViewport } from "../ui/Toast";
import { useStore } from "@/lib/store";
import { DashboardSkeleton } from "../ui/Skeleton";
import type { Role } from "@/lib/types";

interface AppShellProps {
  role: Role;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ role, title, subtitle, children }: AppShellProps) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).shramsetu = useStore;
    }
  }, []);

  // Graceful 300ms skeleton shimmer on route change so user clearly sees the loading skeleton
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-cream-50 flex" suppressHydrationWarning>
      <Sidebar role={role} />
      <div className="flex-1 min-w-0 flex flex-col" suppressHydrationWarning>
        <TopBar role={role} title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto">
          {isNavigating ? <DashboardSkeleton /> : <div className="animate-fade-in">{children}</div>}
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
