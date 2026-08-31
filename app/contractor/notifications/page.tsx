"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Bell, Briefcase, Wallet, Shield, Sparkles, Inbox } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { useState, useMemo } from "react";
import Link from "next/link";

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  job: { icon: <Briefcase className="h-4 w-4" />, color: "bg-orange-100 text-orange-600", label: "Jobs" },
  payment: { icon: <Wallet className="h-4 w-4" />, color: "bg-green-100 text-green-600", label: "Payments" },
  application: { icon: <Briefcase className="h-4 w-4" />, color: "bg-blue-100 text-blue-600", label: "Applications" },
  trust: { icon: <Shield className="h-4 w-4" />, color: "bg-blue-100 text-blue-600", label: "Trust" },
  system: { icon: <Bell className="h-4 w-4" />, color: "bg-gray-100 text-gray-600", label: "System" },
};

export default function ContractorNotificationsPage() {
  const userId = useStore((s) => s.currentUserId) || "";
  const notifications = useStore((s) => s.notifications.filter((n) => n.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => filter === "all" ? notifications : notifications.filter((n) => n.type === filter), [filter, notifications]);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Notifications</h2>
          <p className="text-sm text-gray-700 mt-1">{unread} unread · {notifications.length} total</p>
        </div>
        {unread > 0 && <button onClick={() => markAllRead(userId)} className="text-sm text-orange-600 font-medium">Mark all as read</button>}
      </div>

      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All" },
          { value: "application", label: "Applications" },
          { value: "payment", label: "Payments" },
          { value: "system", label: "System" },
        ]}
      />

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-14 w-14 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-navy-900 mt-4">You're all caught up.</h3>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.system;
            const inner = (
              <div className={`p-4 rounded-card border transition flex items-start gap-3 ${
                n.read ? "bg-white border-gray-200" : "bg-orange-100/40 border-orange-500/20"
              }`}>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>{meta.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-navy-900">{n.title}</div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-orange-600" />}
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">{n.message}</div>
                  <div className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)} · {meta.label}</div>
                </div>
              </div>
            );
            if (n.link) return <Link key={n.id} href={n.link} onClick={() => markRead(n.id)}>{inner}</Link>;
            return <div key={n.id} onClick={() => markRead(n.id)} className="cursor-pointer">{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
