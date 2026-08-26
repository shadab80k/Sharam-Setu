"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Search, MoreVertical, Shield, MapPin, Star, PauseCircle, PlayCircle, Eye } from "lucide-react";
import { useState, useMemo } from "react";
import { timeAgo } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

export default function AdminWorkersPage() {
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users.filter((u) => u.role === "worker"));
  const apps = useStore((s) => s.applications);
  const suspend = useStore((s) => s.suspendUser);
  const reactivate = useStore((s) => s.reactivateUser);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const enriched = useMemo(() => workers.map((w) => {
    const u = users.find((x) => x.id === w.userId)!;
    const myApps = apps.filter((a) => a.workerId === w.userId);
    return { worker: w, user: u, appCount: myApps.length };
  }), [workers, users, apps]);

  const filtered = useMemo(() => enriched.filter(({ worker, user }) => {
    if (search) {
      const q = search.toLowerCase();
      if (!user.name.toLowerCase().includes(q) && !worker.profession.toLowerCase().includes(q) && !user.location.toLowerCase().includes(q)) return false;
    }
    if (filter === "active" && user.status !== "active") return false;
    if (filter === "suspended" && user.status !== "suspended") return false;
    if (filter === "low-trust" && worker.trustScore >= 60) return false;
    if (filter === "high-trust" && worker.trustScore < 80) return false;
    if (filter !== "all" && filter !== "active" && filter !== "suspended" && filter !== "low-trust" && filter !== "high-trust" && worker.profession !== filter) return false;
    return true;
  }), [enriched, search, filter]);

  const target = selected ? users.find((u) => u.id === selected) : null;
  const targetProfile = selected ? workers.find((w) => w.userId === selected) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Workers</h2>
        <p className="text-sm text-gray-700 mt-1">{users.length} workers on the platform</p>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input placeholder="Search workers…" value={search} onChange={(e) => setSearch(e.target.value)} iconLeft={<Search className="h-4 w-4" />} />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "all", label: "All workers" },
              { value: "active", label: "Active only" },
              { value: "suspended", label: "Suspended" },
              { value: "high-trust", label: "High trust (≥80)" },
              { value: "low-trust", label: "Low trust (<60)" },
            ]}
          />
          <div className="text-sm text-gray-600 self-center">
            Showing {filtered.length} of {users.length}
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-cream-50 text-left text-xs uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3 font-semibold">Worker</th>
                <th className="px-4 py-3 font-semibold">Profession</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Trust</th>
                <th className="px-4 py-3 font-semibold">Verification</th>
                <th className="px-4 py-3 font-semibold">Apps</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ worker, user, appCount }) => (
                <tr key={worker.userId} className="border-b border-gray-200 hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={user.avatar} name={user.name} size={32} />
                      <div>
                        <div className="font-medium text-navy-900">{user.name}</div>
                        <div className="text-xs text-gray-600">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{worker.profession}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {user.location}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-semibold text-navy-900">{worker.trustScore}</span>
                      <span className="text-xs text-gray-500">/100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="green" size="sm">Verified</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{appCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === "active" ? "green" : "red"} size="sm">{user.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{timeAgo(user.createdAt)}</td>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Worker details" size="lg">
        {target && targetProfile && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={target.avatar} name={target.name} size={64} />
              <div>
                <div className="text-base font-semibold text-navy-900">{target.name}</div>
                <div className="text-sm text-gray-600">{target.email} · {target.phone}</div>
                <div className="text-xs text-gray-600 mt-1">{targetProfile.profession} · {targetProfile.experienceYears} yrs</div>
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
                <div className="text-xs text-gray-600">Jobs done</div>
                <div className="text-base font-bold text-navy-900">{targetProfile.completedJobs}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-navy-900 mb-2">Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {targetProfile.skills.map((s) => (
                  <Badge key={s} variant="default">{s}</Badge>
                ))}
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
