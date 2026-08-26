"use client";

import { Skeleton, MetricCardSkeleton, JobCardSkeleton } from "./Skeleton";

export function InitialLoadingScreen() {
  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 h-screen sticky top-0 border-r border-gray-200 bg-white p-5 space-y-6">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>

        <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      </aside>

      {/* TopBar + Content Skeleton */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-gray-200 bg-white px-4 lg:px-8 flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-28 rounded-lg hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6 animate-fade-in">
          {/* Header row skeleton */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>

          {/* Hero Trust Card Skeleton */}
          <div className="bg-navy-900 rounded-card p-6 min-h-[160px] flex items-center justify-between border border-navy-900 shadow-soft">
            <div className="space-y-3 flex-1 max-w-md">
              <Skeleton className="h-3.5 w-28 bg-white/20" />
              <Skeleton className="h-6 w-60 bg-white/30" />
              <Skeleton className="h-4 w-72 bg-white/20" />
            </div>
            <div className="hidden sm:flex items-center justify-center">
              <Skeleton className="h-32 w-32 rounded-full bg-white/20" />
            </div>
          </div>

          {/* Metric Cards Skeleton Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>

          {/* Content Cards Skeleton Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <JobCardSkeleton />
            <JobCardSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
