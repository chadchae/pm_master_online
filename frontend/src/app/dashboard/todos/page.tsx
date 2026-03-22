"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project } from "@/lib/api";
import {
  Plus,
  Loader2,
  Star,
  Pencil,
  Trash2,
  User,
  Calendar,
  FolderOpen,
  X,
  Save,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

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
  columns: string[];
  items: TodoItem[];
}

const PIN = "pm-master-local";
const COLUMNS = ["todo", "in_progress", "done", "waiting", "archive"];

const PRIORITY_CLASSES: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  medium: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  low: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
};

export default function TodosPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [projectTodos, setProjectTodos] = useState<ProjectTodos[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(PIN);

  // New todo form
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit todo
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // Drag
  const [draggedTodo, setDraggedTodo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [todosRes, projRes] = await Promise.all([
        apiFetch<{ projects: ProjectTodos[] }>("/api/todos/all?include_done=1"),
        apiFetch<{ projects: Project[] }>("/api/projects"),
      ]);
      setProjectTodos(todosRes.projects);

      const seen = new Set<string>();
      const deduped = (projRes.projects || []).filter((p) => {
        if (seen.has(p.name)) return false;
        if (p.stage === "7_discarded") return false;
        seen.add(p.name);
        return true;
      });
      deduped.sort((a, b) => {
        if (a.name === PIN) return -1;
        if (b.name === PIN) return 1;
        return (a.metadata?.label || a.name).localeCompare(b.metadata?.label || b.name);
      });
      setAllProjects(deduped);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentProject = projectTodos.find((p) => p.project === selectedProject);
  const currentItems = currentProject?.items || [];

  const columnLabel = (col: string) => {
    if (col === "todo") return t("todo.todo");
    if (col === "in_progress") return t("todo.inProgress");
    if (col === "done") return t("todo.done");
    if (col === "waiting") return t("todo.waiting");
    if (col === "archive") return t("todo.archive");
    return col;
  };

  const toggleStar = async (todoId: string, starred: boolean) => {
    setProjectTodos((prev) =>
      prev.map((p) => {
        if (p.project !== selectedProject) return p;
        return { ...p, items: p.items.map((i) => i.id === todoId ? { ...i, starred } : i) };
      })
    );
    try {
      await apiFetch(`/api/projects/${selectedProject}/todos/${todoId}`, {
        method: "PUT",
        body: JSON.stringify({ starred }),
      });
    } catch { load(); }
  };

  const moveTodo = async (todoId: string, column: string, order: number) => {
    try {
      await apiFetch(`/api/projects/${selectedProject}/todos/${todoId}/move`, {
        method: "PUT",
        body: JSON.stringify({ column, order }),
      });
      load();
    } catch {
      toast.error("Failed to move");
    }
  };

  const createTodoRef = useRef(false);
  const createTodo = async (column: string) => {
    if (!newTitle.trim() || createTodoRef.current) return;
    createTodoRef.current = true;
    try {
      await apiFetch(`/api/projects/${selectedProject}/todos`, {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          column,
          priority: newPriority,
          assignee: newAssignee.trim(),
          due_date: newDueDate,
        }),
      });
      setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewAssignee(""); setNewDueDate("");
      setAddingInColumn(null);
      toast.success("Added");
      load();
    } catch {
      toast.error("Failed");
    } finally {
      setCreating(false);
      createTodoRef.current = false;
    }
  };

  const updateTodo = async () => {
    if (!editingId) return;
    try {
      await apiFetch(`/api/projects/${selectedProject}/todos/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          priority: editPriority,
          assignee: editAssignee.trim(),
          due_date: editDueDate,
        }),
      });
      setEditingId(null);
      toast.success("Updated");
      load();
    } catch {
      toast.error("Failed");
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      await apiFetch(`/api/projects/${selectedProject}/todos/${todoId}`, { method: "DELETE" });
      load();
    } catch {
      toast.error("Failed");
    }
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDesc(todo.description || "");
    setEditPriority(todo.priority);
    setEditAssignee(todo.assignee || "");
    setEditDueDate(todo.due_date || "");
  };

  const handleDragStart = (todoId: string) => setDraggedTodo(todoId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDropOnColumn = (column: string) => {
    if (!draggedTodo) return;
    const colItems = currentItems.filter((t) => t.column === column);
    moveTodo(draggedTodo, column, colItems.length);
    setDraggedTodo(null);
  };
  const handleDropOnCard = (column: string, order: number) => {
    if (!draggedTodo) return;
    moveTodo(draggedTodo, column, order);
    setDraggedTodo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-purple-500" />
          {t("sidebar.todos")}
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 max-w-[250px]"
          >
            {allProjects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.metadata?.label || p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(selectedProject)}?tab=todo`)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open Project
          </button>
          <button onClick={load} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colItems = currentItems
            .filter((t) => t.column === col)
            .sort((a, b) => {
              if ((a.starred ? 0 : 1) !== (b.starred ? 0 : 1)) return (a.starred ? 0 : 1) - (b.starred ? 0 : 1);
              return a.order - b.order;
            });
          return (
            <div
              key={col}
              className="flex-1 min-w-[220px] max-w-[320px] flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => { e.preventDefault(); handleDropOnColumn(col); }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
                    {columnLabel(col)}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                    {colItems.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colItems.map((todo, idx) => (
                  <div
                    key={todo.id}
                    draggable={editingId !== todo.id}
                    onDragStart={() => handleDragStart(todo.id)}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDropOnCard(col, idx); }}
                    className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow group ${
                      draggedTodo === todo.id ? "opacity-50" : ""
                    } ${todo.starred ? "ring-1 ring-amber-300 dark:ring-amber-600" : ""}`}
                  >
                    {editingId === todo.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleStar(todo.id, !todo.starred)} className={`p-0.5 ${todo.starred ? "text-amber-400" : "text-neutral-300 hover:text-amber-400"}`}>
                            <Star className={`w-3.5 h-3.5 ${todo.starred ? "fill-current" : ""}`} />
                          </button>
                        </div>
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500" autoFocus />
                        <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} placeholder={t("todo.description")} className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-purple-500" />
                        <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded">
                          <option value="low">{t("todo.low")}</option>
                          <option value="medium">{t("todo.medium")}</option>
                          <option value="high">{t("todo.high")}</option>
                        </select>
                        <input type="text" value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} placeholder={t("todo.assignee")} className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded" />
                        <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded" />
                        <div className="flex gap-1">
                          <button onClick={updateTodo} className="flex-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"><Save className="w-3 h-3 inline mr-1" />{t("action.save")}</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded">{t("action.cancel")}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={col === "done"}
                              onChange={() => {
                                if (col === "done") {
                                  moveTodo(todo.id, "todo", 0);
                                } else {
                                  moveTodo(todo.id, "done", 0);
                                }
                              }}
                              className="mt-1 w-4 h-4 rounded border-neutral-300 text-green-600 focus:ring-green-500 flex-shrink-0 cursor-pointer"
                            />
                            <button
                              onClick={() => toggleStar(todo.id, !todo.starred)}
                              className={`flex-shrink-0 mt-0.5 ${todo.starred ? "text-amber-400" : "text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-amber-400"} transition-all`}
                            >
                              <Star className={`w-3.5 h-3.5 ${todo.starred ? "fill-current" : ""}`} />
                            </button>
                            <p className={`text-sm font-medium flex-1 ${col === "done" || col === "archive" ? "line-through text-neutral-400" : "text-neutral-900 dark:text-white"}`}>
                              {todo.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(todo)} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded"><Pencil className="w-3 h-3" /></button>
                            <button onClick={() => deleteTodo(todo.id)} className="p-1 text-neutral-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                        {todo.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-5 line-clamp-2">{todo.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 ml-5 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[todo.priority] || PRIORITY_CLASSES.medium}`}>
                            {todo.priority}
                          </span>
                          {todo.assignee && (
                            <span className="text-[10px] text-neutral-500 flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{todo.assignee}</span>
                          )}
                          {todo.due_date && (
                            <span className="text-[10px] text-neutral-400 flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{todo.due_date}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {colItems.length === 0 && addingInColumn !== col && (
                  <p className="text-xs text-neutral-400 text-center py-4">{t("todo.noTasks")}</p>
                )}
              </div>

              {/* Add button / form */}
              <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
                {addingInColumn === col ? (
                  <div className="space-y-2">
                    <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("todo.taskTitle")} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-500" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && newTitle.trim()) { e.preventDefault(); createTodo(col); } if (e.key === "Escape") setAddingInColumn(null); }} />
                    <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder={t("todo.description")} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded resize-none" />
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded">
                      <option value="low">{t("todo.low")}</option>
                      <option value="medium">{t("todo.medium")}</option>
                      <option value="high">{t("todo.high")}</option>
                    </select>
                    <input type="text" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} placeholder={t("todo.assignee")} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded" />
                    <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded" />
                    <div className="flex gap-1">
                      <button onClick={() => createTodo(col)} disabled={creating || !newTitle.trim()} className="flex-1 px-2 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">{t("todo.addTask")}</button>
                      <button onClick={() => { setAddingInColumn(null); setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewAssignee(""); setNewDueDate(""); }} className="px-2 py-1.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded">{t("action.cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingInColumn(col); setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewAssignee(""); setNewDueDate(""); }}
                    className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("todo.addTask")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
