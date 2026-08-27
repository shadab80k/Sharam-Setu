"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200/90",
        className
      )}
      {...props}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-5 shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-5 shadow-soft space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-6 w-20 ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      <div className="pt-2 flex items-center justify-between border-t border-gray-100">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function WorkerCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-card p-5 shadow-soft space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg bg-cream-100/50">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 text-right">
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-4 w-12 ml-auto" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Hero Banner skeleton */}
      <div className="bg-navy-900/10 border border-navy-900/10 rounded-card p-6 min-h-[160px] flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-28 w-28 rounded-full hidden sm:block" />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-card overflow-hidden shadow-soft">
      <div className="p-4 border-b border-gray-200 flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
