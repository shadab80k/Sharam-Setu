"use client";

import { Card } from "./Card";
import { cn, formatINRShort } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  hint?: string;
  tone?: "default" | "green" | "blue" | "purple" | "orange" | "navy" | "red" | "amber";
  className?: string;
}

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "bg-gray-100 text-gray-700",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
  navy: "bg-navy-900/5 text-navy-900",
  red: "bg-red-100 text-red-600",
  amber: "bg-amber-100 text-amber-600",
};

export function MetricCard({ label, value, icon, trend, hint, tone = "default", className }: MetricCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label">{label}</p>
          <p className="mt-2 text-2xl font-bold text-navy-900 leading-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
        </div>
        {icon && (
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", toneClass[tone])}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend.positive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
          )}
          <span className={cn("font-medium", trend.positive ? "text-green-600" : "text-red-600")}>
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-gray-600">vs last month</span>
        </div>
      )}
    </Card>
  );
}
