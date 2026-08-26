"use client";

import { cn, trustColor } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

interface TrustRingProps {
  score: number;
  size?: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
  trend?: number;
}

export function TrustRing({ score, size = 140, label, showLabel = true, className, trend }: TrustRingProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = trustColor(score);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F2F4F7"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5" style={{ color }}>
            <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-3xl font-bold leading-none" style={{ color }}>
              {score}
            </span>
          </div>
          <span className="text-xs text-gray-500 mt-1">/ 100</span>
        </div>
      </div>
      {showLabel && (
        <div className="mt-3 text-center">
          <div className="text-sm font-semibold" style={{ color }}>
            {label ?? (score >= 90 ? "Excellent Trust" : score >= 75 ? "High Trust" : score >= 60 ? "Trusted" : score >= 40 ? "Building Trust" : "Low Trust")}
          </div>
          {trend !== undefined && (
            <div className="text-xs text-gray-600 mt-0.5">
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)} points this month
            </div>
          )}
        </div>
      )}
    </div>
  );
}
