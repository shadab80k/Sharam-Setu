"use client";

import Link from "next/link";
import { Card } from "../ui/Card";
import { Badge, StatusBadge } from "../ui/Badge";
import { MapPin, Star, Shield, Briefcase, Bookmark, ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import type { Job, ContractorProfile } from "@/lib/types";
import { useStore } from "@/lib/store";

interface JobCardProps {
  job: Job;
  matchScore?: number;
  matchReasons?: string[];
  distanceKm?: number;
  href?: string;
  showActions?: boolean;
  onSave?: () => void;
}

export function JobCard({ job, matchScore, matchReasons, distanceKm, href, showActions, onSave }: JobCardProps) {
  const contractor = useStore((s) => s.contractorProfiles.find((c) => c.userId === job.contractorId));
  const user = useStore((s) => s.users.find((u) => u.id === job.contractorId));

  return (
    <Card className="p-5 hover:shadow-elevated transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="orange">{job.category}</Badge>
            {matchScore !== undefined && (
              <Badge variant="green" iconLeft={<Star className="h-3 w-3" />}>
                {matchScore}% Match
              </Badge>
            )}
          </div>
          <Link href={href ?? `/worker/jobs/${job.id}`}>
            <h3 className="text-base font-semibold text-navy-900 hover:text-orange-600 transition">{job.title}</h3>
          </Link>
          <p className="text-sm text-gray-700 mt-0.5">{user?.name ?? "Contractor"}</p>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location}
              {distanceKm !== undefined && <span>· {distanceKm} km</span>}
            </span>
            {contractor && (
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5 text-green-600" /> Trust {contractor.trustScore}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-600" />
              {contractor?.rating.toFixed(1) ?? "—"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-navy-900">₹{job.wagePerDay}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">per day</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.requiredSkills.slice(0, 3).map((s) => (
          <span key={s} className="px-2 py-0.5 rounded-md bg-cream-100 text-gray-700 text-xs">
            {s}
          </span>
        ))}
      </div>

      {matchReasons && matchReasons.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-green-100 border border-green-100">
          <div className="text-[10px] uppercase tracking-wider text-green-600 font-semibold mb-1.5">
            Why this matches you
          </div>
          <ul className="space-y-1">
            {matchReasons.slice(0, 3).map((r) => (
              <li key={r} className="text-xs text-navy-900 flex items-start gap-1.5">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Briefcase className="h-3.5 w-3.5" />
          <span>{job.workersNeeded} workers · {job.paymentFrequency}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {showActions && (
            <Button variant="ghost" size="sm" onClick={onSave}>
              <Bookmark className="h-4 w-4" />
            </Button>
          )}
          <Link href={href ?? `/worker/jobs/${job.id}`}>
            <Button variant="primary" size="sm" iconRight={<ArrowRight className="h-3.5 w-3.5" />}>
              View Job
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
