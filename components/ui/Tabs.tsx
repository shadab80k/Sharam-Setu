"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; icon?: React.ReactNode }[];
  className?: string;
}

export function Tabs({ value, onChange, items, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-gray-200 overflow-x-auto", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "px-4 h-10 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5",
            value === item.value
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-600 hover:text-navy-900"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
