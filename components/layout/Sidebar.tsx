"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Shield,
  Wallet,
  TrendingDown,
  GraduationCap,
  Sparkles,
  Bell,
  AlertTriangle,
  Settings,
  PlusCircle,
  Users,
  ClipboardList,
  Star,
  ShieldCheck,
  AlertOctagon,
  BarChart3,
  FileBarChart,
  LogOut,
  Hammer,
} from "lucide-react";
import type { Role } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const workerNav: { group: string; items: NavItem[] }[] = [
  {
    group: "WORK",
    items: [
      { label: "Dashboard", href: "/worker/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "Jobs", href: "/worker/jobs", icon: <Briefcase className="h-4 w-4" /> },
      { label: "Applications", href: "/worker/applications", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    group: "MONEY",
    items: [
      { label: "Income", href: "/worker/income", icon: <Wallet className="h-4 w-4" /> },
      { label: "Expenses & Savings", href: "/worker/expenses", icon: <TrendingDown className="h-4 w-4" /> },
    ],
  },
  {
    group: "TRUST",
    items: [
      { label: "Profile", href: "/worker/profile", icon: <User className="h-4 w-4" /> },
      { label: "Trust Score", href: "/worker/trust", icon: <Shield className="h-4 w-4" /> },
    ],
  },
  {
    group: "GROW",
    items: [
      { label: "Career", href: "/worker/career", icon: <GraduationCap className="h-4 w-4" /> },
      { label: "AI Assistant", href: "/worker/assistant", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
];

const contractorNav: { group: string; items: NavItem[] }[] = [
  {
    group: "WORK",
    items: [
      { label: "Dashboard", href: "/contractor/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: "My Jobs", href: "/contractor/jobs", icon: <Briefcase className="h-4 w-4" /> },
      { label: "Post Job", href: "/contractor/jobs/new", icon: <PlusCircle className="h-4 w-4" /> },
      { label: "Find Workers", href: "/contractor/workers", icon: <Users className="h-4 w-4" /> },
      { label: "Applicants", href: "/contractor/applicants", icon: <ClipboardList className="h-4 w-4" /> },
    ],
  },
  {
    group: "MONEY",
    items: [{ label: "Payments", href: "/contractor/payments", icon: <Wallet className="h-4 w-4" /> }],
  },
  {
    group: "TRUST",
    items: [
      { label: "Reviews", href: "/contractor/reviews", icon: <Star className="h-4 w-4" /> },
    ],
  },
];

const adminNav: { group: string; items: NavItem[] }[] = [
  {
    group: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    group: "PEOPLE",
    items: [
      { label: "Workers", href: "/admin/workers", icon: <Users className="h-4 w-4" /> },
      { label: "Contractors", href: "/admin/contractors", icon: <Hammer className="h-4 w-4" /> },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { label: "Jobs", href: "/admin/jobs", icon: <Briefcase className="h-4 w-4" /> },
      { label: "Applications", href: "/admin/applications", icon: <ClipboardList className="h-4 w-4" /> },
      { label: "Verifications", href: "/admin/verifications", icon: <ShieldCheck className="h-4 w-4" /> },
      { label: "Fraud & Safety", href: "/admin/fraud", icon: <AlertOctagon className="h-4 w-4" /> },
      { label: "Payments", href: "/admin/payments", icon: <Wallet className="h-4 w-4" /> },
      { label: "Reports", href: "/admin/reports", icon: <AlertTriangle className="h-4 w-4" /> },
    ],
  },
  {
    group: "INSIGHTS",
    items: [{ label: "Analytics", href: "/admin/analytics", icon: <BarChart3 className="h-4 w-4" /> }],
  },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const user = useStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const logout = useStore((s) => s.logout);

  const groups =
    role === "worker" ? workerNav : role === "contractor" ? contractorNav : adminNav;

  const roleLabel = role === "worker" ? "Worker" : role === "contractor" ? "Contractor" : "Admin";

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 h-screen sticky top-0 border-r border-gray-200 bg-white">
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-orange-600 text-white flex items-center justify-center">
            <Hammer className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-base font-bold text-navy-900 leading-none">ShramSetu</div>
            <div className="text-[10px] font-semibold text-orange-600 tracking-wider mt-0.5">AI</div>
          </div>
        </Link>
        <div className="mt-4 px-2.5 py-1.5 rounded-md bg-cream-100 inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
          <span className="text-xs font-semibold text-navy-900 uppercase tracking-wider">{roleLabel}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.group} className="mb-4">
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
              {group.group}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition group",
                    active
                      ? "bg-orange-100 text-orange-600"
                      : "text-gray-700 hover:bg-cream-100 hover:text-navy-900"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition",
                      active ? "bg-orange-600" : "bg-transparent"
                    )}
                  />
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-orange-600 text-white text-[10px] font-semibold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="border-t border-gray-200 my-3" />
        <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">System</div>
        <Link
          href={`/${role}/notifications`}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
            pathname?.includes("/notifications")
              ? "bg-orange-100 text-orange-600"
              : "text-gray-700 hover:bg-cream-100 hover:text-navy-900"
          )}
        >
          <Bell className="h-4 w-4" />
          <span className="flex-1">Notifications</span>
          {unread > 0 && (
            <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-100 hover:text-red-600 transition"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </nav>

      <div className="px-4 py-3 border-t border-gray-200 bg-cream-50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
            {user?.name?.[0] ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-navy-900 truncate">{user?.name ?? "Guest"}</div>
            <div className="text-[10px] text-gray-600 truncate">{user?.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
