"use client";

import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  cta?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

export function EmptyState({ title, description, icon, cta, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6", className)}>
      <div className="h-14 w-14 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mb-4">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-600 max-w-sm">{description}</p>}
      {cta && (
        <div className="mt-4">
          <Button onClick={cta.onClick}>{cta.label}</Button>
        </div>
      )}
    </div>
  );
}
