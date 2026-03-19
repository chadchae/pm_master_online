"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { apiFetch, Project, FileItem } from "@/lib/api";
import { getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import {
  Loader2,
  FileText,
  Calendar,
  Tag,
  Monitor,
  Save,
  Edit3,
  X,
  Star,
  AlertTriangle,
  Clock,
  Users,
  User,
  Crown,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Eye,
  Folder,
  ChevronLeft,
  Pencil,
} from "lucide-react";

const MDEditor = lazy(() => import("@uiw/react-md-editor"));
import { MetaTags } from "@/components/MetaTags";
import { ProgressBar } from "@/components/ProgressBar";
import { PeopleTagInput } from "@/components/PeopleTagInput";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

export default function ProjectDetailPage() {
  const params = useParams();
  const { t } = useLocale();
  const name = decodeURIComponent(params.name as string);

  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"documents" | "instructions" | "todo" | "settings">("documents");
  const [newInstruction, setNewInstruction] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [docSelectMode, setDocSelectMode] = useState(false);
  const [docSelected, setDocSelected] = useState<Set<string>>(new Set());
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showNewDocMenu, setShowNewDocMenu] = useState(false);
  const [showNewDocFolder, setShowNewDocFolder] = useState(false);
  const [newDocFolderName, setNewDocFolderName] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docPath, setDocPath] = useState("");  // current subfolder path
  const [docContent, setDocContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaDraft, setMetaDraft] = useState({
    label: "",
    유형: "",
    포트: "",
    중요도: "",
    위급도: "",
    긴급도: "",
    협업: "",
    주도: "",
    오너: "",
    목표종료일: "",
    실제종료일: "",
    subtasks_total: "",
    subtasks_done: "",
    related_people: "",
  });
  const [metaInitialized, setMetaInitialized] = useState(false);

  // Todo state
  interface TodoItem {
    id: string;
    title: string;
    description: string;
    column: string;
    priority: "low" | "medium" | "high";
    assignee: string;
    due_date: string;
    created_at: string;
    updated_at: string;
    completed_at: string;
    order: number;
  }
  interface ProjectSummary {
    todo: { total: number; todo: number; in_progress: number; done: number; progress_pct: number };
    issues: { total: number; open: number; resolved: number };
    schedule: { total: number; upcoming: number; overdue: number };
  }
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoColumns] = useState(["todo", "in_progress", "done"]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDesc, setNewTodoDesc] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [newTodoAssignee, setNewTodoAssignee] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editTodoTitle, setEditTodoTitle] = useState("");
  const [editTodoDesc, setEditTodoDesc] = useState("");
  const [editTodoPriority, setEditTodoPriority] = useState<"low" | "medium" | "high">("medium");
  const [draggedTodo, setDraggedTodo] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      const res = await apiFetch<ProjectSummary>(
        `/api/projects/${encodeURIComponent(name)}/summary`
      );
      setSummary(res);
    } catch {}
  };

  const loadTodos = async () => {
    try {
      const res = await apiFetch<{ columns: string[]; items: TodoItem[] }>(
        `/api/projects/${encodeURIComponent(name)}/todos`
      );
      setTodos(res.items || []);
      loadSummary();
    } catch {}
  };

  const createTodo = async (column: string) => {
    if (!newTodoTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos`, {
        method: "POST",
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          description: newTodoDesc.trim(),
          column,
          priority: newTodoPriority,
          assignee: newTodoAssignee,
          due_date: newTodoDueDate,
        }),
      });
      setNewTodoTitle("");
      setNewTodoDesc("");
      setNewTodoPriority("medium");
      setNewTodoAssignee("");
      setNewTodoDueDate("");
      setAddingInColumn(null);
      loadTodos();
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const updateTodo = async (todoId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editTodoTitle.trim(),
          description: editTodoDesc.trim(),
          priority: editTodoPriority,
        }),
      });
      setEditingTodo(null);
      loadTodos();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!confirm(t("action.delete") + "?")) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}`, {
        method: "DELETE",
      });
      loadTodos();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const moveTodo = async (todoId: string, column: string, order: number) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}/move`, {
        method: "PUT",
        body: JSON.stringify({ column, order }),
      });
      loadTodos();
    } catch {
      toast.error(t("toast.failedToMove"));
    }
  };

  const handleDragStart = (todoId: string) => {
    setDraggedTodo(todoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnColumn = (column: string) => {
    if (!draggedTodo) return;
    const columnItems = todos.filter((t) => t.column === column);
    moveTodo(draggedTodo, column, columnItems.length);
    setDraggedTodo(null);
  };

  const handleDropOnCard = (column: string, order: number) => {
    if (!draggedTodo) return;
    moveTodo(draggedTodo, column, order);
    setDraggedTodo(null);
  };

  const columnLabel = (col: string) => {
    if (col === "todo") return t("todo.todo");
    if (col === "in_progress") return t("todo.inProgress");
    if (col === "done") return t("todo.done");
    return col;
  };

  const priorityClasses = (p: string) => {
    if (p === "low") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
    if (p === "high") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  };

  const priorityLabel = (p: string) => {
    if (p === "low") return t("todo.low");
    if (p === "high") return t("todo.high");
    return t("todo.medium");
  };

  useEffect(() => {
    loadProject();
  }, [name]);

  useEffect(() => {
    if (activeTab === "todo") loadTodos();
  }, [activeTab]);

  const loadDocs = async (path: string = docPath) => {
    const q = path ? `?subpath=${encodeURIComponent(path)}` : "";
    try {
      const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${q}`);
      setDocs(res.docs || []);
    } catch {}
  };

  const loadProject = async () => {
    try {
      const [projectsRes, docsRes] = await Promise.all([
        apiFetch<{ projects: Project[] }>("/api/projects"),
        apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs`).catch(() => ({ docs: [] })),
      ]);
      const proj = (projectsRes.projects || []).find((p) => p.name === name);
      setProject(proj || null);
      setDocs(docsRes.docs || []);
      loadSummary();
    } catch {
      toast.error(t("toast.failedToLoadProject"));
    } finally {
      setLoading(false);
    }
  };

  const loadDoc = async (filename: string) => {
    // Folder click → drill down
    const doc = docs.find((d) => d.filename === filename);
    if (doc && (doc as any).is_folder) {
      const newPath = docPath ? `${docPath}/${filename}` : filename;
      setDocPath(newPath);
      setSelectedDoc(null);
      setShowNewDoc(false);
      setShowNewDocFolder(false);
      loadDocs(newPath);
      return;
    }
    // File click
    const filePath = docPath ? `${docPath}/${filename}` : filename;
    setSelectedDoc(filename);
    setIsEditing(false);
    setShowNewDoc(false);
    setShowNewDocFolder(false);
    try {
      const data = await apiFetch<{ content: string }>(
        `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(filePath)}`
      );
      setDocContent(data.content);
    } catch {
      toast.error(t("toast.failedToLoadDocument"));
    }
  };

  const saveDoc = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${selectedDoc}` : selectedDoc)}`,
        {
          method: "PUT",
          body: JSON.stringify({ content: editContent }),
        }
      );
      setDocContent(editContent);
      setIsEditing(false);
      toast.success(t("toast.documentSaved"));
    } catch {
      toast.error(t("toast.failedToSaveDocument"));
    } finally {
      setSaving(false);
    }
  };

  // Initialize meta draft when project loads
  useEffect(() => {
    if (project && !metaInitialized) {
      setMetaDraft({
        label: project.metadata?.label || "",
        유형: project.metadata?.["유형"] || "",
        포트: project.metadata?.["포트"]?.toString() || "",
        중요도: project.metadata?.["중요도"] || "",
        위급도: project.metadata?.["위급도"] || "",
        긴급도: project.metadata?.["긴급도"] || "",
        협업: project.metadata?.["협업"] || "",
        주도: project.metadata?.["주도"] || "",
        오너: project.metadata?.["오너"] || "Chad",
        목표종료일: project.metadata?.["목표종료일"] || "",
        실제종료일: project.metadata?.["실제종료일"] || "",
        subtasks_total: project.metadata?.subtasks_total || "",
        subtasks_done: project.metadata?.subtasks_done || "",
        related_people: project.metadata?.related_people || "Chad (Chungil Chae)",
      });
      setMetaInitialized(true);
    }
  }, [project, metaInitialized]);

  const saveMetadata = async () => {
    setSavingMeta(true);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/metadata`, {
        method: "PUT",
        body: JSON.stringify({ metadata: metaDraft }),
      });
      setProject((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, ...metaDraft } } : prev
      );
      toast.success(t("toast.metadataSaved"));
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingMeta(false);
    }
  };

  const saveLabel = async () => {
    setSavingLabel(true);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/metadata`, {
        method: "PUT",
        body: JSON.stringify({ metadata: { label: labelDraft } }),
      });
      setProject((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, label: labelDraft } } : prev
      );
      setMetaDraft((d) => ({ ...d, label: labelDraft }));
      setEditingLabel(false);
      toast.success(t("toast.nameUpdated"));
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingLabel(false);
    }
  };

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      const res = await apiFetch<{ synced_to?: string[] }>(
        `/api/projects/${encodeURIComponent(name)}/description`,
        {
          method: "PUT",
          body: JSON.stringify({ description: descDraft }),
        }
      );
      setProject((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, description: descDraft } } : prev
      );
      setEditingDesc(false);
      const synced = res.synced_to || [];
      toast.success(`${t("toast.descriptionUpdated")} (${synced.join(", ")})`);
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingDesc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">{t("project.notFound")}</p>
      </div>
    );
  }

  const stage = getStageByFolder(project.stage);

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Display Name - inline editable */}
            <div className="group">
              {editingLabel ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="text-xl font-bold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingLabel(false);
                      if (e.key === "Enter") saveLabel();
                    }}
                  />
                  <button onClick={saveLabel} disabled={savingLabel} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400">
                    {savingLabel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditingLabel(false)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => {
                    setLabelDraft(project.metadata?.label || project.name);
                    setEditingLabel(true);
                  }}
                  className="text-xl font-bold text-neutral-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title={t("project.clickToRename")}
                >
                  {project.metadata?.label || project.name}
                  <Edit3 className="inline-block w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-40 transition-opacity" />
                </h1>
              )}
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">{project.name}</p>
            {/* Description - editable */}
            <div className="mt-1.5 group">
              {editingDesc ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={2}
                    className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm text-neutral-700 dark:text-neutral-300 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingDesc(false);
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveDescription();
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={saveDescription}
                      disabled={savingDesc}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Save"
                    >
                      {savingDesc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingDesc(false)}
                      className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => {
                    setDescDraft(project.metadata?.description || "");
                    setEditingDesc(true);
                  }}
                  className="text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors leading-relaxed"
                  title={t("project.clickToAddDesc")}
                >
                  {project.metadata?.description || (
                    <span className="italic text-neutral-400 dark:text-neutral-600">{t("project.clickToAddDesc")}...</span>
                  )}
                  <Edit3 className="inline-block w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                {stage?.label || project.stage}
              </span>
              {project.metadata?.유형 && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <Tag className="w-3.5 h-3.5" />
                  {project.metadata.유형}
                </span>
              )}
              {project.metadata?.포트 && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <Monitor className="w-3.5 h-3.5" />
                  Port {project.metadata.포트}
                </span>
              )}
              {project.metadata?.작성일 && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {project.metadata.작성일}
                </span>
              )}
            </div>
          </div>

          {/* Summary widgets (right side) */}
          {summary && (
            <div className="flex gap-3 ml-4 flex-shrink-0">
              {/* Todo summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t("todo.title")}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{summary.todo.done}/{summary.todo.total}</p>
                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.todo.progress_pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>{summary.todo.todo} todo</span>
                  <span>{summary.todo.in_progress} wip</span>
                </div>
              </div>

              {/* Issues placeholder */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center opacity-50">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Issues</p>
                <p className="text-lg font-bold text-neutral-400">-</p>
                <p className="text-xs text-neutral-400 mt-1">Coming soon</p>
              </div>

              {/* Schedule placeholder */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center opacity-50">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Schedule</p>
                <p className="text-lg font-bold text-neutral-400">-</p>
                <p className="text-xs text-neutral-400 mt-1">Coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="flex gap-4">
          {(["documents", "instructions", "todo", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {t(`project.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "documents" && (
        <div className="flex gap-4 h-[calc(100vh-18rem)]">
          {/* File List */}
          <div className="w-72 flex-shrink-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            {/* Path bar */}
            {docPath && (
              <button
                onClick={() => {
                  const parts = docPath.split("/");
                  parts.pop();
                  const parent = parts.join("/");
                  setDocPath(parent);
                  setSelectedDoc(null);
                  loadDocs(parent);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-b border-neutral-100 dark:border-neutral-800 w-full"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="truncate font-mono">{docPath}</span>
              </button>
            )}

            {/* Toolbar */}
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowNewDocMenu(!showNewDocMenu)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
                {showNewDocMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowNewDocMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 w-32 overflow-hidden">
                      <button onClick={() => { setShowNewDoc(true); setShowNewDocFolder(false); setSelectedDoc(null); setShowNewDocMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> File
                      </button>
                      <button onClick={() => { setShowNewDocFolder(true); setShowNewDoc(false); setSelectedDoc(null); setShowNewDocMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2">
                        <Folder className="w-3.5 h-3.5 text-amber-500" /> Folder
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => { setDocSelectMode(!docSelectMode); if (docSelectMode) setDocSelected(new Set()); }}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  docSelectMode ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Select
              </button>
              {docSelectMode && docSelected.size > 0 && (
                <button
                  onClick={async () => {
                    if (!confirm(`Delete ${docSelected.size} file(s)?`)) return;
                    for (const f of docSelected) {
                      try { await apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${f}` : f)}`, { method: "DELETE" }); } catch {}
                    }
                    setDocs((prev) => prev.filter((d) => !docSelected.has(d.filename)));
                    if (selectedDoc && docSelected.has(selectedDoc)) { setSelectedDoc(null); setDocContent(""); }
                    toast.success(`Deleted ${docSelected.size} file(s)`);
                    setDocSelected(new Set()); setDocSelectMode(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 rounded ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ({docSelected.size})
                </button>
              )}
              {docSelectMode && (
                <button
                  onClick={() => setDocSelected(docSelected.size === docs.length ? new Set() : new Set(docs.map(d => d.filename)))}
                  className="text-xs text-neutral-400 hover:text-neutral-600 ml-auto px-1"
                >
                  {docSelected.size === docs.length ? "None" : "All"}
                </button>
              )}
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {docs.map((doc) => (
                <div key={doc.filename} className={`flex items-center group ${selectedDoc === doc.filename ? "bg-indigo-50 dark:bg-indigo-950" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>
                  {docSelectMode && (
                    <button onClick={() => setDocSelected((prev) => { const n = new Set(prev); n.has(doc.filename) ? n.delete(doc.filename) : n.add(doc.filename); return n; })} className="pl-3 pr-1 py-2">
                      {docSelected.has(doc.filename) ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4 text-neutral-400" />}
                    </button>
                  )}
                  <button
                    onClick={() => { if (docSelectMode) { setDocSelected((prev) => { const n = new Set(prev); n.has(doc.filename) ? n.delete(doc.filename) : n.add(doc.filename); return n; }); } else { loadDoc(doc.filename); setShowNewDoc(false); } }}
                    className={`flex-1 text-left px-3 py-2 text-sm flex items-center gap-2 ${selectedDoc === doc.filename ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-700 dark:text-neutral-300"}`}
                  >
                    {(doc as any).is_folder ? <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" /> : <FileText className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate">{doc.filename}</span>
                  </button>
                  {!docSelectMode && (
                    <button
                      onClick={() => { if (!confirm(`Delete "${doc.filename}"?`)) return; apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${doc.filename}` : doc.filename)}`, { method: "DELETE" }).then(() => { setDocs((p) => p.filter((d) => d.filename !== doc.filename)); if (selectedDoc === doc.filename) { setSelectedDoc(null); setDocContent(""); } toast.success("Deleted"); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }}
                      className="p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {docs.length === 0 && <p className="px-3 py-6 text-sm text-neutral-400 text-center">{t("project.noDocuments")}</p>}
            </div>

            <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
              <span className="text-xs text-neutral-400">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Content Panel */}
          <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            {showNewDocFolder ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-80 space-y-3">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">New Folder</h3>
                  <input type="text" value={newDocFolderName} onChange={(e) => setNewDocFolderName(e.target.value)} placeholder="folder-name" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500" autoFocus onKeyDown={(e) => {
                    if (e.key === "Enter" && newDocFolderName.trim()) {
                      apiFetch(`/api/projects/${encodeURIComponent(name)}/folders`, { method: "POST", body: JSON.stringify({ folder_name: docPath ? `${docPath}/${newDocFolderName.trim()}` : newDocFolderName.trim() }) })
                        .then(async () => { const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${docPath ? `?subpath=${encodeURIComponent(docPath)}` : ""}`); setDocs(res.docs || []); setShowNewDocFolder(false); setNewDocFolderName(""); toast.success("Folder created"); })
                        .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
                    }
                    if (e.key === "Escape") setShowNewDocFolder(false);
                  }} />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowNewDocFolder(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancel</button>
                    <button onClick={() => {
                      if (!newDocFolderName.trim()) return;
                      apiFetch(`/api/projects/${encodeURIComponent(name)}/folders`, { method: "POST", body: JSON.stringify({ folder_name: docPath ? `${docPath}/${newDocFolderName.trim()}` : newDocFolderName.trim() }) })
                        .then(async () => { const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${docPath ? `?subpath=${encodeURIComponent(docPath)}` : ""}`); setDocs(res.docs || []); setShowNewDocFolder(false); setNewDocFolderName(""); toast.success("Folder created"); })
                        .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
                    }} disabled={!newDocFolderName.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40">
                      <Folder className="w-4 h-4" /> Create
                    </button>
                  </div>
                </div>
              </div>
            ) : showNewDoc ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">New Document</span>
                  <button onClick={() => setShowNewDoc(false)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
                  <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="filename.md" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && newDocName.trim()) { const fn = newDocName.endsWith(".md") ? newDocName : `${newDocName}.md`; setCreatingDoc(true); apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${fn}` : fn)}`, { method: "PUT", body: JSON.stringify({ content: newDocContent || `# ${newDocName.replace(/\.md$/, "")}\n\n` }) }).then(async () => { const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${docPath ? `?subpath=${encodeURIComponent(docPath)}` : ""}`); setDocs(res.docs || []); setShowNewDoc(false); setSelectedDoc(fn); setDocContent(newDocContent || `# ${newDocName.replace(/\.md$/, "")}\n\n`); setNewDocName(""); setNewDocContent(""); toast.success(`Created ${fn}`); }).catch(() => toast.error("Failed")).finally(() => setCreatingDoc(false)); } }} />
                </div>
                <div className="flex-1 overflow-hidden" data-color-mode="dark">
                  <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>}>
                    <MDEditor value={newDocContent} onChange={(v) => setNewDocContent(v || "")} height="100%" preview="edit" />
                  </Suspense>
                </div>
                <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800">
                  <button onClick={() => setShowNewDoc(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancel</button>
                  <button
                    onClick={() => { const fn = newDocName.endsWith(".md") ? newDocName : `${newDocName}.md`; setCreatingDoc(true); apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${fn}` : fn)}`, { method: "PUT", body: JSON.stringify({ content: newDocContent || `# ${newDocName.replace(/\.md$/, "")}\n\n` }) }).then(async () => { const res = await apiFetch<{ docs: FileItem[] }>(`/api/projects/${encodeURIComponent(name)}/docs${docPath ? `?subpath=${encodeURIComponent(docPath)}` : ""}`); setDocs(res.docs || []); setShowNewDoc(false); setSelectedDoc(fn); setDocContent(newDocContent || `# ${newDocName.replace(/\.md$/, "")}\n\n`); setNewDocName(""); setNewDocContent(""); toast.success(`Created ${fn}`); }).catch(() => toast.error("Failed")).finally(() => setCreatingDoc(false)); }}
                    disabled={creatingDoc || !newDocName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40"
                  >
                    {creatingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                  </button>
                </div>
              </>
            ) : selectedDoc ? (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{selectedDoc}</span>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title="Cancel"><X className="w-4 h-4" /></button>
                        <button onClick={saveDoc} disabled={saving} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400" title="Save">
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditContent(docContent); setIsEditing(true); }} className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title="Edit"><Edit3 className="w-4 h-4" /></button>
                        <button
                          onClick={() => { if (!confirm(`Delete "${selectedDoc}"?`)) return; setDeletingDoc(true); apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${selectedDoc}` : selectedDoc)}`, { method: "DELETE" }).then(() => { setDocs((p) => p.filter((d) => d.filename !== selectedDoc)); setSelectedDoc(null); setDocContent(""); toast.success("Deleted"); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")).finally(() => setDeletingDoc(false)); }}
                          disabled={deletingDoc}
                          className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500" title="Delete"
                        >
                          {deletingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-auto" data-color-mode="dark">
                  {isEditing ? (
                    <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
                      <MDEditor value={editContent} onChange={(v) => setEditContent(v || "")} height="100%" preview="live" />
                    </Suspense>
                  ) : (
                    <pre className="p-4 text-sm font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">{docContent}</pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">{t("project.selectFileOrCreate")}</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "instructions" && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
            New Work Instruction
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                Instruction
              </label>
              <textarea
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                rows={4}
                placeholder="What needs to be done?&#10;e.g., Implement authentication, Fix SSE streaming bug..."
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                Checklist (one per line, leave empty for default)
              </label>
              <textarea
                value={newChecklist}
                onChange={(e) => setNewChecklist(e.target.value)}
                rows={3}
                placeholder="Setup environment&#10;Implement core feature&#10;Write tests&#10;Update documentation"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  if (!newInstruction.trim()) return;
                  setSavingInstruction(true);
                  try {
                    const checklist = newChecklist.trim()
                      ? newChecklist.split("\n").map((l) => l.trim()).filter(Boolean)
                      : [];
                    await apiFetch(`/api/projects/${encodeURIComponent(name)}/work-instruction`, {
                      method: "POST",
                      body: JSON.stringify({ instruction: newInstruction, checklist }),
                    });
                    toast.success("Work instruction created");
                    setNewInstruction("");
                    setNewChecklist("");
                  } catch {
                    toast.error("Failed to create instruction");
                  } finally {
                    setSavingInstruction(false);
                  }
                }}
                disabled={savingInstruction || !newInstruction.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {savingInstruction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create Instruction
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "todo" && (
        <div className="flex gap-4 h-[calc(100vh-18rem)] overflow-x-auto">
          {todoColumns.map((col) => {
            const columnItems = todos
              .filter((t) => t.column === col)
              .sort((a, b) => a.order - b.order);
            return (
              <div
                key={col}
                className="flex-1 min-w-[280px] flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnColumn(col);
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {columnLabel(col)}
                    </h3>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                      {columnItems.length}
                    </span>
                  </div>
                </div>

                {/* Column body */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnItems.map((todo, idx) => (
                    <div
                      key={todo.id}
                      draggable
                      onDragStart={() => handleDragStart(todo.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropOnCard(col, idx);
                      }}
                      className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
                        draggedTodo === todo.id ? "opacity-50" : ""
                      }`}
                    >
                      {editingTodo === todo.id ? (
                        /* Inline edit mode */
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTodoTitle}
                            onChange={(e) => setEditTodoTitle(e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <textarea
                            value={editTodoDesc}
                            onChange={(e) => setEditTodoDesc(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                            placeholder={t("todo.description")}
                          />
                          <select
                            value={editTodoPriority}
                            onChange={(e) => setEditTodoPriority(e.target.value as "low" | "medium" | "high")}
                            className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="low">{t("todo.low")}</option>
                            <option value="medium">{t("todo.medium")}</option>
                            <option value="high">{t("todo.high")}</option>
                          </select>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateTodo(todo.id)}
                              className="flex-1 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                              {t("action.save")}
                            </button>
                            <button
                              onClick={() => setEditingTodo(null)}
                              className="flex-1 px-2 py-1 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                            >
                              {t("action.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <>
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-start gap-2 flex-1">
                              <input
                                type="checkbox"
                                checked={todo.column === "done"}
                                onChange={() => {
                                  if (todo.column === "done") {
                                    moveTodo(todo.id, "todo", 0);
                                  } else {
                                    const doneItems = todos.filter((t) => t.column === "done");
                                    moveTodo(todo.id, "done", doneItems.length);
                                  }
                                }}
                                className="mt-1 w-4 h-4 rounded border-neutral-300 text-green-600 focus:ring-green-500 flex-shrink-0 cursor-pointer"
                              />
                              <p className={`text-sm font-medium flex-1 ${todo.column === "done" ? "line-through text-neutral-400" : "text-neutral-900 dark:text-white"}`}>
                                {todo.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingTodo(todo.id);
                                  setEditTodoTitle(todo.title);
                                  setEditTodoDesc(todo.description);
                                  setEditTodoPriority(todo.priority);
                                }}
                                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded"
                                title={t("action.edit")}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className="p-1 text-neutral-400 hover:text-red-500 rounded"
                                title={t("action.delete")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {todo.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                              {todo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityClasses(todo.priority)}`}>
                              {priorityLabel(todo.priority)}
                            </span>
                            {todo.assignee && (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5">
                                <User className="w-3 h-3" />
                                {todo.assignee}
                              </span>
                            )}
                            {todo.due_date && (
                              <span className="text-xs text-neutral-400 flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                {todo.due_date}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                            <span>{todo.created_at}</span>
                            {todo.completed_at && <span className="text-green-500">completed {todo.completed_at}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {columnItems.length === 0 && addingInColumn !== col && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">
                      {t("todo.noTasks")}
                    </p>
                  )}
                </div>

                {/* Add task form or button */}
                <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
                  {addingInColumn === col ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newTodoTitle}
                        onChange={(e) => setNewTodoTitle(e.target.value)}
                        placeholder={t("todo.taskTitle")}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            createTodo(col);
                          }
                          if (e.key === "Escape") setAddingInColumn(null);
                        }}
                      />
                      <textarea
                        value={newTodoDesc}
                        onChange={(e) => setNewTodoDesc(e.target.value)}
                        rows={2}
                        placeholder={t("todo.description")}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                      <select
                        value={newTodoPriority}
                        onChange={(e) => setNewTodoPriority(e.target.value as "low" | "medium" | "high")}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="low">{t("todo.low")}</option>
                        <option value="medium">{t("todo.medium")}</option>
                        <option value="high">{t("todo.high")}</option>
                      </select>
                      <input
                        type="text"
                        value={newTodoAssignee}
                        onChange={(e) => setNewTodoAssignee(e.target.value)}
                        placeholder={t("todo.assignee")}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="date"
                        value={newTodoDueDate}
                        onChange={(e) => setNewTodoDueDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => createTodo(col)}
                          disabled={!newTodoTitle.trim()}
                          className="flex-1 px-2 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {t("todo.addTask")}
                        </button>
                        <button
                          onClick={() => {
                            setAddingInColumn(null);
                            setNewTodoTitle("");
                            setNewTodoDesc("");
                            setNewTodoPriority("medium");
                          }}
                          className="px-2 py-1.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                        >
                          {t("action.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingInColumn(col);
                        setNewTodoTitle("");
                        setNewTodoDesc("");
                        setNewTodoPriority("medium");
                      }}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
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
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Project Info (read-only) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
              Project Information
            </h3>
            <dl className="space-y-3">
              <div className="flex items-center gap-2">
                <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Path</dt>
                <dd className="text-sm text-neutral-800 dark:text-neutral-200 font-mono text-xs">
                  {project.path}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Stage</dt>
                <dd className="text-sm text-neutral-800 dark:text-neutral-200">
                  {stage?.label || project.stage}
                </dd>
              </div>
              {project.metadata?.유형 && (
                <div className="flex items-center gap-2">
                  <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Type</dt>
                  <dd className="text-sm text-neutral-800 dark:text-neutral-200">{project.metadata.유형}</dd>
                </div>
              )}
              {project.metadata?.포트 && (
                <div className="flex items-center gap-2">
                  <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Port</dt>
                  <dd className="text-sm text-neutral-800 dark:text-neutral-200">{project.metadata.포트}</dd>
                </div>
              )}
              {project.metadata?.작성일 && (
                <div className="flex items-center gap-2">
                  <dt className="text-sm text-neutral-500 dark:text-neutral-400 w-24">Created</dt>
                  <dd className="text-sm text-neutral-800 dark:text-neutral-200">{project.metadata.작성일}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Meta Tags (editable) */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Tags & Priority
              </h3>
              <div className="flex items-center gap-2">
                <MetaTags metadata={project.metadata} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Type
                </label>
                <select
                  value={metaDraft.유형 || ""}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 유형: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Not set</option>
                  <option value="개발">개발</option>
                  <option value="연구">연구</option>
                  <option value="연구+개발">연구+개발</option>
                </select>
              </div>

              {/* Port */}
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Port
                </label>
                <input
                  type="text"
                  value={metaDraft.포트 || ""}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 포트: e.target.value }))}
                  placeholder="8000/3000"
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Importance */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  Importance
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMetaDraft((d) => ({ ...d, 중요도: d.중요도 === String(n) ? "" : String(n) }))}
                      className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          parseInt(metaDraft.중요도 || "0") >= n
                            ? "text-amber-400 fill-amber-400"
                            : "text-neutral-300 dark:text-neutral-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  Severity
                </label>
                <select
                  value={metaDraft.위급도}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 위급도: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Urgency
                </label>
                <select
                  value={metaDraft.긴급도}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 긴급도: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Collaboration */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  Collaboration
                </label>
                <select
                  value={metaDraft.협업}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 협업: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Not set</option>
                  <option value="personal">Personal</option>
                  <option value="collaboration">Collaboration</option>
                </select>
              </div>

              {/* Role (only if collaboration) */}
              {metaDraft.협업 === "collaboration" && (
                <>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                      <Crown className="w-3.5 h-3.5 text-violet-500" />
                      My Role
                    </label>
                    <select
                      value={metaDraft.주도}
                      onChange={(e) => setMetaDraft((d) => ({ ...d, 주도: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Not set</option>
                      <option value="lead">Lead</option>
                      <option value="member">Member</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      Project Owner
                    </label>
                    <input
                      type="text"
                      value={metaDraft.오너}
                      onChange={(e) => setMetaDraft((d) => ({ ...d, 오너: e.target.value }))}
                      placeholder="Owner name..."
                      className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Related People */}
            <div className="mt-4">
              <PeopleTagInput
                value={metaDraft.related_people ? metaDraft.related_people.split(",").map((s) => s.trim()).filter(Boolean) : []}
                onChange={(names) => setMetaDraft((d) => ({ ...d, related_people: names.join(", ") }))}
                label="Related People"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveMetadata}
                disabled={savingMeta}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Tags
              </button>
            </div>
          </div>

          {/* Timeline & Progress */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">
              Timeline & Progress
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Target End Date
                </label>
                <input
                  type="date"
                  value={metaDraft.목표종료일}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 목표종료일: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Actual End Date
                </label>
                <input
                  type="date"
                  value={metaDraft.실제종료일}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, 실제종료일: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Today
                </label>
                <p className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                  {new Date().toISOString().split("T")[0]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Subtasks Total
                </label>
                <input
                  type="number"
                  min="0"
                  value={metaDraft.subtasks_total}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, subtasks_total: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  Subtasks Done
                </label>
                <input
                  type="number"
                  min="0"
                  max={metaDraft.subtasks_total || "999"}
                  value={metaDraft.subtasks_done}
                  onChange={(e) => setMetaDraft((d) => ({ ...d, subtasks_done: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Progress preview */}
            {parseInt(metaDraft.subtasks_total || "0") > 0 && (
              <ProgressBar
                metadata={{
                  subtasks_total: metaDraft.subtasks_total,
                  subtasks_done: metaDraft.subtasks_done,
                }}
              />
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveMetadata}
                disabled={savingMeta}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
