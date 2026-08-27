"use client";

import { useStore } from "@/lib/store";
import { JobCard } from "@/components/features/JobCard";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Search, MapPin, Filter, X, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";
import { calculateMatchScore } from "@/lib/services/jobMatching";
import { CITIES } from "@/lib/utils/cities";
import { EmptyState } from "@/components/ui/EmptyState";

export default function WorkerJobsPage() {
  const currentUserId = useStore((s) => s.currentUserId) || "usr_w_1";
  const jobs = useStore((s) => s.jobs.filter((j) => j.status === "active"));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === currentUserId));
  const savedJobIds = useStore((s) => s.savedJobIds || []);
  const currentLocation = useStore((s) => s.currentLocation);
  const city = CITIES.find((c) => c.id === currentLocation) || CITIES[0];

  const [search, setSearch] = useState("");
  const [chipFilters, setChipFilters] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minWage, setMinWage] = useState(0);
  const [maxDistance, setMaxDistance] = useState(20);
  const [profession, setProfession] = useState("all");

  const enriched = useMemo(() => {
    if (!profile) return [];
    return jobs
      .map((j) => {
        const contractor = useStore.getState().contractorProfiles.find((c) => c.userId === j.contractorId);
        const match = calculateMatchScore(j, profile, contractor, city);
        return { ...match, contractor };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [jobs, profile, city]);

  const filtered = useMemo(() => {
    return enriched.filter(({ job, distanceKm, matchScore }) => {
      if (search) {
        const q = search.toLowerCase();
        const match = job.title.toLowerCase().includes(q) || job.location.toLowerCase().includes(q) || job.requiredSkills.some((s) => s.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (minWage && job.wagePerDay < minWage) return false;
      if (distanceKm > maxDistance) return false;
      if (profession !== "all" && job.category !== profession) return false;
      if (chipFilters.includes("saved") && !savedJobIds.includes(job.id)) return false;
      if (chipFilters.includes("best-match") && matchScore < 80) return false;
      if (chipFilters.includes("verified") && (useStore.getState().contractorProfiles.find((c) => c.userId === job.contractorId)?.trustScore ?? 0) < 75) return false;
      if (chipFilters.includes("available") && profile?.availability !== "available") return false;
      if (chipFilters.includes("near") && distanceKm > 5) return false;
      if (chipFilters.includes("highest-pay") && job.wagePerDay < 1000) return false;
      return true;
    });
  }, [enriched, search, chipFilters, minWage, maxDistance, profession, profile, savedJobIds]);

  const chips = [
    { id: "near", label: "Near me" },
    { id: "best-match", label: "Best match" },
    { id: "highest-pay", label: "Highest pay" },
    { id: "verified", label: "Verified contractors" },
    { id: "available", label: "Available now" },
    { id: "saved", label: `Saved (${savedJobIds.length})` },
  ];

  function toggleChip(id: string) {
    setChipFilters((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-navy-900">Find work that fits you</h2>
        <p className="text-sm text-gray-700 mt-1">
          Showing {filtered.length} jobs in and around {city.name}
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search jobs, skills, or contractors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              iconLeft={<Search className="h-4 w-4" />}
            />
          </div>
          <Button variant="secondary" onClick={() => setShowAdvanced((s) => !s)} iconLeft={<SlidersHorizontal className="h-4 w-4" />}>
            Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleChip(c.id)}
              className={`px-3 h-8 rounded-full text-xs font-medium border transition ${
                chipFilters.includes(c.id)
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-orange-500/40"
              }`}
            >
              {c.label}
            </button>
          ))}
          {chipFilters.length > 0 && (
            <button
              onClick={() => setChipFilters([])}
              className="px-3 h-8 rounded-full text-xs font-medium text-red-600 hover:bg-red-100 flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid sm:grid-cols-3 gap-3 animate-fade-in">
            <Select
              label="Profession"
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-navy-900">Min wage (₹/day)</label>
              <input
                type="range"
                min={0}
                max={2000}
                step={50}
                value={minWage}
                onChange={(e) => setMinWage(Number(e.target.value))}
                className="h-2 bg-gray-200 rounded-full appearance-none accent-orange-600"
              />
              <div className="text-xs text-gray-600">≥ ₹{minWage}/day</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-navy-900">Max distance (km)</label>
              <input
                type="range"
                min={1}
                max={50}
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="h-2 bg-gray-200 rounded-full appearance-none accent-orange-600"
              />
              <div className="text-xs text-gray-600">≤ {maxDistance} km</div>
            </div>
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No jobs match these filters"
          description="Try expanding your search radius or removing one filter."
          cta={{
            label: "Reset filters",
            onClick: () => {
              setSearch("");
              setChipFilters([]);
              setMinWage(0);
              setMaxDistance(20);
              setProfession("all");
            },
          }}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <JobCard
              key={m.job.id}
              job={m.job}
              matchScore={m.matchScore}
              matchReasons={m.reasons}
              distanceKm={m.distanceKm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
