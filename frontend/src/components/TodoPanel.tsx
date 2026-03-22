"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, Project } from "@/lib/api";
import {
  X,
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ListTodo,
  Star,
  Calendar,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import toast from "react-hot-toast";

interface TodoItem {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: string;
  assignee: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
  order: number;
  starred?: boolean;
}

interface ProjectTodos {
  project: string;
  label: string;
  location: string;
  items: TodoItem[];
}

interface TodoPanelProps {
  open: boolean;
  onClose: () => void;
}

const PIN = "pm-master-local";

export function TodoPanel({ open, onClose }: TodoPanelProps) {
  const { t } = useLocale();
  const [projectTodos, setProjectTodos] = useState<ProjectTodos[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState(PIN);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todosRes, projRes] = await Promise.all([
        apiFetch<{ projects: ProjectTodos[] }>("/api/todos/all"),
        apiFetch<{ projects: Project[] }>("/api/projects"),
      ]);
      setProjectTodos(todosRes.projects);
      // Deduplicate by name, keep first occurrence
      const seen = new Set<string>();
      const deduped = (projRes.projects || []).filter((p) => {
        if (seen.has(p.name)) return false;
        if (p.stage === "7_discarded") return false;
        seen.add(p.name);
        return true;
      });
      // Sort: pinned first, then alphabetical by label
      deduped.sort((a, b) => {
        if (a.name === PIN) return -1;
        if (b.name === PIN) return 1;
        return (a.metadata?.label || a.name).localeCompare(b.metadata?.label || b.name);
      });
      setAllProjects(deduped);
      // Auto-expand all projects on first load
      if (Object.keys(expanded).length === 0 && todosRes.projects.length > 0) {
        const exp: Record<string, boolean> = {};
        todosRes.projects.forEach((p) => {
          exp[p.project] = true;
        });
        setExpanded(exp);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setExpanded({});
    }
  }, [open, load]);

  const toggleDone = async (project: string, todoId: string) => {
    setProjectTodos((prev) =>
      prev
        .map((p) => {
          if (p.project !== project) return p;
          return { ...p, items: p.items.filter((i) => i.id !== todoId) };
        })
        .filter((p) => p.items.length > 0)
    );

    try {
      await apiFetch(`/api/projects/${project}/todos/${todoId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column: "done", order: 0 }),
      });
      toast.success("Done!");
    } catch {
      toast.error("Failed to update todo");
      load();
    }
  };

  const toggleStar = async (project: string, todoId: string, starred: boolean) => {
    // Optimistic update
    setProjectTodos((prev) =>
      prev.map((p) => {
        if (p.project !== project) return p;
        return { ...p, items: p.items.map((i) => i.id === todoId ? { ...i, starred } : i) };
      })
    );
    try {
      await apiFetch(`/api/projects/${project}/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred }),
      });
    } catch {
      toast.error("Failed to update");
      load();
    }
  };

  const addTodo = async () => {
    if (!newTitle.trim() || !newProject) return;
    setAdding(true);
    try {
      await apiFetch(`/api/projects/${newProject}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          column: "todo",
          priority: "medium",
        }),
      });
      setNewTitle("");
      toast.success("Todo added");
      load();
    } catch {
      toast.error("Failed to add todo");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addTodo();
    }
  };

  const toggleExpand = (project: string) => {
    setExpanded((prev) => ({ ...prev, [project]: !prev[project] }));
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium">
            high
          </span>
        );
      case "low":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 font-medium">
            low
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-medium">
            med
          </span>
        );
    }
  };

  const totalItems = projectTodos.reduce((sum, p) => sum + p.items.length, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative ml-auto w-[420px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-purple-500" />
            <span className="font-semibold text-sm">{t("sidebar.todo")}</span>
            {totalItems > 0 && (
              <span className="text-xs text-neutral-400 ml-1">
                ({totalItems})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              disabled={loading}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              title="Refresh"
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

        {/* Quick add */}
        <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 space-y-2">
          <select
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            className="w-full text-sm px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            {allProjects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.metadata?.label || p.name}
                {p.metadata?.label && p.metadata.label !== p.name ? ` (${p.name})` : ""}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="New todo..."
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
            <button
              onClick={addTodo}
              disabled={adding || !newTitle.trim() || !newProject}
              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto">
          {loading && projectTodos.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : projectTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-30" />
              <p>No pending todos</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {projectTodos.map((proj) => {
                const isExpanded = expanded[proj.project] !== false;
                return (
                  <div key={proj.project} className={proj.project === PIN ? "border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50/30 dark:bg-amber-950/10" : ""}>
                    <button
                      onClick={() => toggleExpand(proj.project)}
                      className="w-full px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1 flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                              {proj.label || proj.project}
                            </span>
                            <span className="text-xs text-neutral-400 flex-shrink-0">
                              ({proj.items.length})
                            </span>
                          </div>
                          {proj.location && (
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate font-mono mt-0.5">
                              {proj.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="pb-2">
                        {proj.items.map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-center gap-1.5 px-4 py-1.5 ml-4 group"
                          >
                            <button
                              onClick={() => toggleStar(proj.project, todo.id, !todo.starred)}
                              className={`flex-shrink-0 transition-colors ${todo.starred ? "text-amber-400" : "text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"}`}
                              title={todo.starred ? "Unstar" : "Star"}
                            >
                              <Star className={`w-3.5 h-3.5 ${todo.starred ? "fill-current" : ""}`} />
                            </button>
                            <button
                              onClick={() => toggleDone(proj.project, todo.id)}
                              className="flex-shrink-0 text-neutral-400 hover:text-green-500 transition-colors"
                              title="Mark done"
                            >
                              <Circle className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-neutral-700 dark:text-neutral-300 flex-1 truncate">
                              {todo.title}
                            </span>
                            {todo.due_date && (
                              <span className="text-[10px] text-neutral-400 flex-shrink-0 flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                {todo.due_date}
                              </span>
                            )}
                            {getPriorityBadge(todo.priority)}
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

        {/* Footer */}
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400">
          {projectTodos.length} project{projectTodos.length !== 1 ? "s" : ""} with
          pending todos
        </div>
      </div>
    </div>
  );
}
