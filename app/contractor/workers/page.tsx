"use client";

import { useStore } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { WorkerCard } from "@/components/features/WorkerCard";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

export default function FindWorkersPage() {
  const workers = useStore((s) => s.workerProfiles);
  const users = useStore((s) => s.users);
  const [search, setSearch] = useState("");
  const [profession, setProfession] = useState("all");
  const [minTrust, setMinTrust] = useState(0);

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Find workers</h2>
        <p className="text-sm text-gray-700 mt-1">Browse {workers.length} verified workers ready to work</p>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(({ worker, user }) => (
          <WorkerCard
            key={worker.userId}
            workerId={worker.userId}
            onAction={(a) => {
              if (a === "hire") console.log("hire", user.name);
            }}
          />
        ))}
      </div>
    </div>
  );
}
