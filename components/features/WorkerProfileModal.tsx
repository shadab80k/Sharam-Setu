"use client";

import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TrustRing } from "@/components/ui/TrustRing";
import {
  Star,
  MapPin,
  CheckCircle2,
  Phone,
  Briefcase,
  Award,
  Wallet,
} from "lucide-react";
import type { User, WorkerProfile } from "@/lib/types";
import { useStore } from "@/lib/store";

interface WorkerProfileModalProps {
  open: boolean;
  onClose: () => void;
  worker: WorkerProfile | null;
  user: User | null;
  matchScore?: number;
  matchReasons?: string[];
  onShortlist?: (workerId: string) => void;
  onHire?: (workerId: string) => void;
}

const AVAILABILITY_COPY: Record<WorkerProfile["availability"], { label: string; className: string }> = {
  available: { label: "Immediate", className: "text-green-600" },
  working: { label: "Currently working", className: "text-amber-600" },
  unavailable: { label: "Unavailable", className: "text-red-600" },
};

export function WorkerProfileModal({
  open,
  onClose,
  worker,
  user,
  matchScore,
  matchReasons,
  onShortlist,
  onHire,
}: WorkerProfileModalProps) {
  const verifications = useStore((s) => s.verifications);

  if (!worker || !user) return null;

  const workerVerifications = verifications.filter((v) => v.userId === worker.userId);
  const identityVerification = workerVerifications.find((v) => v.type === "identity");
  const verifiedCount = workerVerifications.filter((v) => v.status === "verified").length;

  const identityStatus =
    identityVerification?.status === "verified"
      ? { label: "✓ Verified", className: "text-green-600" }
      : identityVerification?.status === "pending"
        ? { label: "Pending review", className: "text-amber-600" }
        : identityVerification?.status === "rejected"
          ? { label: "Rejected", className: "text-red-600" }
          : { label: "Not submitted", className: "text-gray-500" };

  const availability = AVAILABILITY_COPY[worker.availability];

  return (
    <Modal open={open} onClose={onClose} title="Worker Profile" size="lg">
      <div className="space-y-5">
        {/* Header Profile Section */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-cream-50 border border-gray-200">
          <Avatar src={user.avatar} name={user.name} size={64} className="border-2 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-navy-900">{user.name}</h3>
              {identityVerification?.status === "verified" ? (
                <Badge variant="green" size="sm" iconLeft={<CheckCircle2 className="h-3 w-3" />}>
                  ID Verified
                </Badge>
              ) : verifiedCount > 0 ? (
                <Badge variant="gray" size="sm">
                  {verifiedCount} verification{verifiedCount > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="gray" size="sm">
                  Unverified
                </Badge>
              )}
              {matchScore !== undefined && (
                <Badge variant="orange" size="sm">
                  {matchScore}% Match
                </Badge>
              )}
            </div>

            <p className="text-sm font-semibold text-orange-600 mt-0.5">
              {worker.profession} · {worker.experienceYears} Years Experience
            </p>

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-gray-500" /> {user.location}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> {worker.rating.toFixed(1)} / 5.0
              </span>
              <span className="flex items-center gap-1 font-medium text-navy-900">
                <Wallet className="h-3.5 w-3.5 text-green-600" /> ₹{worker.expectedDailyWage}/day
              </span>
            </div>
          </div>
        </div>

        {/* Match Reasons (if available) */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-blue-600" /> Why this worker matches your job:
            </div>
            <div className="grid sm:grid-cols-2 gap-1">
              {matchReasons.map((r, i) => (
                <div key={i} className="text-xs text-blue-800 flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">✓</span> {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two Column Breakdown: Trust & Skills */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Trust Score Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-gray-600 font-medium">Identity Trust Score</div>
                <div className="text-xl font-bold text-navy-900">{worker.trustScore}/100</div>
                <div className="text-xs text-green-600 font-semibold">{worker.trustLabel}</div>
              </div>
              <TrustRing score={worker.trustScore} size={64} showLabel={false} />
            </div>
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Profile Completion</span>
                <span className="font-semibold text-navy-900">{worker.profileCompletion}%</span>
              </div>
              <div className="flex justify-between">
                <span>Identity Verification</span>
                <span className={`font-semibold ${identityStatus.className}`}>{identityStatus.label}</span>
              </div>
            </div>
          </div>

          {/* Skills & Experience */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
            <div className="text-xs text-gray-600 font-medium flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5 text-gray-500" /> Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {worker.skills.length > 0 ? (
                worker.skills.map((s) => (
                  <Badge key={s} variant="default" size="sm">
                    {s}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-gray-500">No skills added yet</span>
              )}
            </div>
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 flex justify-between">
              <span>Availability</span>
              <span className={`font-semibold ${availability.className}`}>{availability.label}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-200 flex-wrap">
          <a
            href={`tel:+91${user.phone}`}
            className="inline-flex items-center justify-center h-10 px-4 text-sm rounded-lg gap-2 font-medium transition focus-ring bg-white text-navy-900 border border-gray-300 hover:bg-gray-100"
          >
            <Phone className="h-4 w-4" /> Call {user.phone}
          </a>
          <div className="flex-1" />
          {onShortlist && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                onShortlist(worker.userId);
                onClose();
              }}
            >
              Shortlist
            </Button>
          )}
          {onHire && (
            <Button
              variant="primary"
              size="md"
              disabled={worker.availability === "unavailable"}
              onClick={() => {
                onHire(worker.userId);
                onClose();
              }}
            >
              Hire Worker
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
