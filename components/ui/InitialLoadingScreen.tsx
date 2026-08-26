"use client";

import { Hammer } from "lucide-react";
import { Skeleton, MetricCardSkeleton, JobCardSkeleton } from "./Skeleton";

export function InitialLoadingScreen() {
  return (
    <div className="min-h-screen bg-cream-50 flex relative overflow-hidden">
      {/* Background Blurred Skeleton Layout (Matches App Shell) */}
      <div className="flex-1 flex filter blur-[3px] opacity-60 pointer-events-none select-none">
        {/* Sidebar Skeleton */}
        <aside className="hidden lg:flex flex-col w-60 xl:w-64 h-screen border-r border-gray-200 bg-white p-5 space-y-6">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2.5 w-10" />
            </div>
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-3 pt-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </aside>

        {/* TopBar + Content Skeleton */}
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-gray-200 bg-white/80 px-6 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>

            {/* Hero Card Skeleton */}
            <div className="bg-navy-900/10 border border-gray-200 rounded-card p-6 min-h-[140px] flex justify-between items-center">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-3.5 w-72" />
              </div>
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>

            {/* Metric Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>

            {/* Job Cards Skeleton */}
            <div className="grid md:grid-cols-2 gap-4">
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          </main>
        </div>
      </div>

      {/* Central Glassmorphic Brand Loader Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-cream-50/40 backdrop-blur-[4px]">
        <div className="bg-white/90 border border-gray-200/80 rounded-2xl shadow-elevated p-6 flex flex-col items-center gap-4 animate-scale-in">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/30 animate-pulse">
              <Hammer className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-orange-500/20 blur-md -z-10 animate-pulse" />
          </div>

          <div className="text-center space-y-1">
            <div className="text-lg font-bold text-navy-900 flex items-center justify-center gap-1">
              ShramSetu <span className="text-orange-600 text-xs font-semibold px-1.5 py-0.5 bg-orange-100 rounded">AI</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Loading your workspace…</p>
          </div>

          {/* Smooth Shimmer Progress Line */}
          <div className="w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
