"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ToastViewport } from "../ui/Toast";
import type { Role } from "@/lib/types";

interface AppShellProps {
  role: Role;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppShell({ role, title, subtitle, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-cream-50 flex">
      <Sidebar role={role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar role={role} title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
      <ToastViewport />
    </div>
  );
}
