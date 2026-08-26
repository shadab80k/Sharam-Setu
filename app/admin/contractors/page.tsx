"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Select } from "@/components/ui/Input";
import { Search, Shield, Star, MapPin, AlertTriangle, Eye, PauseCircle, PlayCircle, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { timeAgo } from "@/lib/utils";

export default function AdminContractorsPage() {
  const users = useStore((s) => s.users.filter((u) => u.role === "contractor"));
  const profiles = useStore((s) => s.contractorProfiles);
  const payments = useStore((s) => s.payments);
  const suspend = useStore((s) => s.suspendUser);
  const reactivate = useStore((s) => s.reactivateUser);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const enriched = useMemo(() => users.map((u) => {
    const p = profiles.find((x) => x.userId === u.id)!;
    const myPayments = payments.filter((pay) => pay.contractorId === u.id);
    const overdue = myPayments.filter((pay) => pay.status === "overdue").length;
    return { user: u, profile: p, overdue };
  }), [users, profiles, payments]);

  const filtered = useMemo(() => enriched.filter(({ user, profile }) => {
    if (search && !user.name.toLowerCase().includes(search.toLowerCase()) && !user.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "active" && user.status !== "active") return false;
    if (filter === "suspended" && user.status !== "suspended") return false;
    if (filter === "low-trust" && profile.trustScore >= 60) return false;
    if (filter === "low-reliability" && profile.paymentReliability >= 80) return false;
    return true;
  }), [enriched, search, filter]);

  const target = selected ? users.find((u) => u.id === selected) : null;
  const targetProfile = selected ? profiles.find((p) => p.userId === selected) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Contractors</h2>
        <p className="text-sm text-gray-700 mt-1">{users.length} contractors on the platform</p>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Search contractors…" value={search} onChange={(e) => setSearch(e.target.value)} iconLeft={<Search className="h-4 w-4" />} />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "all", label: "All contractors" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "low-trust", label: "Low trust" },
              { value: "low-reliability", label: "Low payment reliability" },
            ]}
          />
          <div className="text-sm text-gray-600 self-center">Showing {filtered.length} of {users.length}</div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Contractor</th>
                <th className="px-4 py-3 font-semibold">Trust</th>
                <th className="px-4 py-3 font-semibold">Rating</th>
                <th className="px-4 py-3 font-semibold">Jobs</th>
                <th className="px-4 py-3 font-semibold">Payment reliability</th>
                <th className="px-4 py-3 font-semibold">Complaints</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ user, profile, overdue }) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={user.avatar} name={user.name} size={32} />
                      <div>
                        <div className="font-medium text-navy-900">{user.name}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> {user.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-semibold text-navy-900">{profile.trustScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-600 fill-current" /> {profile.rating.toFixed(1)}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{profile.completedJobs}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${profile.paymentReliability >= 80 ? "bg-green-600" : profile.paymentReliability >= 60 ? "bg-amber-600" : "bg-red-600"}`}
                          style={{ width: `${profile.paymentReliability}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-700">{profile.paymentReliability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {overdue > 0 ? (
                      <Badge variant="red" size="sm" iconLeft={<AlertTriangle className="h-3 w-3" />}>{overdue}</Badge>
                    ) : (
                      <span className="text-xs text-gray-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === "active" ? "green" : "red"} size="sm">{user.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(user.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Contractor details" size="lg">
        {target && targetProfile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={target.avatar} name={target.name} size={64} />
              <div>
                <div className="text-base font-semibold text-navy-900">{target.name}</div>
                <div className="text-sm text-gray-600">{targetProfile.businessType}</div>
                <div className="text-xs text-gray-600 mt-1">Joined {timeAgo(target.createdAt)}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Trust</div>
                <div className="text-base font-bold text-navy-900">{targetProfile.trustScore}/100</div>
              </div>
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Rating</div>
                <div className="text-base font-bold text-navy-900 flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-600 fill-current" /> {targetProfile.rating.toFixed(1)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-cream-100">
                <div className="text-xs text-gray-600">Payment reliability</div>
                <div className="text-base font-bold text-navy-900">{targetProfile.paymentReliability}%</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {target.status === "active" ? (
                <Button variant="destructive" onClick={() => { suspend(target.id); setSelected(null); }}>
                  <PauseCircle className="h-4 w-4" /> Suspend
                </Button>
              ) : (
                <Button variant="success" onClick={() => { reactivate(target.id); setSelected(null); }}>
                  <PlayCircle className="h-4 w-4" /> Reactivate
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
