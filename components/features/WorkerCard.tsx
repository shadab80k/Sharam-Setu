"use client";

import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { TrustRing } from "../ui/TrustRing";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { MapPin, Star, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";
import Link from "next/link";

interface WorkerCardProps {
  workerId: string;
  matchScore?: number;
  matchReasons?: string[];
  onAction?: (action: "shortlist" | "contact" | "hire" | "view") => void;
}

export function WorkerCard({ workerId, matchScore, matchReasons, onAction }: WorkerCardProps) {
  const worker = useStore((s) => s.users.find((u) => u.id === workerId));
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === workerId));
  if (!worker || !profile) return null;

  return (
    <Card className="p-5 hover:shadow-elevated transition">
      <div className="flex items-start gap-3">
        <Avatar src={worker.avatar} name={worker.name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-navy-900">{worker.name}</h3>
            {profile.profileCompletion > 80 && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
          </div>
          <p className="text-xs text-gray-700 mt-0.5">
            {profile.profession} · {profile.experienceYears} yrs
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {worker.location}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-600" /> {profile.rating.toFixed(1)}
            </span>
            <span className="text-gray-700">₹{profile.expectedDailyWage}/day</span>
          </div>
        </div>
        {matchScore !== undefined && (
          <div className="text-right">
            <div className="text-xl font-bold text-orange-600">{matchScore}%</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Match</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-cream-100/60 border border-gray-100">
        <TrustRing score={profile.trustScore} size={52} showLabel={false} />
        <div className="text-right">
          <div className="text-[11px] text-gray-600">Trust Score</div>
          <div className="text-sm font-bold text-navy-900">{profile.trustScore}/100</div>
          <div className="text-[10px] text-gray-500">{profile.trustLabel}</div>
        </div>
      </div>

      {matchReasons && matchReasons.length > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-blue-100">
          <ul className="space-y-0.5">
            {matchReasons.slice(0, 2).map((r) => (
              <li key={r} className="text-[11px] text-navy-900 flex items-start gap-1.5">
                <span className="text-blue-600 mt-0.5">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {profile.skills.slice(0, 3).map((s) => (
          <Badge key={s} variant="default">{s}</Badge>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        <Button variant="secondary" size="sm" fullWidth onClick={() => onAction?.("shortlist")}>
          Shortlist
        </Button>
        <Button variant="primary" size="sm" fullWidth onClick={() => onAction?.("hire")}>
          Hire
        </Button>
      </div>
    </Card>
  );
}
