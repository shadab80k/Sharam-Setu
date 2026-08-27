"use client";

import { useStore } from "@/lib/store";
import { Bell, MapPin, Search, Menu, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CITIES } from "@/lib/utils/cities";
import { usePathname } from "next/navigation";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  role: "worker" | "contractor" | "admin";
}

const titleMap: Record<string, string> = {
  "/worker/dashboard": "Dashboard",
  "/worker/jobs": "Find Work",
  "/worker/applications": "My Applications",
  "/worker/profile": "My Profile",
  "/worker/trust": "Trust Score",
  "/worker/income": "Income & Payments",
  "/worker/expenses": "Expenses & Savings",
  "/worker/career": "Career Path",
  "/worker/assistant": "AI Assistant",
  "/worker/notifications": "Notifications",
  "/worker/reports": "Safety & Reports",
  "/contractor/dashboard": "Dashboard",
  "/contractor/jobs": "My Jobs",
  "/contractor/jobs/new": "Post a New Job",
  "/contractor/workers": "Find Workers",
  "/contractor/applicants": "Applicants",
  "/contractor/payments": "Payments",
  "/contractor/reviews": "Reviews",
  "/admin/dashboard": "Platform Overview",
  "/admin/workers": "Workers",
  "/admin/contractors": "Contractors",
  "/admin/jobs": "Jobs",
  "/admin/applications": "Applications",
  "/admin/verifications": "Verifications",
  "/admin/fraud": "Fraud & Safety",
  "/admin/payments": "Payments",
  "/admin/analytics": "Analytics",
  "/admin/reports": "Reports",
};

export function TopBar({ title, subtitle, role }: TopBarProps) {
  const pathname = usePathname();
  const unread = useStore((s) => s.notifications.filter((n) => !n.read && n.userId === s.currentUserId).length);
  const currentLocation = useStore((s) => s.currentLocation);
  const setLocation = useStore((s) => s.setLocation);
  const switchUser = useStore((s) => s.switchUser);

  const [openLocation, setOpenLocation] = useState(false);
  const [openSwitch, setOpenSwitch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) setOpenLocation(false);
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) setOpenSwitch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentCity = CITIES.find((c) => c.id === currentLocation) || CITIES[0];
  const derivedTitle = title ?? (pathname ? titleMap[pathname] : undefined) ?? "ShramSetu";

  const workerNavLinks = [
    { label: "Dashboard", href: "/worker/dashboard" },
    { label: "Find Jobs", href: "/worker/jobs" },
    { label: "Applications", href: "/worker/applications" },
    { label: "Income & Payments", href: "/worker/income" },
    { label: "Expenses & Savings", href: "/worker/expenses" },
    { label: "Trust Score", href: "/worker/trust" },
    { label: "Profile", href: "/worker/profile" },
    { label: "Career Path", href: "/worker/career" },
    { label: "AI Assistant", href: "/worker/assistant" },
    { label: "Safety & Reports", href: "/worker/reports" },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 -ml-2 text-gray-700 hover:text-navy-900 rounded-lg hover:bg-cream-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-navy-900 truncate leading-tight">{derivedTitle}</h1>
            {subtitle && <p className="text-xs text-gray-700 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="relative" ref={locRef}>
            <button
              onClick={() => setOpenLocation((o) => !o)}
              aria-label={`Current location: ${currentCity.name}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-cream-50 text-xs font-medium text-navy-900 transition"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
              <span className="hidden sm:inline">{currentCity.name}</span>
              <span className="text-[10px] text-gray-700 hidden sm:inline">({currentCity.state})</span>
              <ChevronDown className="h-3 w-3 text-gray-600" />
            </button>
            {openLocation && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5 z-40 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-700 uppercase">Change City</div>
                {CITIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setLocation(c.id);
                      setOpenLocation(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      c.id === currentLocation
                        ? "bg-orange-100 text-orange-700 font-semibold"
                        : "text-gray-800 hover:bg-cream-100"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-gray-600">{c.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={switchRef}>
            <button
              onClick={() => setOpenSwitch((o) => !o)}
              aria-label={`Role: ${role}, switch demo role`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-navy-900 text-white text-xs font-medium hover:bg-navy-800 transition"
            >
              <span className="hidden md:inline">Role:</span>
              <span className="capitalize text-orange-400 font-semibold">{role}</span>
              <ChevronDown className="h-3 w-3 text-gray-300" />
            </button>
            {openSwitch && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white shadow-lg p-1.5 z-40 animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-semibold text-gray-700 uppercase">Switch Demo Role</div>
                {(["worker", "contractor", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      switchUser(r);
                      setOpenSwitch(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize flex items-center justify-between ${
                      r === role ? "bg-orange-100 text-orange-700 font-semibold" : "text-gray-800 hover:bg-cream-100"
                    }`}
                  >
                    <span>{r}</span>
                    {r === role && <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <Link
            href={`/${role}/notifications`}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
            className="relative p-2 text-gray-700 hover:text-navy-900 rounded-lg hover:bg-cream-100 transition"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute 1 top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-semibold flex items-center justify-center">
                {unread}
              </span>
            )}
          </Link>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1 shadow-md animate-fade-in">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Navigation</div>
          {workerNavLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active ? "bg-orange-100 text-orange-600" : "text-gray-700 hover:bg-cream-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
