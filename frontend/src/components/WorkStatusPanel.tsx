"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  X,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface ProjectStatus {
  project: string;
  label: string;
  stage: string;
  stage_label: string;
  date: string;
  total_tasks: number;
  done_tasks: number;
  pending_tasks: number;
  progress_pct: number;
  instructions: string[];
  pending_items: string[];
  completed_items: string[];
}

interface Summary {
  projects_with_instructions: number;
  total_tasks: number;
  done: number;
  pending: number;
  overall_progress: number;
}

interface WorkStatusPanelProps {
  open: boolean;
  onClose: () => void;
}

export function WorkStatusPanel({ open, onClose }: WorkStatusPanelProps) {
  const { t } = useLocale();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ summary: Summary; projects: ProjectStatus[] }>(
        "/api/work-status"
      );
      setSummary(res.summary);
      setProjects(res.projects);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const getProgressColor = (pct: number) => {
    if (pct === 100) return "bg-green-500";
    if (pct >= 75) return "bg-green-400";
    if (pct >= 50) return "bg-emerald-400";
    if (pct >= 25) return "bg-yellow-400";
    return "bg-orange-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative ml-auto w-[480px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-sm">{t("work.status")}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              title={t("action.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {summary.projects_with_instructions}
                </p>
                <p className="text-xs text-neutral-400">{t("work.projects")}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-neutral-900 dark:text-white">
                  {summary.total_tasks}
                </p>
                <p className="text-xs text-neutral-400">{t("work.total")}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {summary.done}
                </p>
                <p className="text-xs text-neutral-400">{t("work.done")}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {summary.pending}
                </p>
                <p className="text-xs text-neutral-400">{t("work.pendingLabel")}</p>
              </div>
            </div>
            {/* Overall progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>{t("work.overallProgress")}</span>
                <span className="font-medium">{summary.overall_progress}%</span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                {[25, 50, 75].map((q) => (
                  <div
                    key={q}
                    className="absolute top-0 bottom-0 w-px bg-neutral-300 dark:bg-neutral-500 z-10"
                    style={{ left: `${q}%` }}
                  />
                ))}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(summary.overall_progress)}`}
                  style={{ width: `${summary.overall_progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Project list */}
        <div className="flex-1 overflow-y-auto">
          {loading && !summary ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-30" />
              <p>{t("work.noActiveInstructions")}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {projects.map((proj) => {
                const isExpanded = expanded === proj.project;
                return (
                  <div key={`${proj.project}:${proj.date}`}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : proj.project)}
                      className="w-full px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        )}
                        <FolderOpen className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-white truncate flex-1">
                          {proj.label}
                        </span>
                        <span className="text-xs text-neutral-400 flex-shrink-0">
                          {proj.stage_label}
                        </span>
                      </div>

                      {/* Mini progress */}
                      <div className="flex items-center gap-2 ml-7">
                        <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getProgressColor(proj.progress_pct)}`}
                            style={{ width: `${proj.progress_pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-400 tabular-nums w-16 text-right">
                          {proj.done_tasks}/{proj.total_tasks} ({proj.progress_pct}%)
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-3 ml-7 space-y-2">
                        {/* Date */}
                        <div className="flex items-center gap-1 text-xs text-neutral-400">
                          <Clock className="w-3 h-3" />
                          {proj.date}
                        </div>

                        {/* Instructions */}
                        {proj.instructions.map((text, i) => (
                          <div
                            key={i}
                            className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2.5 text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap"
                          >
                            {text}
                          </div>
                        ))}

                        {/* Checklist */}
                        <div className="space-y-1">
                          {proj.completed_items.map((item, i) => (
                            <div
                              key={`d-${i}`}
                              className="flex items-center gap-1.5 text-xs text-neutral-400 line-through"
                            >
                              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                              {item}
                            </div>
                          ))}
                          {proj.pending_items.map((item, i) => (
                            <div
                              key={`p-${i}`}
                              className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
                            >
                              <Circle className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400">
          {projects.length} project{projects.length !== 1 ? "s" : ""} with active instructions
        </div>
      </div>
    </div>
  );
}
