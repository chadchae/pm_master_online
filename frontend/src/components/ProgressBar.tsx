"use client";

import { ProjectMetadata } from "@/lib/api";

interface ProgressBarProps {
  metadata: ProjectMetadata;
  compact?: boolean;
}

export function ProgressBar({ metadata, compact = false }: ProgressBarProps) {
  const total = parseInt(metadata?.subtasks_total || "0", 10);
  const done = parseInt(metadata?.subtasks_done || "0", 10);

  if (total <= 0) return null;

  const pct = Math.min(100, Math.round((done / total) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
          {/* Quarter marks */}
          <div className="absolute inset-0 flex">
            {[25, 50, 75].map((q) => (
              <div
                key={q}
                className="absolute top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-600"
                style={{ left: `${q}%` }}
              />
            ))}
          </div>
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
          {done}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Subtasks: {done}/{total} completed
        </span>
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {pct}%
        </span>
      </div>
      <div className="h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
        {/* Quarter marks */}
        {[25, 50, 75].map((q) => (
          <div
            key={q}
            className="absolute top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-500 z-10"
            style={{ left: `${q}%` }}
          />
        ))}
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100
              ? "bg-green-500"
              : pct >= 75
              ? "bg-green-400"
              : pct >= 50
              ? "bg-emerald-400"
              : pct >= 25
              ? "bg-yellow-400"
              : "bg-orange-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-neutral-400">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
