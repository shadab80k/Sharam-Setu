"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, X, AlertCircle, Shield } from "lucide-react";
import { useState, useMemo } from "react";
import { timeAgo } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  phone: "Phone",
  email: "Email",
  identity: "Identity",
  skill: "Skill Assessment",
  "work-history": "Work History",
  address: "Address",
};

export default function VerificationsPage() {
  const verifications = useStore((s) => s.verifications);
  const users = useStore((s) => s.users);
  const approve = useStore((s) => s.approveVerification);
  const reject = useStore((s) => s.rejectVerification);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const filtered = useMemo(() => verifications.filter((v) => {
    if (tab === "all") return true;
    if (tab === "approved") return v.status === "verified";
    if (tab === "rejected") return v.status === "rejected";
    return v.status === "pending" || v.status === "not-started";
  }), [verifications, tab]);

  const counts = {
    pending: verifications.filter((v) => v.status === "pending" || v.status === "not-started").length,
    approved: verifications.filter((v) => v.status === "verified").length,
    rejected: verifications.filter((v) => v.status === "rejected").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Verifications</h2>
        <p className="text-sm text-gray-700 mt-1">Review and approve user verifications</p>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as any)}
        items={[
          { value: "pending", label: `Pending (${counts.pending})` },
          { value: "approved", label: `Approved (${counts.approved})` },
          { value: "rejected", label: `Rejected (${counts.rejected})` },
          { value: "all", label: "All" },
        ]}
      />

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-sm text-gray-600">No verifications in this view.</Card>
        ) : (
          filtered.map((v) => {
            const user = users.find((u) => u.id === v.userId);
            if (!user) return null;
            const confidence = v.status === "verified" ? v.score : 0;
            return (
              <Card key={v.id} className="p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <Avatar src={user.avatar} name={user.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold text-navy-900">{user.name}</div>
                      <Badge variant="default" size="sm">{user.role}</Badge>
                      <Badge
                        variant={v.status === "verified" ? "green" : v.status === "rejected" ? "red" : v.status === "pending" ? "amber" : "gray"}
                        size="sm"
                      >
                        {v.status === "verified" ? "Verified" : v.status === "rejected" ? "Rejected" : v.status === "pending" ? "Pending" : "Not started"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {TYPE_LABEL[v.type] || v.type} verification
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-green-600" />
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-navy-900">{confidence}%</span>
                      </div>
                      <div className="text-gray-500">
                        {v.verifiedAt ? `Verified ${timeAgo(v.verifiedAt)}` : `Submitted ${timeAgo(user.createdAt)}`}
                      </div>
                    </div>
                  </div>
                  {v.status === "pending" || v.status === "not-started" ? (
                    <div className="flex items-center gap-1.5">
                      <Button variant="success" size="sm" onClick={() => approve(v.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => reject(v.id)}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={v.status === "verified" ? "green" : "red"}>{v.status}</Badge>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
