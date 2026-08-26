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

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-navy-900 truncate">{derivedTitle}</h1>
          {subtitle && <p className="text-xs text-gray-600 truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={locRef}>
            <button
              onClick={() => setOpenLocation((o) => !o)}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 hover:border-orange-500/30 hover:bg-cream-100 text-sm"
            >
              <MapPin className="h-4 w-4 text-orange-600" />
              <span className="text-navy-900 font-medium">{currentCity.name}</span>
              <span className="text-[10px] text-gray-500 hidden md:inline">Simulated</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>
            {openLocation && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-card shadow-elevated py-1 animate-fade-in z-50">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Simulated Location</div>
                {CITIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setLocation(c.id);
                      setOpenLocation(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-cream-100 ${
                      c.id === currentLocation ? "bg-orange-100 text-orange-600" : "text-navy-900"
                    }`}
                  >
                    {c.name} <span className="text-gray-500 text-xs">· {c.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/${role}/notifications`}
            className="relative h-9 w-9 rounded-lg border border-gray-200 hover:bg-cream-100 flex items-center justify-center"
          >
            <Bell className="h-4 w-4 text-navy-900" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-semibold flex items-center justify-center">
                {unread}
              </span>
            )}
          </Link>

          <div className="relative" ref={switchRef}>
            <button
              onClick={() => setOpenSwitch((o) => !o)}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-gray-200 hover:bg-cream-100 text-sm"
              title="Switch demo account"
            >
              <div className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">
                {role === "worker" ? "W" : role === "contractor" ? "C" : "A"}
              </div>
              <span className="hidden md:inline font-medium text-navy-900 capitalize">{role}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
            </button>
            {openSwitch && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-card shadow-elevated py-1 animate-fade-in z-50">
                <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Switch Demo Account</div>
                <button
                  onClick={() => { switchUser("worker"); setOpenSwitch(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-navy-900 hover:bg-cream-100"
                >
                  Ramesh Kumar · Worker
                </button>
                <button
                  onClick={() => { switchUser("contractor"); setOpenSwitch(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-navy-900 hover:bg-cream-100"
                >
                  Raj BuildWorks · Contractor
                </button>
                <button
                  onClick={() => { switchUser("admin"); setOpenSwitch(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-navy-900 hover:bg-cream-100"
                >
                  ShramSetu Admin
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
