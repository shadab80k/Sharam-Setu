"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Bell, Briefcase, Wallet, Shield, AlertTriangle, Sparkles, CheckCircle2, Inbox } from "lucide-react";
import { timeAgo, formatINR } from "@/lib/utils";
import { useState, useMemo } from "react";
import Link from "next/link";

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  job: { icon: <Briefcase className="h-4 w-4" />, color: "bg-orange-100 text-orange-600", label: "Jobs" },
  payment: { icon: <Wallet className="h-4 w-4" />, color: "bg-green-100 text-green-600", label: "Payments" },
  trust: { icon: <Shield className="h-4 w-4" />, color: "bg-blue-100 text-blue-600", label: "Trust" },
  verification: { icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-purple-100 text-purple-600", label: "Verification" },
  application: { icon: <Briefcase className="h-4 w-4" />, color: "bg-blue-100 text-blue-600", label: "Applications" },
  safety: { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-red-100 text-red-600", label: "Safety" },
  ai: { icon: <Sparkles className="h-4 w-4" />, color: "bg-purple-100 text-purple-600", label: "AI" },
  system: { icon: <Bell className="h-4 w-4" />, color: "bg-gray-100 text-gray-600", label: "System" },
};

export default function WorkerNotificationsPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const notifications = useStore((s) => s.notifications.filter((n) => n.userId === currentUserId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  const markRead = useStore((s) => s.markNotificationRead);
  const markAllRead = useStore((s) => s.markAllNotificationsRead);

  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [filter, notifications]);

  const grouped = useMemo(() => {
    const today: typeof notifications = [];
    const yesterday: typeof notifications = [];
    const earlier: typeof notifications = [];
    const now = new Date();
    filtered.forEach((n) => {
      const d = new Date(n.createdAt);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) today.push(n);
      else if (diffDays === 1) yesterday.push(n);
      else earlier.push(n);
    });
    return { today, yesterday, earlier };
  }, [filtered]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">Notifications</h2>
          <p className="text-sm text-gray-700 mt-1">{unread} unread · {notifications.length} total</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={() => markAllRead(currentUserId)}>
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All" },
          { value: "job", label: "Jobs" },
          { value: "payment", label: "Payments" },
          { value: "trust", label: "Trust" },
          { value: "verification", label: "Verification" },
          { value: "safety", label: "Safety" },
          { value: "ai", label: "AI" },
        ]}
      />

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-14 w-14 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-navy-900 mt-4">You're all caught up.</h3>
          <p className="text-sm text-gray-600 mt-1">No notifications in this category yet.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.today.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1">Today</div>
              <div className="space-y-2">
                {grouped.today.map((n) => (
                  <NotificationRow key={n.id} notification={n} onRead={() => markRead(n.id)} />
                ))}
              </div>
            </section>
          )}
          {grouped.yesterday.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1">Yesterday</div>
              <div className="space-y-2">
                {grouped.yesterday.map((n) => (
                  <NotificationRow key={n.id} notification={n} onRead={() => markRead(n.id)} />
                ))}
              </div>
            </section>
          )}
          {grouped.earlier.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1">Earlier</div>
              <div className="space-y-2">
                {grouped.earlier.map((n) => (
                  <NotificationRow key={n.id} notification={n} onRead={() => markRead(n.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification, onRead }: any) {
  const meta = TYPE_META[notification.type] || TYPE_META.system;
  const inner = (
    <div className={`p-4 rounded-card border transition flex items-start gap-3 ${
      notification.read ? "bg-white border-gray-200" : "bg-orange-100/40 border-orange-500/20"
    }`}>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-navy-900">{notification.title}</div>
          {!notification.read && <div className="h-2 w-2 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />}
        </div>
        <div className="text-sm text-gray-700 mt-0.5">{notification.message}</div>
        <div className="text-xs text-gray-500 mt-1.5">{timeAgo(notification.createdAt)} · {meta.label}</div>
      </div>
    </div>
  );
  if (notification.link) {
    return (
      <Link href={notification.link} onClick={onRead}>
        {inner}
      </Link>
    );
  }
  return <div onClick={onRead} className="cursor-pointer">{inner}</div>;
}
