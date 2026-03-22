"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project } from "@/lib/api";
import { Loader2, BarChart3, Tag, Calendar, FolderOpen, ArrowUpDown, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

interface ProjectSummary {
  todo: { total: number; todo: number; in_progress: number; done: number; progress_pct: number };
  issues: { total: number; open: number; resolved: number; critical: number };
  schedule: { total: number; planned: number; in_progress: number; done: number; overdue: number };
  subtasks: { total: number; done: number; pending: number; cancelled: number };
}

interface ProjectWithSummary {
  project: Project;
  summary: ProjectSummary | null;
}

const ALL_STAGES = [
  { key: "1_idea_stage", label: "Idea" },
  { key: "2_initiation_stage", label: "Initiation" },
  { key: "3_in_development", label: "Development" },
  { key: "4_in_testing", label: "Testing" },
  { key: "5_completed", label: "Completed" },
  { key: "6_archived", label: "Archived" },
];

export default function StatusPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<ProjectWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  type SortKey = "label" | "progress" | "todo" | "issues" | "schedule";
  const [sortKey, setSortKey] = useState<SortKey>("label");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [stageFilters, setStageFilters] = useState<Set<string>>(new Set(["2_initiation_stage", "3_in_development", "4_in_testing"]));
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [allTypes, setAllTypes] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ projects: Project[] }>("/api/projects");
      const seen = new Set<string>();
      const allProjects = (res.projects || []).filter((p) => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });

      // Extract unique types
      const types = [...new Set(allProjects.map((p) => p.metadata?.유형 || "").filter(Boolean))].sort();
      setAllTypes(types);

      // Fetch summaries in parallel
      const withSummaries = await Promise.all(
        allProjects.map(async (project) => {
          try {
            const summary = await apiFetch<ProjectSummary>(
              `/api/projects/${encodeURIComponent(project.name)}/summary`
            );
            return { project, summary };
          } catch {
            return { project, summary: null };
          }
        })
      );

      setItems(withSummaries);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(({ project }) => {
    if (stageFilters.size > 0 && !stageFilters.has(project.stage)) return false;
    if (typeFilters.size > 0) {
      const pType = project.metadata?.유형 || "";
      if (!typeFilters.has(pType)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          {t("sidebar.status")}
          <span className="text-sm font-normal text-neutral-400">({filtered.length})</span>
        </h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${showFilters ? "bg-indigo-600 text-white border-indigo-600" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300"}`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
          {/* Stage filters */}
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Stage</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STAGES.map((s) => (
                <label key={s.key} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stageFilters.has(s.key)}
                    onChange={() => {
                      setStageFilters((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.key)) next.delete(s.key); else next.add(s.key);
                        return next;
                      });
                    }}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {s.label}
                </label>
              ))}
              <button onClick={() => setStageFilters(new Set(ALL_STAGES.map((s) => s.key)))} className="text-[10px] text-indigo-500 hover:text-indigo-600 ml-2">All</button>
              <button onClick={() => setStageFilters(new Set())} className="text-[10px] text-neutral-400 hover:text-neutral-600">None</button>
            </div>
          </div>

          {/* Type filters */}
          {allTypes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Type</p>
              <div className="flex flex-wrap gap-2">
                {allTypes.map((tp) => (
                  <label key={tp} className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={typeFilters.size === 0 || typeFilters.has(tp)}
                      onChange={() => {
                        setTypeFilters((prev) => {
                          if (prev.size === 0) {
                            // First click: select only this type
                            return new Set([tp]);
                          }
                          const next = new Set(prev);
                          if (next.has(tp)) next.delete(tp); else next.add(tp);
                          if (next.size === 0) return new Set(); // empty = show all
                          return next;
                        });
                      }}
                      className="w-3.5 h-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {tp}
                  </label>
                ))}
                <button onClick={() => setTypeFilters(new Set())} className="text-[10px] text-indigo-500 hover:text-indigo-600 ml-2">All</button>
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-3">
          <BarChart3 className="w-10 h-10 opacity-30" />
          <p className="text-sm">No projects match filters</p>
        </div>
      )}

      {/* Sort buttons */}
      {filtered.length > 0 && (() => {
        const toggleSort = (key: SortKey) => {
          if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          } else {
            setSortKey(key);
            setSortDir("desc");
          }
        };
        const btn = (key: SortKey, label: string) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors flex items-center gap-1 ${
              sortKey === key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300"
            }`}
          >
            {label}
            {sortKey === key && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
          </button>
        );
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-400 mr-1"><ArrowUpDown className="w-3.5 h-3.5 inline" /> Sort:</span>
            {btn("label", t("subtask.title"))}
            {btn("progress", t("subtask.progress"))}
            {btn("todo", t("todo.title"))}
            {btn("issues", t("issues.title"))}
            {btn("schedule", t("schedule.title"))}
          </div>
        );
      })()}

      <div className="space-y-3">
        {[...filtered].sort((a, b) => {
          let va = 0, vb = 0;
          switch (sortKey) {
            case "label":
              const la = (a.project.metadata?.label || a.project.name).toLowerCase();
              const lb = (b.project.metadata?.label || b.project.name).toLowerCase();
              return sortDir === "asc" ? la.localeCompare(lb) : lb.localeCompare(la);
            case "progress":
              va = a.summary && a.summary.subtasks.total > 0 ? a.summary.subtasks.done / a.summary.subtasks.total : -1;
              vb = b.summary && b.summary.subtasks.total > 0 ? b.summary.subtasks.done / b.summary.subtasks.total : -1;
              break;
            case "todo":
              va = a.summary ? a.summary.todo.progress_pct : -1;
              vb = b.summary ? b.summary.todo.progress_pct : -1;
              break;
            case "issues":
              va = a.summary ? a.summary.issues.open : 0;
              vb = b.summary ? b.summary.issues.open : 0;
              break;
            case "schedule":
              va = a.summary && a.summary.schedule.total > 0 ? a.summary.schedule.done / a.summary.schedule.total : -1;
              vb = b.summary && b.summary.schedule.total > 0 ? b.summary.schedule.done / b.summary.schedule.total : -1;
              break;
          }
          return sortDir === "asc" ? va - vb : vb - va;
        }).map(({ project, summary }) => {
          const stage = getStageByFolder(project.stage);
          const subtaskPct = summary && summary.subtasks.total > 0
            ? Math.round(summary.subtasks.done / summary.subtasks.total * 100)
            : null;

          return (
            <div
              key={project.name}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                {/* Project info */}
                <div className="min-w-0 flex-shrink-0 w-[280px]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`)}
                      className="text-base font-semibold text-neutral-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate transition-colors"
                    >
                      {project.metadata?.label || project.name}
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate mt-0.5">{project.path}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                      {stage?.label || project.stage}
                    </span>
                    {project.metadata?.유형 && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5">
                        <Tag className="w-3 h-3" />{project.metadata.유형}
                      </span>
                    )}
                    {project.metadata?.작성일 && (
                      <span className="text-[11px] text-neutral-400 flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" />{project.metadata.작성일}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {subtaskPct !== null ? (
                  <div className="flex-1 min-w-0">
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 h-full flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 text-left">
                          {t("subtask.progress")} {summary!.subtasks.done}/{summary!.subtasks.total}
                        </p>
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{subtaskPct}%</span>
                      </div>
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${subtaskPct}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* Summary widgets */}
                {summary && (
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Todo */}
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2.5 min-w-[100px] text-center">
                      <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">{t("todo.title")}</p>
                      <p className="text-base font-bold text-neutral-900 dark:text-white">{summary.todo.done}/{summary.todo.total}</p>
                      <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.todo.progress_pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                        <span>{summary.todo.todo} todo</span>
                        <span>{summary.todo.in_progress} wip</span>
                      </div>
                    </div>

                    {/* Issues */}
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2.5 min-w-[100px] text-center">
                      <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">{t("issues.title")}</p>
                      <p className={`text-base font-bold ${summary.issues.critical > 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}>
                        {summary.issues.open}/{summary.issues.total}
                      </p>
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                        <span>{summary.issues.open} open</span>
                        <span>{summary.issues.resolved} done</span>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2.5 min-w-[100px] text-center">
                      <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">{t("schedule.title")}</p>
                      <p className="text-base font-bold text-neutral-900 dark:text-white">{summary.schedule.done}/{summary.schedule.total}</p>
                      <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.schedule.total > 0 ? Math.round(summary.schedule.done / summary.schedule.total * 100) : 0}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                        <span>{summary.schedule.in_progress} wip</span>
                        <span>{summary.schedule.overdue > 0 ? <span className="text-red-500">{summary.schedule.overdue} late</span> : `${summary.schedule.planned} plan`}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
