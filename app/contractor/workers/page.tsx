"use client";

import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { WorkerCard } from "@/components/features/WorkerCard";
import { WorkerProfileModal } from "@/components/features/WorkerProfileModal";
import { Button } from "@/components/ui/Button";
import { Search, Briefcase } from "lucide-react";
import { useState, useMemo } from "react";

export default function FindWorkersPage() {
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const jobs = useStore((s) => s.jobs);
  const currentUserId = useStore((s) => s.currentUserId);
  const inviteWorker = useStore((s) => s.inviteWorker);
  const pushToast = useStore((s) => s.pushToast);
  const [search, setSearch] = useState("");
  const [profession, setProfession] = useState("all");
  const [minTrust, setMinTrust] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteTargetId, setInviteTargetId] = useState<string | null>(null);
  const [inviteJobId, setInviteJobId] = useState("");
  const [inviting, setInviting] = useState(false);

  const enriched = useMemo(() => {
    return workers.map((w) => {
      const u = users.find((x) => x.id === w.userId)!;
      return { worker: w, user: u };
    });
  }, [workers, users]);

  const filtered = useMemo(() => {
    return enriched.filter(({ worker, user }) => {
      if (search) {
        const q = search.toLowerCase();
        const match = user.name.toLowerCase().includes(q) || worker.profession.toLowerCase().includes(q) || worker.skills.some((s) => s.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (profession !== "all" && worker.profession !== profession) return false;
      if (worker.trustScore < minTrust) return false;
      return true;
    });
  }, [enriched, search, profession, minTrust]);

  const myOpenJobs = useMemo(
    () => jobs.filter((j) => j.contractorId === currentUserId && j.status === "active" && j.workersHired < j.workersNeeded),
    [jobs, currentUserId]
  );

  const selected = enriched.find((e) => e.worker.userId === selectedId) ?? null;
  const inviteTarget = enriched.find((e) => e.worker.userId === inviteTargetId) ?? null;

  const alreadyApplied = (workerId: string, jobId: string) =>
    useStore.getState().applications.some((a) => a.workerId === workerId && a.jobId === jobId);

  const openInvite = (workerId: string) => {
    setInviteTargetId(workerId);
    setInviteJobId(myOpenJobs.find((j) => !alreadyApplied(workerId, j.id))?.id ?? "");
  };

  const confirmInvite = async () => {
    if (!inviteTargetId || !inviteJobId) return;
    setInviting(true);
    try {
      await inviteWorker(inviteJobId, inviteTargetId);
      setInviteTargetId(null);
    } catch {
      // toast already shown by store
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Find workers</h2>
        <p className="text-sm text-gray-700 mt-1">Browse {workers.length} workers on the platform</p>
      </div>

      <Card className="p-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Input
              placeholder="Search by name, skill, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              iconLeft={<Search className="h-4 w-4" />}
            />
          </div>
          <Select
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            options={[
              { value: "all", label: "All professions" },
              { value: "Mason", label: "Mason" },
              { value: "Painter", label: "Painter" },
              { value: "Plumber", label: "Plumber" },
              { value: "Electrician", label: "Electrician" },
              { value: "Carpenter", label: "Carpenter" },
              { value: "Tile Fitter", label: "Tile Fitter" },
              { value: "Helper", label: "Helper" },
            ]}
          />
          <div>
            <div className="text-xs text-gray-600 mb-1.5">Min trust: {minTrust}</div>
            <input
              type="range"
              min={0}
              max={100}
              value={minTrust}
              onChange={(e) => setMinTrust(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none accent-orange-600"
            />
          </div>
        </div>
      </Card>

      {myOpenJobs.length === 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-800">
          You have no active jobs with open positions — post a job first to shortlist or hire workers.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ worker, user }) => (
          <WorkerCard
            key={worker.userId}
            workerId={worker.userId}
            onAction={(a) => {
              if (a === "view") setSelectedId(worker.userId);
              if (a === "shortlist" || a === "hire") openInvite(worker.userId);
            }}
          />
        ))}
      </div>

      {selected && (
        <WorkerProfileModal
          open
          onClose={() => setSelectedId(null)}
          worker={selected.worker}
          user={selected.user}
          onShortlist={() => openInvite(selected.worker.userId)}
          onHire={() => openInvite(selected.worker.userId)}
        />
      )}

      {inviteTarget && (
        <WorkerProfileModal
          open
          onClose={() => setInviteTargetId(null)}
          worker={inviteTarget.worker}
          user={inviteTarget.user}
          onShortlist={() => openInvite(inviteTarget.worker.userId)}
          onHire={() => openInvite(inviteTarget.worker.userId)}
        />
      )}

      {/* Job picker for inviting this worker */}
      {inviteTarget && myOpenJobs.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4"
          onClick={() => setInviteTargetId(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-elevated border border-gray-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-orange-600" /> Invite {inviteTarget.user.name}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Pick one of your active jobs — we&apos;ll shortlist {inviteTarget.user.name} for it and notify them instantly.
              </p>
            </div>
            <Select
              label="Your active jobs"
              value={inviteJobId}
              onChange={(e) => setInviteJobId(e.target.value)}
              options={[
                { value: "", label: "Choose a job…" },
                ...myOpenJobs.map((j) => ({
                  value: j.id,
                  label: `${j.title} — ₹${j.wagePerDay}/day (${j.workersHired}/${j.workersNeeded} filled)`,
                })),
              ]}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" size="md" onClick={() => setInviteTargetId(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!inviteJobId || inviting}
                loading={inviting}
                onClick={confirmInvite}
              >
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
