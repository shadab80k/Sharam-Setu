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

export function TrustRing({
  score,
  size = 140,
  label,
  showLabel = true,
  className,
  trend,
}: TrustRingProps) {
  // Proportional stroke width based on size
  const strokeWidth = size >= 140 ? 10 : size >= 100 ? 8 : size >= 70 ? 6 : 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = trustColor(score);

  // Size tiers for responsive inner content
  const isLarge = size >= 130;
  const isMedium = size >= 90 && size < 130;
  const isSmall = size >= 65 && size < 90;
  const isCompact = size < 65;

  return (
    <div className={cn("flex flex-col items-center justify-center select-none", className)}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 block overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EAECF0"
            strokeWidth={strokeWidth}
          />
          {/* Colored Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Responsive Centered Score Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-1">
          {isLarge && (
            <>
              <div className="flex items-center gap-1.5" style={{ color }}>
                <ShieldCheck className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-3xl font-bold leading-none">{score}</span>
              </div>
              <span className="text-xs text-gray-500 mt-1 font-medium">/ 100</span>
            </>
          )}

          {isMedium && (
            <>
              <div className="flex items-center gap-1" style={{ color }}>
                <ShieldCheck className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-xl font-bold leading-none">{score}</span>
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5 font-medium">/ 100</span>
            </>
          )}

          {isSmall && (
            <div className="flex flex-col items-center justify-center" style={{ color }}>
              <div className="flex items-center gap-0.5">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-bold leading-none">{score}</span>
              </div>
            </div>
          )}

          {isCompact && (
            <div className="flex items-center justify-center font-bold text-xs leading-none" style={{ color }}>
              <span>{score}</span>
            </div>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-3 text-center">
          <div className="text-sm font-semibold" style={{ color }}>
            {label ??
              (score >= 90
                ? "Excellent Trust"
                : score >= 75
                ? "High Trust"
                : score >= 60
                ? "Trusted"
                : score >= 40
                ? "Building Trust"
                : "Low Trust")}
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
