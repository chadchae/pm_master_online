"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Clock, FolderOpen, MessageSquare, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

interface DiscussionEntry {
  project_name: string;
  date: string;
  title: string;
  time: string;
  topic: string;
}

// Group discussions by YYYY-MM
function groupByMonth(discussions: DiscussionEntry[]): Record<string, DiscussionEntry[]> {
  const groups: Record<string, DiscussionEntry[]> = {};
  for (const d of discussions) {
    const month = d.date.slice(0, 7); // YYYY-MM
    if (!groups[month]) groups[month] = [];
    groups[month].push(d);
  }
  return groups;
}

// Format YYYY-MM to readable month label
function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const idx = parseInt(month, 10) - 1;
  return `${months[idx] || month} ${year}`;
}

export default function TimelinePage() {
  const { t } = useLocale();
  const router = useRouter();
  const [discussions, setDiscussions] = useState<DiscussionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ discussions: DiscussionEntry[] }>(
        "/api/discussions/timeline"
      );
      setDiscussions(data.discussions || []);
    } catch {
      toast.error(t("toast.failedToLoadData"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (discussions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-400 gap-3">
        <Clock className="w-10 h-10" />
        <p className="text-sm">{t("timeline.noDiscussions")}</p>
      </div>
    );
  }

  const grouped = groupByMonth(discussions);
  const months = Object.keys(grouped).sort().reverse();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-500" />
        {t("timeline.title")}
      </h1>

      {months.map((month) => (
        <div key={month}>
          {/* Month header */}
          <div className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 py-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {formatMonth(month)}
            </span>
          </div>

          {/* Vertical timeline */}
          <div className="relative border-l-2 border-indigo-200 dark:border-indigo-800 ml-3 space-y-4">
            {grouped[month].map((entry, idx) => (
              <div key={`${entry.date}-${idx}`} className="relative pl-6">
                {/* Timeline dot */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-neutral-950" />

                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-sm transition-shadow">
                  {/* Date */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-neutral-900 dark:text-white">
                      {entry.date}
                    </span>
                    {entry.time && (
                      <span className="text-xs text-neutral-400">{entry.time}</span>
                    )}
                  </div>

                  {/* Project badge */}
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/projects/${encodeURIComponent(entry.project_name)}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors mb-2"
                  >
                    <FolderOpen className="w-3 h-3" />
                    {entry.project_name}
                  </button>

                  {/* Title */}
                  {entry.title && (
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {entry.title}
                    </p>
                  )}

                  {/* Topic */}
                  {entry.topic && (
                    <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      <MessageSquare className="w-3 h-3" />
                      {entry.topic}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
