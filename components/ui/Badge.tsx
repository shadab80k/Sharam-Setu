"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Variant = "default" | "green" | "blue" | "purple" | "red" | "amber" | "navy" | "orange" | "gray";

const variantClass: Record<Variant, string> = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  green: "bg-green-100 text-green-600 border-green-100",
  blue: "bg-blue-100 text-blue-600 border-blue-100",
  purple: "bg-purple-100 text-purple-600 border-purple-100",
  red: "bg-red-100 text-red-600 border-red-100",
  amber: "bg-amber-100 text-amber-600 border-amber-100",
  navy: "bg-navy-900/5 text-navy-900 border-navy-900/10",
  orange: "bg-orange-100 text-orange-600 border-orange-100",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  iconLeft?: React.ReactNode;
  size?: "sm" | "md";
}

export function Badge({ variant = "default", size = "sm", iconLeft, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        variantClass[variant],
        className
      )}
      {...rest}
    >
      {iconLeft}
      {children}
    </span>
  );
}

interface StatusDotProps {
  status: string;
}

export function StatusBadge({ status }: StatusDotProps) {
  const map: Record<string, { variant: Variant; label: string }> = {
    active: { variant: "green", label: "Active" },
    paid: { variant: "green", label: "Paid" },
    pending: { variant: "amber", label: "Pending" },
    due: { variant: "amber", label: "Due" },
    overdue: { variant: "red", label: "Overdue" },
    completed: { variant: "navy", label: "Completed" },
    closed: { variant: "gray", label: "Closed" },
    draft: { variant: "gray", label: "Draft" },
    applied: { variant: "blue", label: "Applied" },
    viewed: { variant: "blue", label: "Viewed" },
    shortlisted: { variant: "purple", label: "Shortlisted" },
    selected: { variant: "green", label: "Selected" },
    rejected: { variant: "red", label: "Rejected" },
    interview: { variant: "purple", label: "Interview" },
    suspended: { variant: "red", label: "Suspended" },
  };
  const { variant, label } = map[status] || { variant: "default" as Variant, label: status };
  return <Badge variant={variant}>{label}</Badge>;
}
