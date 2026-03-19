"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
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
  CircleDot,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Ban,
  Check,
  Circle,
  Download,
  Printer,
} from "lucide-react";

const MDEditor = lazy(() => import("@uiw/react-md-editor"));
const MarkdownPreview = lazy(() => import("@uiw/react-markdown-preview"));
import { MetaTags } from "@/components/MetaTags";
import { ProgressBar } from "@/components/ProgressBar";
import { PeopleTagInput } from "@/components/PeopleTagInput";
import { ConfirmDialog, PromptDialog } from "@/components/AppDialogs";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLocale();
  const name = decodeURIComponent(params.name as string);

  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"documents" | "instructions" | "todo" | "issues" | "schedule" | "settings">("settings");
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
    related_people: "",
  });
  const [metaInitialized, setMetaInitialized] = useState(false);

  // Subtask state
  interface Subtask {
    id: string;
    title: string;
    description: string;
    status: "pending" | "done" | "cancelled";
    order: number;
    created_at: string;
    completed_at: string;
  }
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDesc, setNewSubtaskDesc] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
  const [editSubtaskDesc, setEditSubtaskDesc] = useState("");
  const [dragSubtaskId, setDragSubtaskId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ title: string; message?: string; placeholder?: string; defaultValue?: string; onConfirm: (value: string) => void } | null>(null);

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
    schedule: { total: number; planned: number; in_progress: number; done: number; overdue: number; upcoming_milestones: number };
    subtasks: { total: number; done: number; pending: number; cancelled: number };
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

  const deleteTodo = (todoId: string) => {
    setConfirmDialog({
      message: t("action.delete") + "?",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(`/api/projects/${encodeURIComponent(name)}/todos/${todoId}`, {
            method: "DELETE",
          });
          loadTodos();
        } catch {
          toast.error(t("toast.failedToDelete"));
        }
      },
    });
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

  // Issue state
  interface IssueComment {
    id: string;
    author: string;
    content: string;
    created_at: string;
  }
  interface IssueItem {
    id: string;
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "critical";
    labels: string[];
    assignee: string;
    created_at: string;
    updated_at: string;
    resolved_at: string;
    comments: IssueComment[];
  }
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [issueFilter, setIssueFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [newIssuePriority, setNewIssuePriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [newIssueLabels, setNewIssueLabels] = useState("");
  const [newIssueAssignee, setNewIssueAssignee] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editIssueTitle, setEditIssueTitle] = useState("");
  const [editIssueDesc, setEditIssueDesc] = useState("");
  const [editIssuePriority, setEditIssuePriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [editIssueLabels, setEditIssueLabels] = useState("");
  const [editIssueAssignee, setEditIssueAssignee] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // Schedule state
  interface ScheduleTask {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    assignee: string;
    status: string;
    depends_on: string[];
    parent_id: string;
    category: string;
    progress_pct: number;
    order: number;
  }
  interface ScheduleCategory {
    name: string;
    color: string;
  }
  interface Milestone {
    id: string;
    title: string;
    date: string;
    description: string;
    linked_tasks: string[];
    status: string;
  }
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [scheduleView, setScheduleView] = useState<"table" | "gantt">("table");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newSchedTitle, setNewSchedTitle] = useState("");
  const [newSchedStart, setNewSchedStart] = useState("");
  const [newSchedEnd, setNewSchedEnd] = useState("");
  const [newSchedAssignee, setNewSchedAssignee] = useState("");
  const [newSchedStatus, setNewSchedStatus] = useState("planned");
  const [newSchedParent, setNewSchedParent] = useState("");
  const [newSchedDepends, setNewSchedDepends] = useState<string[]>([]);
  const [newSchedCategory, setNewSchedCategory] = useState("");
  // Edit task inline state
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null);
  const [editSchedTitle, setEditSchedTitle] = useState("");
  const [editSchedStart, setEditSchedStart] = useState("");
  const [editSchedEnd, setEditSchedEnd] = useState("");
  const [editSchedAssignee, setEditSchedAssignee] = useState("");
  const [editSchedStatus, setEditSchedStatus] = useState("");
  const [editSchedCategory, setEditSchedCategory] = useState("");
  const [editSchedParent, setEditSchedParent] = useState("");
  const [editSchedDepends, setEditSchedDepends] = useState<string[]>([]);
  // Category state
  const [categories, setCategories] = useState<ScheduleCategory[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6b7280");
  // Gantt responsive state
  const [ganttRange, setGanttRange] = useState<number>(21);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [ganttContainerWidth, setGanttContainerWidth] = useState(800);
  const [newMsTitle, setNewMsTitle] = useState("");
  const [newMsDate, setNewMsDate] = useState("");
  const [newMsDesc, setNewMsDesc] = useState("");
  const [newMsLinked, setNewMsLinked] = useState<string[]>([]);
  // Milestone edit state
  const [editingMsId, setEditingMsId] = useState<string | null>(null);
  const [editMsTitle, setEditMsTitle] = useState("");
  const [editMsDate, setEditMsDate] = useState("");
  const [editMsDesc, setEditMsDesc] = useState("");
  const [editMsLinked, setEditMsLinked] = useState<string[]>([]);

  const loadSchedule = async () => {
    try {
      const res = await apiFetch<{ tasks: ScheduleTask[]; milestones: Milestone[]; categories: ScheduleCategory[] }>(
        `/api/projects/${encodeURIComponent(name)}/schedule`
      );
      setScheduleTasks(res.tasks || []);
      setMilestones(res.milestones || []);
      setCategories(res.categories || [{ name: "General", color: "#6b7280" }]);
    } catch {}
  };

  const createScheduleTask = async () => {
    if (!newSchedTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newSchedTitle.trim(),
          start_date: newSchedStart,
          end_date: newSchedEnd,
          assignee: newSchedAssignee.trim(),
          status: newSchedStatus,
          parent_id: newSchedParent,
          depends_on: newSchedDepends,
          category: newSchedCategory,
        }),
      });
      setNewSchedTitle("");
      setNewSchedStart("");
      setNewSchedEnd("");
      setNewSchedAssignee("");
      setNewSchedStatus("planned");
      setNewSchedParent("");
      setNewSchedDepends([]);
      setNewSchedCategory("");
      setShowAddTask(false);
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteScheduleTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks/${taskId}`, {
        method: "DELETE",
      });
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const updateScheduleTask = async (taskId: string, updates: Partial<ScheduleTask>) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const createMilestone = async () => {
    if (!newMsTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/milestones`, {
        method: "POST",
        body: JSON.stringify({
          title: newMsTitle.trim(),
          date: newMsDate,
          description: newMsDesc.trim(),
          linked_tasks: newMsLinked,
        }),
      });
      setNewMsTitle("");
      setNewMsDate("");
      setNewMsDesc("");
      setNewMsLinked([]);
      setShowAddMilestone(false);
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteMilestone = async (msId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/milestones/${msId}`, {
        method: "DELETE",
      });
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const startEditMilestone = (ms: Milestone) => {
    setEditingMsId(ms.id);
    setEditMsTitle(ms.title);
    setEditMsDate(ms.date);
    setEditMsDesc(ms.description || "");
    setEditMsLinked(ms.linked_tasks || []);
  };

  const saveEditMilestone = async () => {
    if (!editingMsId || !editMsTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/milestones/${editingMsId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editMsTitle.trim(),
          date: editMsDate,
          description: editMsDesc.trim(),
          linked_tasks: editMsLinked,
        }),
      });
      setEditingMsId(null);
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  // Save inline edit for schedule task
  const saveEditScheduleTask = async () => {
    if (!editingSchedId || !editSchedTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/tasks/${editingSchedId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editSchedTitle.trim(),
          start_date: editSchedStart,
          end_date: editSchedEnd,
          assignee: editSchedAssignee.trim(),
          status: editSchedStatus,
          category: editSchedCategory,
          parent_id: editSchedParent,
          depends_on: editSchedDepends,
        }),
      });
      setEditingSchedId(null);
      loadSchedule();
      loadSummary();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  // Start editing a schedule task
  const startEditScheduleTask = (task: ScheduleTask) => {
    setEditingSchedId(task.id);
    setEditSchedTitle(task.title);
    setEditSchedStart(task.start_date);
    setEditSchedEnd(task.end_date);
    setEditSchedAssignee(task.assignee);
    setEditSchedStatus(task.status);
    setEditSchedCategory(task.category || "");
    setEditSchedParent(task.parent_id);
    setEditSchedDepends([...task.depends_on]);
  };

  // Check if task has unfinished dependencies
  const hasUnfinishedDeps = (task: ScheduleTask): boolean => {
    if (!task.depends_on || task.depends_on.length === 0) return false;
    return task.depends_on.some((depId) => {
      const depTask = scheduleTasks.find((t2) => t2.id === depId);
      return depTask && depTask.status !== "done";
    });
  };

  // 30 category color palette — auto-assigned sequentially
  const CATEGORY_COLORS = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
    "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
    "#0ea5e9", "#3b82f6", "#6d28d9", "#7c3aed", "#c026d3",
    "#e11d48", "#ea580c", "#ca8a04", "#65a30d", "#059669",
    "#0891b2", "#2563eb", "#4f46e5", "#9333ea", "#db2777",
  ];

  const getNextCategoryColor = (): string => {
    const usedColors = categories.map((c) => c.color);
    const available = CATEGORY_COLORS.find((c) => !usedColors.includes(c));
    return available || CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length];
  };

  // Category CRUD
  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const createdName = newCatName.trim();
    const autoColor = getNextCategoryColor();
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/categories`, {
        method: "POST",
        body: JSON.stringify({ name: createdName, color: autoColor }),
      });
      setNewCatName("");
      setNewCatColor("#6b7280");
      setShowNewCategory(false);
      loadSchedule();
      if (editingSchedId) {
        setEditSchedCategory(createdName);
      } else {
        setNewSchedCategory(createdName);
      }
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const deleteCategory = async (catName: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/schedule/categories/${encodeURIComponent(catName)}`, {
        method: "DELETE",
      });
      loadSchedule();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const loadIssues = async () => {
    try {
      const res = await apiFetch<{ issues: IssueItem[] }>(
        `/api/projects/${encodeURIComponent(name)}/issues`
      );
      setIssues(res.issues || []);
      loadSummary();
    } catch {}
  };

  const createIssue = async () => {
    if (!newIssueTitle.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title: newIssueTitle.trim(),
          description: newIssueDesc.trim(),
          priority: newIssuePriority,
          labels: newIssueLabels.split(",").map((l) => l.trim()).filter(Boolean),
          assignee: newIssueAssignee.trim(),
        }),
      });
      setNewIssueTitle("");
      setNewIssueDesc("");
      setNewIssuePriority("medium");
      setNewIssueLabels("");
      setNewIssueAssignee("");
      setShowNewIssue(false);
      loadIssues();
      toast.success(t("toast.created"));
    } catch {
      toast.error(t("toast.failedToCreate"));
    }
  };

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setChangingStatus(null);
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const resolveIssue = async (issueId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/resolve`, {
        method: "POST",
      });
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteIssue = async (issueId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}`, {
        method: "DELETE",
      });
      setExpandedIssue(null);
      loadIssues();
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const addComment = async (issueId: string) => {
    if (!newCommentText.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/comments`, {
        method: "POST",
        body: JSON.stringify({ author: "Chad", content: newCommentText.trim() }),
      });
      setNewCommentText("");
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const saveEditIssue = async (issueId: string) => {
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editIssueTitle,
          description: editIssueDesc,
          priority: editIssuePriority,
          labels: editIssueLabels.split(",").map((l) => l.trim()).filter(Boolean),
          assignee: editIssueAssignee,
        }),
      });
      setEditingIssueId(null);
      loadIssues();
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const editComment = async (issueId: string, commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ content: editCommentText.trim() }),
      });
      setEditingCommentId(null);
      loadIssues();
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteComment = (issueId: string, commentId: string) => {
    setConfirmDialog({
      message: t("action.delete") + "?",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(`/api/projects/${encodeURIComponent(name)}/issues/${issueId}/comments/${commentId}`, {
            method: "DELETE",
          });
          loadIssues();
        } catch {
          toast.error(t("toast.failedToDelete"));
        }
      },
    });
  };

  const filteredIssues = issues.filter((i) => {
    if (issueFilter === "all") return true;
    return i.status === issueFilter;
  });

  const issueStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <CircleDot className="w-4 h-4 text-blue-500" />;
      case "in_progress": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      case "resolved": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed": return <XCircle className="w-4 h-4 text-neutral-400" />;
      default: return <CircleDot className="w-4 h-4 text-blue-500" />;
    }
  };

  const issueStatusLabel = (status: string) => {
    switch (status) {
      case "open": return t("issues.open");
      case "in_progress": return t("issues.inProgress");
      case "resolved": return t("issues.resolved");
      case "closed": return t("issues.closed");
      default: return status;
    }
  };

  const issuePriorityClasses = (p: string) => {
    switch (p) {
      case "low": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
      default: return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400";
    }
  };

  useEffect(() => {
    loadProject();
  }, [name]);

  useEffect(() => {
    if (activeTab === "todo") loadTodos();
    if (activeTab === "issues") loadIssues();
    if (activeTab === "schedule") loadSchedule();
  }, [activeTab]);

  // ResizeObserver for responsive Gantt chart
  useEffect(() => {
    const el = ganttContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGanttContainerWidth(entry.contentRect.width);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [scheduleView]);

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
        prev ? { ...prev, metadata: { ...prev.metadata, ...metaDraft } as unknown as Project["metadata"] } : prev
      );
      toast.success(t("toast.metadataSaved"));
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSavingMeta(false);
    }
  };

  // --- Subtask API functions ---
  const loadSubtasks = async () => {
    try {
      const data = await apiFetch<{ subtasks: Subtask[] }>(
        `/api/projects/${encodeURIComponent(name)}/subtasks`
      );
      setSubtasks(data.subtasks || []);
    } catch {
      // Silently fail on initial load
    }
  };

  const addingRef = { current: false };
  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || addingRef.current) return;
    addingRef.current = true;
    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(name)}/subtasks`,
        {
          method: "POST",
          body: JSON.stringify({ title: newSubtaskTitle.trim(), description: newSubtaskDesc.trim() }),
        }
      );
      setNewSubtaskTitle("");
      setNewSubtaskDesc("");
      await loadSubtasks();
    } catch {
      toast.error(t("toast.failedToCreate"));
    } finally {
      addingRef.current = false;
    }
  };

  const toggleSubtask = async (subtaskId: string, status: "pending" | "done" | "cancelled") => {
    try {
      const updated = await apiFetch<Subtask>(
        `/api/projects/${encodeURIComponent(name)}/subtasks/${subtaskId}/toggle`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? updated : s)));
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const updateSubtask = async (subtaskId: string) => {
    try {
      const updated = await apiFetch<Subtask>(
        `/api/projects/${encodeURIComponent(name)}/subtasks/${subtaskId}`,
        {
          method: "PUT",
          body: JSON.stringify({ title: editSubtaskTitle, description: editSubtaskDesc }),
        }
      );
      setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? updated : s)));
      setEditingSubtaskId(null);
    } catch {
      toast.error(t("toast.failedToSave"));
    }
  };

  const deleteSubtask = (subtaskId: string) => {
    setConfirmDialog({
      message: t("subtask.deleteConfirm"),
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await apiFetch(
            `/api/projects/${encodeURIComponent(name)}/subtasks/${subtaskId}`,
            { method: "DELETE" }
          );
          await loadSubtasks();
        } catch {
          toast.error(t("toast.failedToDelete"));
        }
      },
    });
  };

  const handleSubtaskDragStart = (subtaskId: string) => {
    setDragSubtaskId(subtaskId);
  };

  const handleSubtaskDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragSubtaskId || dragSubtaskId === targetId) return;
    setSubtasks((prev) => {
      const items = [...prev];
      const fromIdx = items.findIndex((s) => s.id === dragSubtaskId);
      const toIdx = items.findIndex((s) => s.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return items;
    });
  };

  const handleSubtaskDragEnd = async () => {
    if (!dragSubtaskId) return;
    setDragSubtaskId(null);
    // Persist new order
    const orderedIds = subtasks.map((s) => s.id);
    try {
      await apiFetch(
        `/api/projects/${encodeURIComponent(name)}/subtasks/reorder`,
        {
          method: "PUT",
          body: JSON.stringify({ ordered_ids: orderedIds }),
        }
      );
    } catch {
      // Reload on error
      loadSubtasks();
    }
  };

  // Load subtasks when project loads or settings tab activates
  useEffect(() => {
    if (project && activeTab === "settings") {
      loadSubtasks();
    }
  }, [project, activeTab]);

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

          {/* Action buttons */}
          <div className="flex items-center gap-1 mb-2 ml-4">
            <button
              onClick={() => { const tk = localStorage.getItem("pm_token") || ""; window.open(`/api/projects/${encodeURIComponent(name)}/download?token=${tk}`, "_blank"); }}
              className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 text-neutral-400 hover:text-blue-500 transition-colors"
              title={t("action.download")}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setConfirmDialog({
                  message: `Move "${project.metadata?.label || name}" to trash?`,
                  onConfirm: () => {
                    setConfirmDialog(null);
                    apiFetch("/api/projects/move", {
                      method: "POST",
                      body: JSON.stringify({ project_name: name, from_stage: project.stage, to_stage: "7_discarded", instruction: "" }),
                    }).then(() => { router.push("/dashboard"); toast.success("Moved to trash"); }).catch(() => toast.error("Failed"));
                  },
                });
              }}
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 transition-colors"
              title={t("action.delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

              {/* Issues summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t("issues.title")}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{summary.issues.open}/{summary.issues.total}</p>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>{summary.issues.open} open</span>
                  <span>{summary.issues.resolved} done</span>
                </div>
              </div>

              {/* Schedule summary */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 min-w-[120px] text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t("schedule.title")}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{summary.schedule.done}/{summary.schedule.total}</p>
                <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${summary.schedule.total > 0 ? Math.round(summary.schedule.done / summary.schedule.total * 100) : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs text-neutral-400 mt-1">
                  <span>{summary.schedule.in_progress} wip</span>
                  <span>{summary.schedule.overdue > 0 ? <span className="text-red-500">{summary.schedule.overdue} late</span> : `${summary.schedule.planned} plan`}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <nav className="flex gap-4">
          {(["settings", "documents", "todo", "issues", "schedule", "instructions"] as const).map((tab) => (
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
                  onClick={() => {
                    setConfirmDialog({
                      message: `Delete ${docSelected.size} file(s)?`,
                      onConfirm: async () => {
                        setConfirmDialog(null);
                        for (const f of docSelected) {
                          try { await apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${f}` : f)}`, { method: "DELETE" }); } catch {}
                        }
                        setDocs((prev) => prev.filter((d) => !docSelected.has(d.filename)));
                        if (selectedDoc && docSelected.has(selectedDoc)) { setSelectedDoc(null); setDocContent(""); }
                        toast.success(`Deleted ${docSelected.size} file(s)`);
                        setDocSelected(new Set()); setDocSelectMode(false);
                      },
                    });
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
                      onClick={() => {
                        const isFolder = (doc as any).is_folder;
                        const msg = isFolder ? `Delete folder "${doc.filename}" and all contents?` : `Delete "${doc.filename}"?`;
                        setConfirmDialog({
                          message: msg,
                          onConfirm: () => {
                            setConfirmDialog(null);
                            const path = docPath ? `${docPath}/${doc.filename}` : doc.filename;
                            const url = isFolder
                              ? `/api/projects/${encodeURIComponent(name)}/folders/${encodeURIComponent(path)}`
                              : `/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(path)}`;
                            apiFetch(url, { method: "DELETE" })
                              .then(() => { setDocs((p) => p.filter((d) => d.filename !== doc.filename)); if (selectedDoc === doc.filename) { setSelectedDoc(null); setDocContent(""); } toast.success("Deleted"); })
                              .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
                          },
                        });
                      }}
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
                          onClick={() => {
                            const printWin = window.open("", "_blank");
                            if (!printWin) return;
                            const contentEl = document.querySelector("[data-color-mode] .wmde-markdown") as HTMLElement;
                            const rawContent = contentEl?.innerHTML || `<pre style="white-space:pre-wrap;font-family:monospace;">${docContent.replace(/</g,"&lt;")}</pre>`;
                            printWin.document.write(`<!DOCTYPE html><html><head><title>${selectedDoc}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.6}h1,h2,h3{margin-top:1.5em}pre{background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto}code{background:#f5f5f5;padding:2px 4px;border-radius:3px;font-size:0.9em}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}img{max-width:100%}@media print{body{margin:0}}</style></head><body>${rawContent}</body></html>`);
                            printWin.document.close();
                            setTimeout(() => { printWin.print(); }, 300);
                          }}
                          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                          title="Print / Save as PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setConfirmDialog({ message: `Delete "${selectedDoc}"?`, onConfirm: () => { setConfirmDialog(null); setDeletingDoc(true); apiFetch(`/api/projects/${encodeURIComponent(name)}/docs/${encodeURIComponent(docPath ? `${docPath}/${selectedDoc}` : selectedDoc)}`, { method: "DELETE" }).then(() => { setDocs((p) => p.filter((d) => d.filename !== selectedDoc)); setSelectedDoc(null); setDocContent(""); toast.success("Deleted"); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")).finally(() => setDeletingDoc(false)); } }); }}
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
                  ) : selectedDoc?.endsWith(".md") ? (
                    <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
                      <MarkdownPreview
                        source={docContent}
                        style={{ padding: "1rem", backgroundColor: "transparent" }}
                      />
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

      {activeTab === "issues" && (
        <div className="space-y-4">
          {/* Header: title + new issue button + filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t("issues.title")}</h3>
            <div className="flex items-center gap-2">
              {/* Filter buttons */}
              {(["all", "open", "in_progress", "resolved", "closed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setIssueFilter(f)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                    issueFilter === f
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {f === "all" ? t("issues.all") : f === "in_progress" ? t("issues.inProgress") : t(`issues.${f}`)}
                  {" "}
                  <span className="opacity-60">
                    {f === "all" ? issues.length : issues.filter((i) => i.status === f).length}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setShowNewIssue(!showNewIssue)}
                className="ml-2 flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("issues.newIssue")}
              </button>
            </div>
          </div>

          {/* New issue form */}
          {showNewIssue && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
              <input
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder={t("todo.taskTitle")}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                value={newIssueDesc}
                onChange={(e) => setNewIssueDesc(e.target.value)}
                placeholder={t("issues.description")}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={newIssuePriority}
                  onChange={(e) => setNewIssuePriority(e.target.value as "low" | "medium" | "high" | "critical")}
                  className="px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                >
                  <option value="low">{t("todo.low")}</option>
                  <option value="medium">{t("todo.medium")}</option>
                  <option value="high">{t("todo.high")}</option>
                  <option value="critical">Critical</option>
                </select>
                <input
                  value={newIssueLabels}
                  onChange={(e) => setNewIssueLabels(e.target.value)}
                  placeholder={t("issues.labels") + " (comma separated)"}
                  className="flex-1 min-w-[150px] px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                />
                <input
                  value={newIssueAssignee}
                  onChange={(e) => setNewIssueAssignee(e.target.value)}
                  placeholder={t("issues.assignee")}
                  className="flex-1 min-w-[120px] px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewIssue(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  {t("action.cancel")}
                </button>
                <button
                  onClick={createIssue}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t("action.save")}
                </button>
              </div>
            </div>
          )}

          {/* Issue list */}
          {filteredIssues.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-sm">
              {t("issues.noIssues")}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                >
                  {/* Issue card header */}
                  <button
                    onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="mt-0.5">{issueStatusIcon(issue.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">{issue.title}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${issuePriorityClasses(issue.priority)}`}>
                          {issue.priority}
                        </span>
                        {issue.labels.map((label) => (
                          <span
                            key={label}
                            className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      {issue.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                          {issue.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
                        {issue.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {issue.assignee}
                          </span>
                        )}
                        <span>{issue.created_at}</span>
                        {issue.comments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {issue.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedIssue === issue.id ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded issue view */}
                  {expandedIssue === issue.id && (
                    <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 py-4 space-y-4">
                      {/* Edit issue form */}
                      {editingIssueId === issue.id ? (
                        <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
                          <input type="text" value={editIssueTitle} onChange={(e) => setEditIssueTitle(e.target.value)} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                          <textarea value={editIssueDesc} onChange={(e) => setEditIssueDesc(e.target.value)} rows={3} className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                          <div className="grid grid-cols-3 gap-2">
                            <select value={editIssuePriority} onChange={(e) => setEditIssuePriority(e.target.value as any)} className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded">
                              <option value="low">{t("todo.low")}</option>
                              <option value="medium">{t("todo.medium")}</option>
                              <option value="high">{t("todo.high")}</option>
                              <option value="critical">Critical</option>
                            </select>
                            <input type="text" value={editIssueLabels} onChange={(e) => setEditIssueLabels(e.target.value)} placeholder={t("issues.labels")} className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded" />
                            <input type="text" value={editIssueAssignee} onChange={(e) => setEditIssueAssignee(e.target.value)} placeholder={t("issues.assignee")} className="px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded" />
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => saveEditIssue(issue.id)} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">{t("action.save")}</button>
                            <button onClick={() => setEditingIssueId(null)} className="px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded">{t("action.cancel")}</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Full description */}
                          {issue.description && (
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                              {issue.description}
                            </p>
                          )}
                        </>
                      )}

                      {/* Status change + actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <button
                            onClick={() => setChangingStatus(changingStatus === issue.id ? null : issue.id)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          >
                            {issueStatusIcon(issue.status)}
                            {issueStatusLabel(issue.status)}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {changingStatus === issue.id && (
                            <div className="absolute top-full left-0 mt-1 z-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                              {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => updateIssueStatus(issue.id, s)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  {issueStatusIcon(s)}
                                  {issueStatusLabel(s)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {issue.status !== "resolved" && issue.status !== "closed" && (
                          <button
                            onClick={() => resolveIssue(issue.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {t("issues.resolve")}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingIssueId(issue.id);
                            setEditIssueTitle(issue.title);
                            setEditIssueDesc(issue.description);
                            setEditIssuePriority(issue.priority);
                            setEditIssueLabels(issue.labels.join(", "));
                            setEditIssueAssignee(issue.assignee);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors ml-auto"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {t("action.edit")}
                        </button>
                        <button
                          onClick={() => deleteIssue(issue.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("action.delete")}
                        </button>
                      </div>

                      {/* Comments thread */}
                      {issue.comments.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            {t("issues.comments")} ({issue.comments.length})
                          </h4>
                          {issue.comments.map((c) => (
                            <div
                              key={c.id}
                              className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg px-3 py-2.5 group/comment"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{c.author}</span>
                                  <span className="text-[10px] text-neutral-400">{c.created_at}</span>
                                  {(c as any).edited_at && <span className="text-[10px] text-neutral-400">(edited)</span>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }}
                                    className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                    title={t("action.edit")}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => deleteComment(issue.id, c.id)}
                                    className="p-0.5 text-neutral-400 hover:text-red-500"
                                    title={t("action.delete")}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {editingCommentId === c.id ? (
                                <div className="space-y-1.5">
                                  <textarea
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button onClick={() => editComment(issue.id, c.id)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">{t("action.save")}</button>
                                    <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded">{t("action.cancel")}</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{c.content}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment */}
                      <div className="flex gap-2">
                        <textarea
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder={t("issues.addComment") + "..."}
                          rows={2}
                          className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        <button
                          onClick={() => addComment(issue.id)}
                          disabled={!newCommentText.trim()}
                          className="self-end px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-4">
          {/* Header: View toggle + Add buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t("schedule.title")}</h3>
              {scheduleTasks.filter((st) => st.status === "overdue").length > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {scheduleTasks.filter((st) => st.status === "overdue").length} {t("schedule.overdue")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <button
                  onClick={() => setScheduleView("table")}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    scheduleView === "table"
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-750"
                  }`}
                >
                  {t("schedule.table")}
                </button>
                <button
                  onClick={() => setScheduleView("gantt")}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    scheduleView === "gantt"
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-750"
                  }`}
                >
                  {t("schedule.gantt")}
                </button>
              </div>
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("schedule.addTask")}
              </button>
              <button
                onClick={() => setShowAddMilestone(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("schedule.addMilestone")}
              </button>
            </div>
          </div>

          {/* Add Task Form */}
          {showAddTask && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={newSchedTitle}
                  onChange={(e) => setNewSchedTitle(e.target.value)}
                  placeholder={t("schedule.taskTitle")}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <input
                  value={newSchedAssignee}
                  onChange={(e) => setNewSchedAssignee(e.target.value)}
                  placeholder={t("schedule.assignee")}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <select
                  value={newSchedParent}
                  onChange={(e) => {
                    setNewSchedParent(e.target.value);
                    if (e.target.value) {
                      const parent = scheduleTasks.find(st => st.id === e.target.value);
                      if (parent?.end_date) {
                        const parentEnd = new Date(parent.end_date);
                        parentEnd.setDate(parentEnd.getDate() + 1);
                        const newStart = parentEnd.toISOString().split("T")[0];
                        setNewSchedStart(newStart);
                      }
                    }
                  }}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="">{t("schedule.parentTask")} (--)</option>
                  {scheduleTasks.filter((st) => !st.parent_id).map((st) => (
                    <option key={st.id} value={st.id}>{st.title}</option>
                  ))}
                </select>
                {/* Category select */}
                <div className="flex gap-2">
                  <select
                    value={newSchedCategory}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setShowNewCategory(true);
                      } else {
                        setNewSchedCategory(e.target.value);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="">{t("schedule.category")} (--)</option>
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="__new__">+ {t("schedule.newCategory")}</option>
                  </select>
                </div>
                <input
                  type="date"
                  value={newSchedStart}
                  onChange={(e) => setNewSchedStart(e.target.value)}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <input
                  type="date"
                  value={newSchedEnd}
                  onChange={(e) => setNewSchedEnd(e.target.value)}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <select
                  value={newSchedStatus}
                  onChange={(e) => setNewSchedStatus(e.target.value)}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <option value="planned">{t("schedule.planned")}</option>
                  <option value="in_progress">{t("schedule.inProgress")}</option>
                  <option value="done">{t("schedule.done")}</option>
                </select>
              </div>
              {/* New category inline form */}
              {showNewCategory && (
                <div className="flex items-center gap-2">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder={t("schedule.newCategory")}
                    className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getNextCategoryColor() }} title="Auto color" />
                  <button onClick={createCategory} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.create")}</button>
                  <button onClick={() => setShowNewCategory(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700">{t("action.cancel")}</button>
                </div>
              )}
              {/* Dependencies multi-select */}
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
                <div className="flex flex-wrap gap-1">
                  {scheduleTasks.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        if (!newSchedDepends.includes(st.id)) {
                          setNewSchedDepends((prev) => [...prev, st.id]);
                        }
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${
                        newSchedDepends.includes(st.id)
                          ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                          : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {st.title}
                      {newSchedDepends.includes(st.id) && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewSchedDepends((prev) => prev.filter((d) => d !== st.id));
                          }}
                          className="hover:text-red-500 cursor-pointer"
                        >×</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createScheduleTask}
                  className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t("action.create")}
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  {t("action.cancel")}
                </button>
              </div>
            </div>
          )}

          {/* Add Milestone Form */}
          {showAddMilestone && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={newMsTitle}
                  onChange={(e) => setNewMsTitle(e.target.value)}
                  placeholder={t("schedule.milestone")}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
                <input
                  type="date"
                  value={newMsDate}
                  onChange={(e) => setNewMsDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
              <input
                value={newMsDesc}
                onChange={(e) => setNewMsDesc(e.target.value)}
                placeholder={t("schedule.description")}
                className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
              {/* Link to tasks */}
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
                <div className="flex flex-wrap gap-1">
                  {scheduleTasks.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setNewMsLinked((prev) =>
                          prev.includes(st.id) ? prev.filter((d) => d !== st.id) : [...prev, st.id]
                        );
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        newMsLinked.includes(st.id)
                          ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                          : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {st.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createMilestone}
                  className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t("action.create")}
                </button>
                <button
                  onClick={() => setShowAddMilestone(false)}
                  className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  {t("action.cancel")}
                </button>
              </div>
            </div>
          )}

          {/* Edit Task Form (card above table/gantt) */}
          {editingSchedId && (
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3 mb-3">
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white">Edit Task</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <input value={editSchedTitle} onChange={(e) => setEditSchedTitle(e.target.value)} placeholder={t("schedule.taskTitle")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                {/* Assignee */}
                <input value={editSchedAssignee} onChange={(e) => setEditSchedAssignee(e.target.value)} placeholder={t("schedule.assignee")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                {/* Parent Task */}
                <select value={editSchedParent} onChange={(e) => setEditSchedParent(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
                  <option value="">{t("schedule.parentTask")} (--)</option>
                  {scheduleTasks.filter((st) => !st.parent_id && st.id !== editingSchedId).map((st) => (
                    <option key={st.id} value={st.id}>{st.title}</option>
                  ))}
                </select>
                {/* Category */}
                <div className="flex gap-2">
                  <select value={editSchedCategory} onChange={(e) => {
                    if (e.target.value === "__new__") { setShowNewCategory(true); setEditSchedCategory(""); } else { setEditSchedCategory(e.target.value); }
                  }} className="flex-1 px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
                    <option value="">{t("schedule.category")} (--)</option>
                    {categories.map((cat) => (<option key={cat.name} value={cat.name}>{cat.name}</option>))}
                    <option value="__new__">+ {t("schedule.newCategory")}</option>
                  </select>
                </div>
                {/* Start Date */}
                <input type="date" value={editSchedStart} onChange={(e) => setEditSchedStart(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                {/* End Date */}
                <input type="date" value={editSchedEnd} onChange={(e) => setEditSchedEnd(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                {/* Status */}
                <select value={editSchedStatus} onChange={(e) => setEditSchedStatus(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white">
                  <option value="planned">{t("schedule.planned")}</option>
                  <option value="in_progress">{t("schedule.inProgress")}</option>
                  <option value="done">{t("schedule.done")}</option>
                </select>
              </div>
              {/* New category inline form */}
              {showNewCategory && (
                <div className="flex items-center gap-2">
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t("schedule.newCategory")} className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: getNextCategoryColor() }} title="Auto color" />
                  <button onClick={createCategory} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.create")}</button>
                  <button onClick={() => setShowNewCategory(false)} className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700">{t("action.cancel")}</button>
                </div>
              )}
              {/* Dependencies multi-select */}
              <div>
                <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
                <div className="flex flex-wrap gap-1">
                  {scheduleTasks.filter((st) => st.id !== editingSchedId).map((st) => (
                    <button key={st.id} onClick={() => { if (!editSchedDepends.includes(st.id)) setEditSchedDepends((prev) => [...prev, st.id]); }} className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${editSchedDepends.includes(st.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>
                      {st.title}
                      {editSchedDepends.includes(st.id) && (<span onClick={(e) => { e.stopPropagation(); setEditSchedDepends((prev) => prev.filter((d) => d !== st.id)); }} className="hover:text-red-500 cursor-pointer">x</span>)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEditScheduleTask} className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t("action.save")}</button>
                <button onClick={() => setEditingSchedId(null)} className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">{t("action.cancel")}</button>
              </div>
            </div>
          )}

          {scheduleTasks.length === 0 && milestones.length === 0 ? (
            <div className="text-center py-16 text-neutral-400 dark:text-neutral-600">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("schedule.noTasks")}</p>
            </div>
          ) : scheduleView === "table" ? (
            /* ===== Table View ===== */
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {/* Milestones row */}
              {milestones.length > 0 && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2">
                  {milestones.map((ms) => (
                    <span key={ms.id} className="inline-flex items-center gap-1 text-xs">
                      <span className="text-amber-600 dark:text-amber-400">&#9670;</span>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">{ms.title}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">({ms.date})</span>
                      {ms.description && (
                        <span className="text-neutral-400 dark:text-neutral-500 ml-1">— {ms.description}</span>
                      )}
                      <button
                        onClick={() => startEditMilestone(ms)}
                        className="text-neutral-400 hover:text-indigo-500 ml-1"
                        title={t("action.edit")}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteMilestone(ms.id)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Edit Milestone Form */}
              {editingMsId && (
                <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-200 dark:border-amber-800 space-y-3">
                  <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">Edit Milestone</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input value={editMsTitle} onChange={(e) => setEditMsTitle(e.target.value)} placeholder={t("schedule.milestone")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                    <input type="date" value={editMsDate} onChange={(e) => setEditMsDate(e.target.value)} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                    <input value={editMsDesc} onChange={(e) => setEditMsDesc(e.target.value)} placeholder={t("schedule.description")} className="px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 block">{t("schedule.dependencies")}</label>
                    <div className="flex flex-wrap gap-1">
                      {scheduleTasks.map((st) => (
                        <button key={st.id} onClick={() => setEditMsLinked((prev) => prev.includes(st.id) ? prev.filter((d) => d !== st.id) : [...prev, st.id])} className={`px-2 py-0.5 text-xs rounded-full border ${editMsLinked.includes(st.id) ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"}`}>{st.title}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEditMilestone} className="px-4 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700">{t("action.save")}</button>
                    <button onClick={() => setEditingMsId(null)} className="px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800">{t("action.cancel")}</button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 w-8">#</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.taskTitle")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.startDate")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.endDate")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.duration")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.assignee")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.status")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.category")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.progress")}</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.dependencies")}</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleTasks
                      .sort((a, b) => a.order - b.order)
                      .map((task, idx) => {
                        const isOverdue = task.status === "overdue";
                        const isChild = !!task.parent_id;
                        const statusColors: Record<string, string> = {
                          planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                          done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                          overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        };
                        const taskCat = categories.find((c) => c.name === task.category);
                        const blockedInProgress = hasUnfinishedDeps(task);

                        return (
                          <tr
                            key={task.id}
                            className={`border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                              isOverdue ? "border-l-2 border-l-red-500" : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-neutral-400 text-xs">{idx + 1}</td>
                            <td className={`px-3 py-2 font-medium text-neutral-900 dark:text-white ${isChild ? "pl-8" : ""}`}>
                              {isChild && <span className="text-neutral-400 mr-1">&#8627;</span>}
                              {task.title}
                            </td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs font-mono">{task.start_date}</td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs font-mono">{task.end_date}</td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs">{task.duration_days}{t("schedule.days")}</td>
                            <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400 text-xs">{task.assignee || "-"}</td>
                            <td className="px-3 py-2">
                              <select
                                value={task.status}
                                onChange={(e) => {
                                  if (e.target.value === "in_progress" && blockedInProgress) {
                                    toast.error(t("schedule.predecessorRequired"));
                                    return;
                                  }
                                  updateScheduleTask(task.id, { status: e.target.value });
                                }}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${statusColors[task.status] || statusColors.planned}`}
                              >
                                <option value="planned">{t("schedule.planned")}</option>
                                <option value="in_progress" disabled={blockedInProgress}>
                                  {blockedInProgress ? "\uD83D\uDD12 " : ""}{t("schedule.inProgress")}
                                </option>
                                <option value="done">{t("schedule.done")}</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {taskCat ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: taskCat.color }} />
                                  <span className="text-neutral-600 dark:text-neutral-400">{taskCat.name}</span>
                                </span>
                              ) : (
                                <span className="text-neutral-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      task.status === "done"
                                        ? "bg-green-500"
                                        : task.status === "overdue"
                                        ? "bg-red-500"
                                        : "bg-indigo-500"
                                    }`}
                                    style={{ width: `${task.progress_pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-neutral-500">{task.progress_pct}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 max-w-[200px] truncate">
                              {task.depends_on.map((dep) => {
                                const depTask = scheduleTasks.find((t2) => t2.id === dep);
                                return depTask?.title || "";
                              }).filter(Boolean).join(", ") || "-"}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEditScheduleTask(task)}
                                  className="text-neutral-400 hover:text-indigo-500 p-1"
                                  title={t("action.edit")}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteScheduleTask(task.id)}
                                  className="text-neutral-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ===== Gantt Chart View ===== */
            (() => {
              // Calculate date range
              const allDates = [
                ...scheduleTasks.flatMap((t2) => [t2.start_date, t2.end_date].filter(Boolean)),
                ...milestones.map((m) => m.date).filter(Boolean),
              ];
              if (allDates.length === 0) return null;

              const sorted = allDates.sort();
              const minDateFull = new Date(sorted[0]);
              const maxDateFull = new Date(sorted[sorted.length - 1]);
              minDateFull.setDate(minDateFull.getDate() - 3);
              maxDateFull.setDate(maxDateFull.getDate() + 7);

              const dayMs = 86400000;
              // For "All" range, use full date span; otherwise use ganttRange days
              const isAllRange = ganttRange === 0;
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              let minDate: Date;
              let maxDate: Date;
              if (isAllRange) {
                minDate = minDateFull;
                maxDate = maxDateFull;
              } else {
                // Today at left edge, show 2 days before for context
                minDate = new Date(today.getTime() - 2 * dayMs);
                maxDate = new Date(today.getTime() + (ganttRange - 2) * dayMs);
              }

              const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / dayMs) + 1;
              // Responsive dayWidth: fit ganttRange days into container
              const effectiveContainerWidth = ganttContainerWidth - 192; // subtract left panel width
              const dayWidth = isAllRange ? 30 : Math.max(Math.floor(effectiveContainerWidth / ganttRange), 14);
              const rowHeight = 32;
              const headerHeight = 40;
              const todayOffset = Math.floor((today.getTime() - minDate.getTime()) / dayMs);

              // Generate month headers
              const months: { label: string; startDay: number; span: number }[] = [];
              let curMonth = -1;
              let curYear = -1;
              for (let d = 0; d < totalDays; d++) {
                const dt = new Date(minDate.getTime() + d * dayMs);
                if (dt.getMonth() !== curMonth || dt.getFullYear() !== curYear) {
                  curMonth = dt.getMonth();
                  curYear = dt.getFullYear();
                  months.push({
                    label: dt.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
                    startDay: d,
                    span: 1,
                  });
                } else {
                  months[months.length - 1].span++;
                }
              }

              // Generate day labels
              const days: { label: string; isWeekend: boolean; dayNum: number }[] = [];
              for (let d = 0; d < totalDays; d++) {
                const dt = new Date(minDate.getTime() + d * dayMs);
                days.push({
                  label: String(dt.getDate()),
                  isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
                  dayNum: d,
                });
              }

              const sortedTasks = [...scheduleTasks].sort((a, b) => a.order - b.order);

              // Group tasks by category for Gantt display
              const catGroupOrder = categories.map((c) => c.name);
              const catMap: Record<string, ScheduleTask[]> = {};
              for (const cat of categories) catMap[cat.name] = [];
              catMap[""] = []; // uncategorized
              for (const task of sortedTasks) {
                const key = task.category || "";
                if (!catMap[key]) catMap[key] = [];
                catMap[key].push(task);
              }
              // Build flat list with category headers interleaved
              type GanttRow = { type: "category"; name: string; color: string } | { type: "task"; task: ScheduleTask };
              const ganttRows: GanttRow[] = [];
              for (const catName of catGroupOrder) {
                const tasks = catMap[catName] || [];
                if (tasks.length > 0) {
                  const cat = categories.find((c) => c.name === catName);
                  ganttRows.push({ type: "category", name: catName, color: cat?.color || "#6b7280" });
                  for (const task of tasks) ganttRows.push({ type: "task", task });
                }
              }
              // Uncategorized tasks under "General"
              if (catMap[""] && catMap[""].length > 0) {
                if (!catGroupOrder.includes("General")) {
                  // No General category exists — create one
                  ganttRows.push({ type: "category", name: t("schedule.general"), color: "#6b7280" });
                  for (const task of catMap[""]) ganttRows.push({ type: "task", task });
                } else {
                  // Merge uncategorized into General group, sorted by start_date
                  const generalIdx = ganttRows.findIndex((r) => r.type === "category" && r.name === "General");
                  if (generalIdx >= 0) {
                    // Collect all General tasks + uncategorized, re-sort by start_date
                    let endIdx = generalIdx + 1;
                    while (endIdx < ganttRows.length && ganttRows[endIdx].type === "task") endIdx++;
                    const existingTasks = ganttRows.slice(generalIdx + 1, endIdx).map((r) => (r as { type: "task"; task: ScheduleTask }).task);
                    const allGeneralTasks = [...existingTasks, ...catMap[""]].sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
                    // Replace existing tasks with sorted combined list
                    ganttRows.splice(generalIdx + 1, endIdx - generalIdx - 1, ...allGeneralTasks.map((task) => ({ type: "task" as const, task })));
                  }
                }
              }
              const ganttTaskRows = ganttRows.filter((r) => r.type === "task") as { type: "task"; task: ScheduleTask }[];
              const categoryRowHeight = 24;

              return (
                <div className="space-y-2">
                  {/* Range selector */}
                  <div className="flex items-center gap-1">
                    {([
                      { label: t("schedule.1w"), days: 7 },
                      { label: t("schedule.2w"), days: 14 },
                      { label: t("schedule.3w"), days: 21 },
                      { label: t("schedule.1m"), days: 30 },
                      { label: t("schedule.all"), days: 0 },
                    ] as const).map((opt) => (
                      <button
                        key={opt.days}
                        onClick={() => setGanttRange(opt.days)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                          ganttRange === opt.days
                            ? "bg-indigo-600 text-white"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div ref={ganttContainerRef} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  {/* Milestones row */}
                  {milestones.length > 0 && (
                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-2">
                      {milestones.map((ms) => (
                        <span key={ms.id} className="inline-flex items-center gap-1 text-xs">
                          <span className="text-amber-600 dark:text-amber-400">&#9670;</span>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{ms.title}</span>
                          <span className="text-neutral-500 dark:text-neutral-400">({ms.date})</span>
                          {ms.description && (
                            <span className="text-neutral-400 dark:text-neutral-500 ml-1">— {ms.description}</span>
                          )}
                          <button onClick={() => startEditMilestone(ms)} className="text-neutral-400 hover:text-indigo-500 ml-1" title={t("action.edit")}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteMilestone(ms.id)} className="text-neutral-400 hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex">
                    {/* Task labels (left side) with category grouping */}
                    <div className="flex-shrink-0 w-48 border-r border-neutral-200 dark:border-neutral-800">
                      <div className="h-[40px] border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 px-3 flex items-center">
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{t("schedule.taskTitle")}</span>
                      </div>
                      {milestones.length > 0 && (
                        <div className="h-[28px] px-3 flex items-center border-b border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
                          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Milestones</span>
                        </div>
                      )}
                      {ganttRows.map((row, ri) => {
                        if (row.type === "category") {
                          return (
                            <div key={`cat-${ri}`} className="h-[24px] px-3 flex items-center border-b border-neutral-100 dark:border-neutral-800" style={{ backgroundColor: row.color + "18" }}>
                              <span className="w-2 h-2 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: row.color }} />
                              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: row.color }}>{row.name}</span>
                            </div>
                          );
                        }
                        const task = row.task;
                        return (
                          <div
                            key={task.id}
                            className={`h-[32px] px-3 flex items-center border-b border-neutral-100 dark:border-neutral-800 text-xs truncate ${
                              task.parent_id ? "pl-6" : ""
                            } ${task.status === "overdue" ? "text-red-600 dark:text-red-400" : "text-neutral-700 dark:text-neutral-300"}`}
                          >
                            {task.parent_id && <span className="text-neutral-400 mr-1">&#8627;</span>}
                            {task.title}
                          </div>
                        );
                      })}
                    </div>
                    {/* Gantt chart area */}
                    <div
                      className="overflow-x-auto flex-1"
                      ref={(el) => {
                        // Auto-scroll to today
                        if (el && todayOffset > 0) {
                          const scrollTo = todayOffset * dayWidth;
                          el.scrollLeft = Math.max(0, scrollTo);
                        }
                      }}
                    >
                      <div style={{ width: totalDays * dayWidth, position: "relative" }}>
                        {/* Month headers */}
                        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50" style={{ height: headerHeight / 2 }}>
                          {months.map((m, i) => (
                            <div
                              key={i}
                              className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-800 flex items-center px-1 overflow-hidden"
                              style={{ width: m.span * dayWidth }}
                            >
                              {m.label}
                            </div>
                          ))}
                        </div>
                        {/* Day headers */}
                        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50" style={{ height: headerHeight / 2 }}>
                          {days.map((d, i) => (
                            <div
                              key={i}
                              className={`text-[9px] text-center border-r border-neutral-100 dark:border-neutral-800 flex items-center justify-center ${
                                d.isWeekend ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400" : "text-neutral-500 dark:text-neutral-400"
                              }`}
                              style={{ width: dayWidth }}
                            >
                              {d.label}
                            </div>
                          ))}
                        </div>
                        {/* Task bars with category rows */}
                        {(() => {
                          // Calculate total chart height considering category rows
                          const catRowCount = ganttRows.filter((r) => r.type === "category").length;
                          const taskRowCount = ganttRows.filter((r) => r.type === "task").length;
                          const milestoneAreaHeight = milestones.length > 0 ? 28 : 0;
                          const totalChartHeight = milestoneAreaHeight + catRowCount * categoryRowHeight + taskRowCount * rowHeight;

                          // Calculate Y offset for each ganttRow
                          const rowYOffsets: number[] = [];
                          let yAccum = milestoneAreaHeight;
                          for (const row of ganttRows) {
                            rowYOffsets.push(yAccum);
                            yAccum += row.type === "category" ? categoryRowHeight : rowHeight;
                          }

                          return (
                            <div style={{ position: "relative", height: totalChartHeight }}>
                              {/* Weekend columns */}
                              {days.map(
                                (d, i) =>
                                  d.isWeekend && (
                                    <div
                                      key={`w-${i}`}
                                      className="absolute top-0 bottom-0 bg-neutral-50 dark:bg-neutral-800/30"
                                      style={{ left: i * dayWidth, width: dayWidth, height: totalChartHeight }}
                                    />
                                  )
                              )}
                              {/* Milestone row area */}
                              {milestones.map((ms) => {
                                const msOffset = Math.floor(
                                  (new Date(ms.date).getTime() - minDate.getTime()) / dayMs
                                );
                                if (msOffset < 0 || msOffset >= totalDays) return null;
                                return (
                                  <div
                                    key={`ms-${ms.id}`}
                                    className="absolute z-10 flex items-center"
                                    style={{
                                      left: msOffset * dayWidth + dayWidth / 2 - 6,
                                      top: 4,
                                    }}
                                    title={`${ms.title}${ms.description ? ": " + ms.description : ""}`}
                                  >
                                    <span className="text-amber-500 dark:text-amber-400 text-sm">&#9670;</span>
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 ml-0.5 whitespace-nowrap font-medium">{ms.title}</span>
                                  </div>
                                );
                              })}
                              {/* Milestone area border */}
                              {milestones.length > 0 && (
                                <div className="absolute w-full border-b border-amber-200 dark:border-amber-800/50" style={{ top: milestoneAreaHeight, height: 0 }} />
                              )}
                              {/* Category header rows + Task bar rows */}
                              {ganttRows.map((row, ri) => {
                                if (row.type === "category") {
                                  return (
                                    <div
                                      key={`cat-bar-${ri}`}
                                      className="absolute w-full border-b border-neutral-100 dark:border-neutral-800"
                                      style={{ top: rowYOffsets[ri], height: categoryRowHeight, backgroundColor: row.color + "10" }}
                                    />
                                  );
                                }
                                const task = row.task;
                                const startOffset = task.start_date
                                  ? Math.floor((new Date(task.start_date).getTime() - minDate.getTime()) / dayMs)
                                  : 0;
                                const endOffset = task.end_date
                                  ? Math.floor((new Date(task.end_date).getTime() - minDate.getTime()) / dayMs)
                                  : startOffset;
                                const barWidth = Math.max((endOffset - startOffset + 1) * dayWidth - 4, 8);

                                const barColors: Record<string, string> = {
                                  planned: "bg-blue-400 dark:bg-blue-600",
                                  in_progress: "bg-amber-400 dark:bg-amber-600",
                                  done: "bg-green-400 dark:bg-green-600",
                                  overdue: "bg-red-400 dark:bg-red-600",
                                };

                                return (
                                  <div
                                    key={task.id}
                                    className="absolute border-b border-neutral-100 dark:border-neutral-800"
                                    style={{ top: rowYOffsets[ri], height: rowHeight, width: "100%" }}
                                  >
                                    {/* Task bar */}
                                    <div
                                      className={`absolute top-1.5 h-5 rounded-sm ${barColors[task.status] || barColors.planned} opacity-80 hover:opacity-100 cursor-default`}
                                      style={{
                                        left: startOffset * dayWidth + 2,
                                        width: barWidth,
                                      }}
                                      title={`${task.title} (${task.start_date} ~ ${task.end_date})`}
                                    >
                                      {/* Progress fill */}
                                      {task.progress_pct > 0 && task.progress_pct < 100 && (
                                        <div
                                          className="absolute inset-y-0 left-0 bg-white/30 rounded-l-sm"
                                          style={{ width: `${task.progress_pct}%` }}
                                        />
                                      )}
                                      {barWidth > 40 && (
                                        <span className="absolute inset-0 flex items-center px-1 text-[9px] text-white font-medium truncate">
                                          {task.title}{barWidth > 80 ? ` (${task.duration_days}d)` : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Dependency arrows */}
                              <svg
                                className="absolute top-0 left-0 pointer-events-none"
                                style={{ width: totalDays * dayWidth, height: totalChartHeight }}
                              >
                                {ganttRows.map((row, ri) => {
                                  if (row.type !== "task") return null;
                                  const task = row.task;
                                  return task.depends_on.map((depId) => {
                                    const depRowIdx = ganttRows.findIndex((r) => r.type === "task" && r.task.id === depId);
                                    if (depRowIdx < 0) return null;
                                    const depTask = (ganttRows[depRowIdx] as { type: "task"; task: ScheduleTask }).task;
                                    const depEndOffset = depTask.end_date
                                      ? Math.floor((new Date(depTask.end_date).getTime() - minDate.getTime()) / dayMs)
                                      : 0;
                                    const taskStartOffset = task.start_date
                                      ? Math.floor((new Date(task.start_date).getTime() - minDate.getTime()) / dayMs)
                                      : 0;

                                    const x1 = (depEndOffset + 1) * dayWidth;
                                    const y1 = rowYOffsets[depRowIdx] + rowHeight / 2;
                                    const x2 = taskStartOffset * dayWidth + 2;
                                    const y2 = rowYOffsets[ri] + rowHeight / 2;

                                    return (
                                      <g key={`${task.id}-${depId}`}>
                                        <line
                                          x1={x1}
                                          y1={y1}
                                          x2={x2}
                                          y2={y2}
                                          stroke="rgb(156, 163, 175)"
                                          strokeWidth="1"
                                          strokeDasharray="3,2"
                                        />
                                        <polygon
                                          points={`${x2},${y2} ${x2 - 4},${y2 - 3} ${x2 - 4},${y2 + 3}`}
                                          fill="rgb(156, 163, 175)"
                                        />
                                      </g>
                                    );
                                  });
                                })}
                              </svg>
                              {/* Today line — rendered AFTER task bars so it appears in front */}
                              {todayOffset >= 0 && todayOffset < totalDays && (
                                <div
                                  className="absolute top-0 pointer-events-none"
                                  style={{
                                    left: todayOffset * dayWidth,
                                    height: totalChartHeight,
                                    width: 2,
                                    backgroundColor: "rgb(239 68 68)",
                                    zIndex: 50,
                                  }}
                                />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              );
            })()
          )}
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
                  value={["", "개인", "개발", "연구", "연구+개발", "사업", "커리큘럼디벨롭"].includes(metaDraft.유형 || "") ? (metaDraft.유형 || "") : metaDraft.유형}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setPromptDialog({
                        title: "Custom Type",
                        placeholder: "Enter type...",
                        onConfirm: (val) => {
                          setPromptDialog(null);
                          if (val.trim()) {
                            setMetaDraft((d) => ({ ...d, 유형: val.trim() }));
                          }
                        },
                      });
                    } else {
                      setMetaDraft((d) => ({ ...d, 유형: e.target.value }));
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Not set</option>
                  <option value="개인">개인</option>
                  <option value="개발">개발</option>
                  <option value="연구">연구</option>
                  <option value="연구+개발">연구+개발</option>
                  <option value="사업">사업</option>
                  <option value="커리큘럼디벨롭">커리큘럼디벨롭</option>
                  {metaDraft.유형 && !["", "개인", "개발", "연구", "연구+개발", "사업", "커리큘럼디벨롭"].includes(metaDraft.유형) && (
                    <option value={metaDraft.유형}>{metaDraft.유형}</option>
                  )}
                  <option value="__custom__">+ 직접 입력</option>
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
              {t("project.timelineProgress")}
            </h3>
            {/* Date fields */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                  {t("project.targetEndDate")}
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
                  {t("project.actualEndDate")}
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
                  {t("project.today")}
                </label>
                <p className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                  {new Date().toISOString().split("T")[0]}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveMetadata}
                disabled={savingMeta}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("action.save")}
              </button>
            </div>

            {/* Progress bar from real subtask data */}
            {subtasks.length > 0 && (
              <div className="mt-5">
                <ProgressBar
                  metadata={{
                    subtasks_total: String(subtasks.length),
                    subtasks_done: String(subtasks.filter((s) => s.status === "done").length),
                  }}
                />
              </div>
            )}

            {/* Subtask counts */}
            <div className="mt-4 mb-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {subtasks.length} {t("subtask.subtasks")}:{" "}
                <span className="text-green-600 dark:text-green-400">{subtasks.filter((s) => s.status === "done").length} {t("subtask.done")}</span>,{" "}
                <span className="text-red-500 dark:text-red-400">{subtasks.filter((s) => s.status === "cancelled").length} {t("subtask.cancelled")}</span>,{" "}
                <span className="text-neutral-600 dark:text-neutral-300">{subtasks.filter((s) => s.status === "pending").length} {t("subtask.pending")}</span>
              </p>
            </div>

            {/* Subtask list */}
            <div className="space-y-1">
              {subtasks.length === 0 && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 py-2">{t("subtask.noSubtasks")}</p>
              )}
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  draggable
                  onDragStart={() => handleSubtaskDragStart(st.id)}
                  onDragOver={(e) => handleSubtaskDragOver(e, st.id)}
                  onDragEnd={handleSubtaskDragEnd}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors group ${
                    dragSubtaskId === st.id
                      ? "opacity-50 border-indigo-300 dark:border-indigo-600"
                      : "border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  } ${st.status === "cancelled" ? "opacity-60" : ""}`}
                >
                  {/* Drag handle */}
                  <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 cursor-grab shrink-0" />

                  {/* Checkbox / status toggle */}
                  {st.status === "done" ? (
                    <button
                      onClick={() => toggleSubtask(st.id, "pending")}
                      className="shrink-0 text-green-500 hover:text-green-600"
                      title={t("subtask.done")}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  ) : st.status === "cancelled" ? (
                    <button
                      onClick={() => toggleSubtask(st.id, "pending")}
                      className="shrink-0 text-red-400 hover:text-red-500"
                      title={t("subtask.cancelled")}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleSubtask(st.id, "done")}
                      className="shrink-0 text-neutral-300 dark:text-neutral-600 hover:text-green-500"
                      title={t("subtask.pending")}
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Title & description */}
                  {editingSubtaskId === st.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={editSubtaskTitle}
                        onChange={(e) => setEditSubtaskTitle(e.target.value)}
                        className="flex-1 px-2 py-0.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateSubtask(st.id);
                          if (e.key === "Escape") setEditingSubtaskId(null);
                        }}
                      />
                      <input
                        value={editSubtaskDesc}
                        onChange={(e) => setEditSubtaskDesc(e.target.value)}
                        placeholder={t("subtask.description")}
                        className="flex-1 px-2 py-0.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateSubtask(st.id);
                          if (e.key === "Escape") setEditingSubtaskId(null);
                        }}
                      />
                      <button onClick={() => updateSubtask(st.id)} className="text-green-500 hover:text-green-600">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingSubtaskId(null)} className="text-neutral-400 hover:text-neutral-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm ${
                          st.status === "cancelled"
                            ? "line-through text-neutral-400 dark:text-neutral-500"
                            : st.status === "done"
                            ? "line-through text-neutral-500 dark:text-neutral-400"
                            : "text-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        {st.title}
                      </span>
                      {st.description && (
                        <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500 truncate">
                          {st.description}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons (visible on hover) */}
                  {editingSubtaskId !== st.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {st.status === "pending" && (
                        <button
                          onClick={() => toggleSubtask(st.id, "cancelled")}
                          className="p-0.5 text-neutral-400 hover:text-red-500"
                          title={t("subtask.cancelled")}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingSubtaskId(st.id);
                          setEditSubtaskTitle(st.title);
                          setEditSubtaskDesc(st.description);
                        }}
                        className="p-0.5 text-neutral-400 hover:text-indigo-500"
                        title={t("action.edit")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSubtask(st.id)}
                        className="p-0.5 text-neutral-400 hover:text-red-500"
                        title={t("action.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add subtask form */}
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder={t("subtask.title")}
                className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSubtaskTitle.trim()) addSubtask();
                }}
              />
              <input
                value={newSubtaskDesc}
                onChange={(e) => setNewSubtaskDesc(e.target.value)}
                placeholder={`${t("subtask.description")} (${t("todo.description")})`}
                className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newSubtaskTitle.trim()) addSubtask();
                }}
              />
              <button
                onClick={addSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("subtask.addSubtask")}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message || ""}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => { confirmDialog?.onConfirm(); }}
        onCancel={() => setConfirmDialog(null)}
      />
      <PromptDialog
        open={!!promptDialog}
        title={promptDialog?.title}
        message={promptDialog?.message}
        placeholder={promptDialog?.placeholder}
        defaultValue={promptDialog?.defaultValue}
        onConfirm={(val) => { promptDialog?.onConfirm(val); }}
        onCancel={() => setPromptDialog(null)}
      />
    </div>
  );
}
