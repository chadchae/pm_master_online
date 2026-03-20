"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface Issue {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  _project_name: string;
  _project_label: string;
  _project_type: string;
}

export default function IssuesDashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<{ issues: Issue[] }>("/api/issues/all")
      .then((data) => setIssues(data.issues || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Status counts
  const statusCount = (s: string) => issues.filter((i) => i.status === s).length;
  const openCount = statusCount("open");
  const inProgressCount = statusCount("in_progress");
  const resolvedCount = statusCount("resolved");
  const closedCount = statusCount("closed");

  // Group by type, then by project
  const typeOrder = ["\uc5f0\uad6c", "\uac1c\ubc1c", "\uc0ac\uc5c5", "\uac1c\uc778", "\uae30\ud0c0"];
  const normalizeType = (t: string) => {
    if (!t) return "\uae30\ud0c0";
    if (typeOrder.slice(0, 4).includes(t)) return t;
    return "\uae30\ud0c0";
  };

  // Build grouped structure: type -> project -> issues
  const grouped: Record<string, Record<string, Issue[]>> = {};
  for (const issue of issues) {
    const type = normalizeType(issue._project_type);
    if (!grouped[type]) grouped[type] = {};
    const projKey = issue._project_name;
    if (!grouped[type][projKey]) grouped[type][projKey] = [];
    grouped[type][projKey].push(issue);
  }

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const priorityColors: Record<string, string> = {
    critical: "text-red-600",
    high: "text-orange-500",
    medium: "text-yellow-500",
    low: "text-green-500",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Issues <span className="text-neutral-400 font-normal text-sm">({issues.length})</span>
          </h2>
        </div>
      </div>

      {/* Status summary */}
      <div className="flex gap-3">
        <div className="px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
          <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{openCount}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300">Open</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{inProgressCount}</p>
          <p className="text-xs text-amber-600 dark:text-amber-300">In Progress</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
          <p className="text-lg font-bold text-green-700 dark:text-green-400">{resolvedCount}</p>
          <p className="text-xs text-green-600 dark:text-green-300">Resolved</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-center">
          <p className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{closedCount}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Closed</p>
        </div>
      </div>

      {/* Grouped issues */}
      {issues.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No issues across projects</p>
        </div>
      ) : (
        <div className="space-y-3">
          {typeOrder.filter((type) => grouped[type]).map((type) => (
            <div key={type}>
              <button
                onClick={() => toggleCollapse(type)}
                className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2"
              >
                {collapsed.has(type) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {type}
                <span className="text-neutral-400 font-normal">
                  ({Object.values(grouped[type]).reduce((sum, arr) => sum + arr.length, 0)})
                </span>
              </button>
              {!collapsed.has(type) && (
                <div className="space-y-2 ml-6">
                  {Object.entries(grouped[type]).map(([projName, projIssues]) => {
                    const projLabel = projIssues[0]?._project_label || projName;
                    const projOpen = projIssues.filter((i) => i.status === "open").length;
                    const projInProg = projIssues.filter((i) => i.status === "in_progress").length;
                    const projResolved = projIssues.filter((i) => i.status === "resolved").length;
                    const projClosed = projIssues.filter((i) => i.status === "closed").length;
                    const isCollapsed = collapsed.has(`proj-${projName}`);
                    return (
                      <div key={projName} className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <button
                          onClick={() => toggleCollapse(`proj-${projName}`)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
                            <span className="text-sm font-medium text-neutral-900 dark:text-white">{projLabel}</span>
                            <span className="text-xs text-neutral-400">({projIssues.length})</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {projOpen > 0 && <span className="text-blue-600">{projOpen} open</span>}
                            {projInProg > 0 && <span className="text-amber-600">{projInProg} wip</span>}
                            {projResolved > 0 && <span className="text-green-600">{projResolved} done</span>}
                            {projClosed > 0 && <span className="text-neutral-400">{projClosed} closed</span>}
                          </div>
                        </button>
                        {!isCollapsed && (
                          <div className="border-t border-neutral-100 dark:border-neutral-800">
                            {projIssues.map((issue) => (
                              <div
                                key={issue.id}
                                onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(projName)}?tab=issues`)}
                                className="flex items-center justify-between px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer text-sm border-b border-neutral-50 dark:border-neutral-800/50 last:border-0"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusColors[issue.status] || statusColors.open}`}>
                                    {issue.status === "in_progress" ? "wip" : issue.status}
                                  </span>
                                  <span className="truncate text-neutral-800 dark:text-neutral-200">{issue.title}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                  {issue.priority && (
                                    <span className={`text-xs ${priorityColors[issue.priority] || ""}`}>{issue.priority}</span>
                                  )}
                                  <span className="text-xs text-neutral-400">{issue.created_at?.split("T")[0]}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
