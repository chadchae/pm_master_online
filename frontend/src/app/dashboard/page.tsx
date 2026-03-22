"use client";

import { useEffect, useState, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project, ServerStatus } from "@/lib/api";
import { STAGES, KANBAN_STAGES, getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import { FolderKanban, Server, Layers, Loader2, GripVertical, Lightbulb, LayoutGrid, List, Clock, Pencil, Trash2, Download, Plus, X, Copy, ListTodo } from "lucide-react";
import { MetaTags } from "@/components/MetaTags";
import { ProgressBar } from "@/components/ProgressBar";
import { MoveProjectModal } from "@/components/MoveProjectModal";
import { ConfirmDialog, PromptDialog, NewProjectDialog } from "@/components/AppDialogs";
import { useLocale } from "@/lib/i18n";
import { useFocusMode } from "@/lib/focusMode";
import { ListExportBar, generateMD, generateCSV, downloadFile, printList } from "@/components/ListExportBar";
import toast from "react-hot-toast";

// Light theme variations
const LIGHT_THEMES = {
  A: { // Clean White
    column: "bg-white",
    columnBorder: "border-gray-200",
    card: "bg-white",
    cardBorder: "border-gray-200",
    cardHover: "hover:border-indigo-300",
  },
  B: { // Layered Gray
    column: "bg-neutral-100",
    columnBorder: "border-neutral-300",
    card: "bg-white",
    cardBorder: "border-neutral-300",
    cardHover: "hover:border-indigo-400",
  },
  C: { // Warm Paper
    column: "bg-orange-50/50",
    columnBorder: "border-amber-200",
    card: "bg-white",
    cardBorder: "border-amber-200",
    cardHover: "hover:border-indigo-300",
  },
  D: { // Blue Tint
    column: "bg-slate-50",
    columnBorder: "border-blue-200",
    card: "bg-white",
    cardBorder: "border-blue-200",
    cardHover: "hover:border-indigo-400",
  },
} as const;

// Dark theme variations
const DARK_THEMES = {
  A: { // Elevated Card
    column: "bg-neutral-800/50",
    columnBorder: "border-neutral-700",
    card: "bg-neutral-800",
    cardBorder: "border-neutral-600",
    cardHover: "hover:border-indigo-600",
  },
  B: { // Sunken Background
    column: "bg-black/40",
    columnBorder: "border-neutral-700",
    card: "bg-neutral-900",
    cardBorder: "border-neutral-600",
    cardHover: "hover:border-indigo-600",
  },
  C: { // Warm Neutral
    column: "bg-zinc-900/60",
    columnBorder: "border-zinc-600",
    card: "bg-zinc-800",
    cardBorder: "border-zinc-600",
    cardHover: "hover:border-indigo-600",
  },
  D: { // Subtle Tint
    column: "bg-slate-900/50",
    columnBorder: "border-slate-600",
    card: "bg-slate-800",
    cardBorder: "border-slate-500",
    cardHover: "hover:border-indigo-500",
  },
} as const;

type ThemeKey = "A" | "B" | "C" | "D";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [moveModal, setMoveModal] = useState<{
    projectName: string;
    projectLabel?: string;
    fromStage: string;
    toStage: string;
  } | null>(null);
  const [cardOrder, setCardOrder] = useState<Record<string, string[]>>({});
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pm_collapsedStages");
      if (saved) { try { return new Set(JSON.parse(saved)); } catch {} }
    }
    return new Set();
  });
  useEffect(() => { localStorage.setItem("pm_collapsedStages", JSON.stringify([...collapsedStages])); }, [collapsedStages]);
  const toggleStage = (folder: string) => {
    setCollapsedStages((prev) => { const next = new Set(prev); next.has(folder) ? next.delete(folder) : next.add(folder); return next; });
  };
  const [typeFilters, setTypeFilters] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pm_typeFilters");
      if (saved) {
        try { return new Set(JSON.parse(saved)); } catch {}
      }
    }
    return new Set();
  });
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showNewProject, setShowNewProject] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState("");
  const { focusMode, focusActive, handleFocusCardClick, getFocusBadge, isFocusDimmed, isFocusHidden } = useFocusMode();

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ title: string; defaultValue?: string; onConfirm: (val: string) => void } | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [lightTheme, setLightTheme] = useState<ThemeKey>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pm_lightTheme");
      if (saved && ["A","B","C","D"].includes(saved)) return saved as ThemeKey;
    }
    return "A";
  });
  const [darkTheme, setDarkTheme] = useState<ThemeKey>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pm_darkTheme");
      if (saved && ["A","B","C","D"].includes(saved)) return saved as ThemeKey;
    }
    return "A";
  });

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => { localStorage.setItem("pm_lightTheme", lightTheme); }, [lightTheme]);
  useEffect(() => { localStorage.setItem("pm_darkTheme", darkTheme); }, [darkTheme]);

  const activeThemeKey = isDark ? darkTheme : lightTheme;
  const setActiveTheme = (key: ThemeKey) => { isDark ? setDarkTheme(key) : setLightTheme(key); };

  useEffect(() => {
    loadData();
  }, []);

  const [todoSummary, setTodoSummary] = useState<{ total: number; todo: number; wip: number; done: number; starred: number }>({ total: 0, todo: 0, wip: 0, done: 0, starred: 0 });

  const loadData = async () => {
    try {
      const [projectsRes, serversRes, orderRes, todosRes] = await Promise.all([
        apiFetch<{ projects: Project[] }>("/api/projects"),
        apiFetch<{ servers: ServerStatus[] }>("/api/servers/status").catch(() => ({ servers: [] })),
        apiFetch<Record<string, string[]>>("/api/card-order").catch(() => ({})),
        apiFetch<{ projects: { items: { column: string; starred?: boolean }[] }[] }>("/api/todos/all?include_done=1").catch(() => ({ projects: [] })),
      ]);
      setProjects(projectsRes.projects || []);
      setServers(serversRes.servers || []);
      setCardOrder(orderRes || {});
      // Aggregate todo stats
      const allItems = (todosRes.projects || []).flatMap((p) => p.items || []);
      setTodoSummary({
        total: allItems.length,
        todo: allItems.filter((i) => i.column === "todo").length,
        wip: allItems.filter((i) => i.column === "in_progress").length,
        done: allItems.filter((i) => i.column === "done").length,
        starred: allItems.filter((i) => i.starred && i.column !== "done").length,
      });
    } catch (err) {
      toast.error(t("toast.failedToLoadData"));
    } finally {
      setLoading(false);
    }
  };

  // Persist type filters to localStorage
  useEffect(() => {
    localStorage.setItem("pm_typeFilters", JSON.stringify([...typeFilters]));
  }, [typeFilters]);

  // Fixed type order and normalization
  const TYPE_ORDER = ["개인", "연구", "개발", "기타"] as const;
  const normalizeType = (t: string): string => {
    if (!t) return "기타";
    if (t === "개인" || t === "연구" || t === "개발") return t;
    if (t.includes("연구") && t.includes("개발")) return "연구";
    return "기타";
  };

  // Filter out idea-stage projects for kanban (ideas have their own page)
  const kanbanProjects = projects.filter((p) => {
    if (p.stage === "1_idea_stage") return false;
    if (typeFilters.size === 0) return true;
    return typeFilters.has(p.metadata?.["유형"] || "");
  });
  const ideaCount = projects.filter((p) => p.stage === "1_idea_stage").length;

  // Target date color based on proximity to today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTargetDateColor = (targetDate: string | undefined, metadata?: any): string => {
    if (!targetDate) return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    // 100% complete → neutral gray regardless of date
    const total = parseInt(String(metadata?.subtasks_total || "0"));
    const done = parseInt(String(metadata?.subtasks_done || "0"));
    if (total > 0 && done >= total) return "text-neutral-500 dark:text-neutral-400";

    // Today → red
    if (diffDays === 0) return "text-red-600 dark:text-red-400 font-semibold";
    // Past due (overdue) → red to purple gradient
    if (diffDays < 0) {
      if (diffDays >= -3) return "text-red-500 dark:text-red-400";
      if (diffDays >= -7) return "text-rose-600 dark:text-rose-400";
      if (diffDays >= -14) return "text-fuchsia-600 dark:text-fuchsia-400";
      return "text-purple-600 dark:text-purple-400";
    }
    // Future → blue gradient approaching red
    if (diffDays <= 3) return "text-red-500 dark:text-red-400";
    if (diffDays <= 7) return "text-orange-500 dark:text-orange-400";
    if (diffDays <= 14) return "text-amber-500 dark:text-amber-400";
    if (diffDays <= 30) return "text-blue-500 dark:text-blue-400";
    return "text-blue-400 dark:text-blue-300";
  };

  // Group projects by stage (kanban only), apply saved card order
  const projectsByStage = KANBAN_STAGES.reduce(
    (acc, stage) => {
      const stageProjects = kanbanProjects.filter((p) => p.stage === stage.folder);
      const order = cardOrder[stage.folder];
      if (order && order.length > 0) {
        stageProjects.sort((a, b) => {
          const ai = order.indexOf(a.name);
          const bi = order.indexOf(b.name);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }
      acc[stage.folder] = stageProjects;
      return acc;
    },
    {} as Record<string, Project[]>
  );

  // Stats
  const totalProjects = projects.length;
  const activeServers = servers.filter((s) => s.status === "running").length;
  const stageCounts = STAGES.map((s) => ({
    label: s.label,
    count: projectsByStage[s.folder]?.length || 0,
    bgColor: s.bgColor,
    textColor: s.textColor,
  }));

  // Drag & Drop handlers
  const handleDragStart = (e: DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, stageFolder: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageFolder);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleCardReorder = async (stage: string, dragName: string, dropName: string) => {
    const stageProjects = projectsByStage[stage] || [];
    const names = stageProjects.map((p) => p.name);
    const fromIdx = names.indexOf(dragName);
    const toIdx = names.indexOf(dropName);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    names.splice(fromIdx, 1);
    names.splice(toIdx, 0, dragName);
    setCardOrder((prev) => ({ ...prev, [stage]: names }));
    try {
      await apiFetch("/api/card-order", {
        method: "PUT",
        body: JSON.stringify({ stage, order: names }),
      });
    } catch {
      // Silently fail
    }
  };

  const handleDrop = (e: DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedProject || draggedProject.stage === toStage) {
      setDraggedProject(null);
      return;
    }

    // Open move modal instead of moving directly
    setMoveModal({
      projectName: draggedProject.name,
      projectLabel: draggedProject.metadata?.label,
      fromStage: draggedProject.stage,
      toStage,
    });
    setDraggedProject(null);
  };

  // Type badge helper
  const getTypeBadge = (type?: string) => {
    if (!type) return null;
    const colorMap: Record<string, string> = {
      "개인": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
      "연구": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
      "개발": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      "연구+개발": "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
    };
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${colorMap[type] || "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}>
        {type}
      </span>
    );
  };

  // Sort toggle for list view
  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Sorted projects for list view
  const sortedListProjects = [...kanbanProjects].sort((a, b) => {
    let va = "", vb = "";
    switch (sortKey) {
      case "name": va = (a.metadata?.label || a.name).toLowerCase(); vb = (b.metadata?.label || b.name).toLowerCase(); break;
      case "stage": va = a.stage; vb = b.stage; break;
      case "type": va = a.metadata?.유형 || "zzz"; vb = b.metadata?.유형 || "zzz"; break;
      case "importance": va = a.metadata?.["중요도"] || "0"; vb = b.metadata?.["중요도"] || "0"; break;
      case "severity": va = a.metadata?.["위급도"] || "zzz"; vb = b.metadata?.["위급도"] || "zzz"; break;
      case "urgency": va = a.metadata?.["긴급도"] || "zzz"; vb = b.metadata?.["긴급도"] || "zzz"; break;
      case "collab": va = a.metadata?.["협업"] === "collaboration" ? "a" : a.metadata?.["협업"] === "personal" ? "b" : "zzz"; vb = b.metadata?.["협업"] === "collaboration" ? "a" : b.metadata?.["협업"] === "personal" ? "b" : "zzz"; break;
      case "owner": va = a.metadata?.["오너"] || "zzz"; vb = b.metadata?.["오너"] || "zzz"; break;
      case "role": va = a.metadata?.["주도"] === "lead" ? "a" : a.metadata?.["주도"] === "member" ? "b" : "zzz"; vb = b.metadata?.["주도"] === "lead" ? "a" : b.metadata?.["주도"] === "member" ? "b" : "zzz"; break;
      case "created": va = a.metadata?.작성일 || "9999-99-99"; vb = b.metadata?.작성일 || "9999-99-99"; break;
      case "modified": va = a.last_modified || "0000-00-00"; vb = b.last_modified || "0000-00-00"; break;
      case "targetEnd": va = a.metadata?.["목표종료일"] || "9999-99-99"; vb = b.metadata?.["목표종료일"] || "9999-99-99"; break;
      case "progress": {
        const ra = parseInt(a.metadata?.subtasks_total || "0") > 0 ? Math.round(parseInt(a.metadata?.subtasks_done || "0") / parseInt(a.metadata?.subtasks_total || "1") * 100) : -1;
        const rb = parseInt(b.metadata?.subtasks_total || "0") > 0 ? Math.round(parseInt(b.metadata?.subtasks_done || "0") / parseInt(b.metadata?.subtasks_total || "1") * 100) : -1;
        const pa = ra <= 0 ? 999 : ra;
        const pb = rb <= 0 ? 999 : rb;
        const cmp2 = pa - pb;
        return sortDir === "asc" ? cmp2 : -cmp2;
      }
    }
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const theme = isDark ? DARK_THEMES[darkTheme] : LIGHT_THEMES[lightTheme];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
        <div
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
          onClick={() => router.push("/dashboard/ideas")}
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{ideaCount}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("dashboard.ideas")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {projects.filter((p) => p.stage !== "1_idea_stage").length}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("dashboard.activeProjects")}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(() => {
                  const all = projects.filter((p) => p.stage !== "1_idea_stage");
                  const counts: Record<string, number> = {};
                  for (const p of all) {
                    const nt = normalizeType(p.metadata?.["유형"] || "");
                    counts[nt] = (counts[nt] || 0) + 1;
                  }
                  const colorMap: Record<string, string> = {
                    "개인": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                    "연구": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
                    "개발": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                    "기타": "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                  };
                  return TYPE_ORDER.map((t) => (
                    <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colorMap[t]}`}>
                      {t} {counts[t] || 0}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950">
              <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{activeServers}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("dashboard.activeServers")}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          onClick={() => router.push("/dashboard/todos")}
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950">
              <ListTodo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{todoSummary.total - todoSummary.done}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("sidebar.todos")}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">todo {todoSummary.todo}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">wip {todoSummary.wip}</span>
                {todoSummary.starred > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">★ {todoSummary.starred}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap gap-1.5">
                {stageCounts.filter(s => s.count > 0).map((s) => (
                  <span
                    key={s.label}
                    className={`text-xs px-2 py-0.5 rounded-full ${s.bgColor} ${s.textColor}`}
                  >
                    {s.label}: {s.count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Board Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t("dashboard.projectBoard")}
            </h2>
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("projects.newProject")}
            </button>
          </div>
          {/* Type filter — show all actual types with rename/delete */}
          <div className="flex items-center gap-2 mr-3 flex-wrap">
              {[...new Set(projects.filter((p) => p.stage !== "1_idea_stage").map((p) => p.metadata?.["유형"] || "").filter(Boolean))].sort().map((type) => (
                <span key={type} className="inline-flex items-center gap-1">
                  <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                    <input type="checkbox" checked={typeFilters.has(type)} onChange={() => { setTypeFilters((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; }); }} className="w-3.5 h-3.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                    {type}
                  </label>
                  <button onClick={() => { setPromptDialog({ title: `Rename "${type}"`, defaultValue: type, onConfirm: async (newName) => { setPromptDialog(null); if (newName.trim() && newName.trim() !== type) { try { await apiFetch("/api/projects/rename-type", { method: "PUT", body: JSON.stringify({ old_type: type, new_type: newName.trim() }) }); loadData(); toast.success(`Renamed → "${newName.trim()}"`); } catch { toast.error("Failed"); } } } }); }} className="text-neutral-400 hover:text-indigo-500" title="Rename"><Pencil className="w-2.5 h-2.5" /></button>
                  <button onClick={() => { setConfirmDialog({ message: `Delete type "${type}" from all projects?`, onConfirm: async () => { setConfirmDialog(null); try { await apiFetch(`/api/projects/delete-type/${encodeURIComponent(type)}`, { method: "DELETE" }); loadData(); toast.success("Deleted"); } catch { toast.error("Failed"); } } }); }} className="text-neutral-400 hover:text-red-500" title="Delete"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
              {typeFilters.size > 0 && (
                <button onClick={() => setTypeFilters(new Set())} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">×</button>
              )}
          </div>
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t("dashboard.kanban")}
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              {t("dashboard.list")}
            </button>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {(["A", "B", "C", "D"] as ThemeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTheme(key)}
                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors ${
                  activeThemeKey === key
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                }`}
                title={`${isDark ? "Dark" : "Light"} Theme ${key}`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="flex gap-3 min-h-[400px]">
            {KANBAN_STAGES.map((stage) => {
              const stageProjects = projectsByStage[stage.folder] || [];
              const isDragOver = dragOverStage === stage.folder;
              const isCollapsed = collapsedStages.has(stage.folder);

              if (isCollapsed) {
                return (
                  <div
                    key={stage.folder}
                    className={`w-10 flex-shrink-0 rounded-xl border cursor-pointer transition-all ${theme.columnBorder} ${theme.column} hover:bg-neutral-200/50 dark:hover:bg-neutral-700/30`}
                    onClick={() => toggleStage(stage.folder)}
                    onDragOver={(e) => handleDragOver(e, stage.folder)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.folder)}
                    title={`${stage.label} (${stageProjects.length})`}
                  >
                    <div className="flex flex-col items-center pt-3 gap-1">
                      <span className="text-[10px] text-neutral-400">&#9654;</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${stage.textColor} [writing-mode:vertical-lr]`}>
                        {stage.label}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-1">{stageProjects.length}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={stage.folder}
                  className={`flex-1 min-w-0 flex flex-col rounded-xl border transition-colors ${
                    isDragOver
                      ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : `${theme.columnBorder} ${theme.column}`
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.folder)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.folder)}
                >
                  <div
                    className={`px-3 py-2.5 border-b ${theme.cardBorder} cursor-pointer select-none`}
                    onClick={() => toggleStage(stage.folder)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-neutral-400 rotate-90">&#9654;</span>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${stage.textColor}`}>
                          {stage.label}
                        </span>
                        {stage.sublabel && (
                          <span className="text-[10px] text-neutral-400 ml-1">
                            / {stage.sublabel}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">
                        {stageProjects.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {stageProjects.filter((p) => !isFocusHidden(p.name)).map((project) => (
                      <div
                        key={project.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, project)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverCard(project.name);
                        }}
                        onDrop={(e) => {
                          e.stopPropagation();
                          if (draggedProject && draggedProject.stage === stage.folder && draggedProject.name !== project.name) {
                            e.preventDefault();
                            handleCardReorder(stage.folder, draggedProject.name, project.name);
                            setDraggedProject(null);
                            setDragOverCard(null);
                            return;
                          }
                        }}
                        onDragLeave={() => setDragOverCard(null)}
                        onClick={() => {
                          if (focusMode && !focusActive) { handleFocusCardClick(project.name, () => toast(t("dashboard.focusModeMax"), { icon: "🔒" })); return; }
                          if (editingCard !== project.name) router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`);
                        }}
                        className={`group p-2.5 rounded-lg border transition-all cursor-pointer relative ${
                          isFocusDimmed(project.name)
                            ? "opacity-30 pointer-events-auto"
                            : "hover:shadow-sm"
                        } ${
                          getFocusBadge(project.name)
                            ? "ring-2 ring-amber-500 shadow-md"
                            : ""
                        } ${
                          draggedProject?.name === project.name
                            ? `opacity-50 ${theme.cardBorder}`
                            : dragOverCard === project.name && draggedProject?.stage === stage.folder
                            ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                            : `${theme.cardBorder} ${theme.card} ${theme.cardHover}`
                        }`}
                      >
                        {getFocusBadge(project.name) && (
                          <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-sm z-10">
                            {getFocusBadge(project.name)}
                          </span>
                        )}
                        {editingCard === project.name ? (
                          <div className="p-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                              placeholder="Label"
                            />
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
                              placeholder="Description"
                            />
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            >
                              <option value="">Not set</option>
                              {[...new Set(projects.map(p => p.metadata?.["유형"] || "").filter(Boolean))].sort().map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <button
                                onClick={async () => {
                                  try {
                                    await apiFetch(`/api/projects/${encodeURIComponent(project.name)}/metadata`, {
                                      method: "PUT",
                                      body: JSON.stringify({ metadata: { label: editLabel, description: editDesc, "유형": editType } }),
                                    });
                                    setEditingCard(null);
                                    loadData();
                                    toast.success("Saved");
                                  } catch {
                                    toast.error("Failed to save");
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCard(null)}
                                className="px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                        <>
                        <div className="flex items-start gap-1">
                          <GripVertical className="w-3 h-3 text-neutral-300 dark:text-neutral-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-neutral-900 dark:text-white truncate">
                              {project.metadata?.label || project.name}
                            </p>
                            {project.metadata?.label && (
                              <p className="text-xs text-neutral-400 truncate">{project.name}</p>
                            )}
                            {project.metadata?.description && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                                {project.metadata.description}
                              </p>
                            )}
                            <MetaTags metadata={project.metadata} compact editable onUpdate={(field, value) => {
                              apiFetch(`/api/projects/${encodeURIComponent(project.name)}/metadata`, {
                                method: "PUT",
                                body: JSON.stringify({ metadata: { [field]: value } }),
                              }).then(() => loadData()).catch(() => toast.error("Failed"));
                            }} />
                            <ProgressBar metadata={project.metadata} compact />
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {getTypeBadge(project.metadata?.유형)}
                              {(project.metadata?.작성일 || project.metadata?.["목표종료일"]) && (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  <Clock className="w-3 h-3 text-neutral-400" />
                                  {project.metadata?.작성일 && (
                                    <span className="text-neutral-500 dark:text-neutral-400">{project.metadata.작성일}</span>
                                  )}
                                  {project.metadata?.작성일 && project.metadata?.["목표종료일"] && (
                                    <span className="text-neutral-400">~</span>
                                  )}
                                  {project.metadata?.["목표종료일"] && (
                                    <span className={getTargetDateColor(project.metadata["목표종료일"], project.metadata)}>{project.metadata["목표종료일"]}</span>
                                  )}
                                </span>
                              )}
                              {project.last_modified && (
                                <span className="text-xs text-green-600 dark:text-green-400" title="Last modified">{project.last_modified.split("T")[0]}</span>
                              )}
                              {project.metadata?.포트 && (
                                <span className="text-xs text-neutral-400">:{project.metadata.포트}</span>
                              )}
                            </div>
                            {(project.metadata?.["오너"] || project.metadata?.related_people) && (() => {
                              const owner = project.metadata?.["오너"] || "";
                              const allPeople = (project.metadata?.related_people || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                              const others = allPeople.filter((p: string) => p !== owner);
                              return (
                                <div className="text-xs mt-0.5 truncate">
                                  {owner && <span className="font-semibold text-neutral-600 dark:text-neutral-300">{owner}</span>}
                                  {others.length > 0 && (
                                    <p className="text-neutral-400 truncate">{others.join(", ")}</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className={`flex items-center gap-1 mt-2 pt-1.5 border-t ${theme.cardBorder} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCard(project.name);
                              setEditLabel(project.metadata?.label || project.name);
                              setEditDesc(project.metadata?.description || "");
                              setEditType(project.metadata?.["유형"] || "");
                            }}
                            className="p-1 text-neutral-400 hover:text-indigo-500 rounded" title={t("action.edit")}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const tk = localStorage.getItem("pm_token") || "";
                              window.open(`/api/projects/${encodeURIComponent(project.name)}/download?token=${tk}`, "_blank");
                            }}
                            className="p-1 text-neutral-400 hover:text-blue-500 rounded" title={t("action.download")}
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              apiFetch(`/api/projects/${encodeURIComponent(project.name)}/clone`, { method: "POST" })
                                .then(() => { loadData(); toast.success("Cloned"); })
                                .catch(() => toast.error("Failed to clone"));
                            }}
                            className="p-1 text-neutral-400 hover:text-indigo-500 rounded" title="Clone"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              apiFetch("/api/projects/move", {
                                method: "POST",
                                body: JSON.stringify({ project_name: project.name, from_stage: project.stage, to_stage: "1_idea_stage", instruction: "" }),
                              }).then(() => { loadData(); toast.success("Moved to Ideas"); }).catch(() => toast.error("Failed"));
                            }}
                            className="p-1 text-neutral-400 hover:text-amber-500 rounded"
                            title="Move to Ideas"
                          >
                            <Lightbulb className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDialog({
                                message: `Delete "${project.metadata?.label || project.name}"?`,
                                onConfirm: () => {
                                  apiFetch(`/api/projects/move`, {
                                    method: "POST",
                                    body: JSON.stringify({ project_name: project.name, from_stage: project.stage, to_stage: "7_discarded", instruction: "" }),
                                  }).then(() => { loadData(); toast.success("Moved to trash"); }).catch(() => toast.error("Failed"));
                                  setConfirmDialog(null);
                                },
                              });
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded ml-auto" title={t("action.delete")}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        </>
                        )}
                      </div>
                    ))}
                    {stageProjects.length === 0 && (
                      <p className="text-xs text-neutral-400 text-center py-4">{t("dashboard.noProjects")}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <>
          <ListExportBar
            onPrint={() => {
              const rows = sortedListProjects.map((p) => ({
                Project: p.metadata?.label || p.name,
                Description: p.metadata?.description || "-",
                Stage: getStageByFolder(p.stage)?.label || p.stage,
                Type: p.metadata?.["유형"] || "-",
                Importance: p.metadata?.["중요도"] ? "\u2605".repeat(parseInt(p.metadata["중요도"])) : "-",
                Severity: p.metadata?.["위급도"] || "-",
                Urgency: p.metadata?.["긴급도"] || "-",
                Owner: p.metadata?.["오너"] || "-",
                People: p.metadata?.related_people || "-",
                Port: p.metadata?.["포트"]?.toString() || "-",
                "Target": p.metadata?.["목표종료일"] || "-",
                Created: p.metadata?.["작성일"] || "-",
                Modified: p.last_modified?.split("T")[0] || "-",
              }));
              printList("Active Projects", rows);
            }}
            onExportMD={() => {
              const rows = sortedListProjects.map((p) => ({
                Project: p.metadata?.label || p.name,
                Description: p.metadata?.description || "-",
                Stage: getStageByFolder(p.stage)?.label || p.stage,
                Type: p.metadata?.["유형"] || "-",
                Importance: p.metadata?.["중요도"] ? "\u2605".repeat(parseInt(p.metadata["중요도"])) : "-",
                Severity: p.metadata?.["위급도"] || "-",
                Urgency: p.metadata?.["긴급도"] || "-",
                Owner: p.metadata?.["오너"] || "-",
                People: p.metadata?.related_people || "-",
                Port: p.metadata?.["포트"]?.toString() || "-",
                "Target": p.metadata?.["목표종료일"] || "-",
                Created: p.metadata?.["작성일"] || "-",
                Modified: p.last_modified?.split("T")[0] || "-",
              }));
              downloadFile(generateMD("Active Projects", rows), "projects.md", "text/markdown");
            }}
            onExportCSV={() => {
              const rows = sortedListProjects.map((p) => ({
                Project: p.metadata?.label || p.name,
                Folder: p.name,
                Description: p.metadata?.description || "",
                Stage: getStageByFolder(p.stage)?.label || p.stage,
                Type: p.metadata?.["유형"] || "",
                Importance: p.metadata?.["중요도"] || "",
                Severity: p.metadata?.["위급도"] || "",
                Urgency: p.metadata?.["긴급도"] || "",
                Collaboration: p.metadata?.["협업"] || "",
                Owner: p.metadata?.["오너"] || "",
                People: p.metadata?.related_people || "",
                Port: p.metadata?.["포트"]?.toString() || "",
                "Target": p.metadata?.["목표종료일"] || "",
                "Actual End": p.metadata?.["실제종료일"] || "",
                Created: p.metadata?.["작성일"] || "",
                Modified: p.last_modified?.split("T")[0] || "",
              }));
              downloadFile(generateCSV(rows), "projects.csv", "text/csv");
            }}
          />
          <div className={`${theme.card} rounded-xl border ${theme.cardBorder} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none max-w-[200px]" onClick={() => toggleSort("name")}>
                    <span className="inline-flex items-center gap-1">
                      {t("dashboard.project")}
                      {sortKey === "name" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("stage")}>
                    <span className="inline-flex items-center gap-1">
                      {t("dashboard.stage")}
                      {sortKey === "stage" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none min-w-[80px]" onClick={() => toggleSort("type")}>
                    <span className="inline-flex items-center gap-1">
                      {t("dashboard.type")}
                      {sortKey === "type" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("importance")}>
                    <span className="inline-flex items-center gap-1">
                      중요도
                      {sortKey === "importance" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("severity")}>
                    <span className="inline-flex items-center gap-1">
                      엄정함
                      {sortKey === "severity" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("urgency")}>
                    <span className="inline-flex items-center gap-1">
                      긴급도
                      {sortKey === "urgency" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-32 cursor-pointer select-none" onClick={() => toggleSort("progress")}>
                    <span className="inline-flex items-center gap-1">
                      {t("dashboard.progress")}
                      {sortKey === "progress" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("collab")}>
                    <span className="inline-flex items-center gap-1">
                      Collab
                      {sortKey === "collab" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("owner")}>
                    <span className="inline-flex items-center gap-1">
                      Owner
                      {sortKey === "owner" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort("role")}>
                    <span className="inline-flex items-center gap-1">
                      Role
                      {sortKey === "role" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none min-w-[90px]" onClick={() => toggleSort("created")}>
                    <span className="inline-flex items-center gap-1">
                      Created
                      {sortKey === "created" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("targetEnd")}>
                    <span className="inline-flex items-center gap-1">
                      Target
                      {sortKey === "targetEnd" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("modified")}>
                    <span className="inline-flex items-center gap-1">
                      Modified
                      {sortKey === "modified" && <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                    </span>
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {sortedListProjects.filter((p) => !isFocusHidden(p.name)).map((project) => {
                  const pStage = getStageByFolder(project.stage);
                  return (
                    <tr
                      key={project.name}
                      onClick={() => {
                        if (focusMode && !focusActive) { handleFocusCardClick(project.name, () => toast(t("dashboard.focusModeMax"), { icon: "🔒" })); return; }
                        router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`);
                      }}
                      className={`cursor-pointer transition-all ${
                        isFocusDimmed(project.name)
                          ? "opacity-30"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      } ${getFocusBadge(project.name) ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getFocusBadge(project.name) && (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {getFocusBadge(project.name)}
                            </span>
                          )}
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {project.metadata?.label || project.name}
                          </p>
                          {project.metadata?.label && (
                            <p className="text-xs text-neutral-400">{project.name}</p>
                          )}
                          {project.metadata?.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                              {project.metadata.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                          {pStage?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {project.metadata?.유형 || "-"}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {(() => { const v = parseInt(project.metadata?.["중요도"] || "0"); return v > 0 ? <span className="text-amber-500">{"★".repeat(v)}</span> : <span className="text-neutral-300">-</span>; })()}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {project.metadata?.["위급도"] ? <span className={`${project.metadata["위급도"] === "critical" ? "text-red-500" : project.metadata["위급도"] === "high" ? "text-orange-500" : project.metadata["위급도"] === "medium" ? "text-yellow-500" : "text-green-500"}`}>{project.metadata["위급도"]}</span> : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {project.metadata?.["긴급도"] ? <span className={`${project.metadata["긴급도"] === "urgent" ? "text-red-500" : project.metadata["긴급도"] === "high" ? "text-orange-500" : project.metadata["긴급도"] === "medium" ? "text-yellow-500" : "text-green-500"}`}>{project.metadata["긴급도"]}</span> : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ProgressBar metadata={project.metadata} compact />
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 w-8 text-right">
                            {(() => { const t = parseInt(project.metadata?.subtasks_total || "0"); const d = parseInt(project.metadata?.subtasks_done || "0"); return t > 0 ? `${Math.round(d / t * 100)}%` : "-"; })()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {project.metadata?.["협업"] === "collaboration" ? <span className="text-blue-500">Collab</span> : project.metadata?.["협업"] === "personal" ? <span className="text-neutral-400">Personal</span> : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                        {project.metadata?.["오너"] || "-"}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {project.metadata?.["주도"] === "lead" ? <span className="text-indigo-500">Lead</span> : project.metadata?.["주도"] === "member" ? <span className="text-neutral-500">Member</span> : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
                        {project.metadata?.작성일 || "-"}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {project.metadata?.["목표종료일"] ? <span className={getTargetDateColor(project.metadata["목표종료일"], project.metadata)}>{project.metadata["목표종료일"]}</span> : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
                        {project.last_modified ? project.last_modified.split("T")[0] : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`)}
                            className="p-1 text-neutral-400 hover:text-indigo-500 rounded"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              apiFetch(`/api/projects/${encodeURIComponent(project.name)}/clone`, { method: "POST" })
                                .then(() => { loadData(); toast.success("Cloned"); })
                                .catch(() => toast.error("Failed to clone"));
                            }}
                            className="p-1 text-neutral-400 hover:text-indigo-500 rounded"
                            title="Clone"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                message: `Delete "${project.metadata?.label || project.name}"?`,
                                onConfirm: () => {
                                  setConfirmDialog(null);
                                  apiFetch("/api/projects/move", {
                                    method: "POST",
                                    body: JSON.stringify({ project_name: project.name, from_stage: project.stage, to_stage: "7_discarded", instruction: "" }),
                                  }).then(() => { loadData(); toast.success("Moved to trash"); }).catch(() => toast.error("Failed"));
                                },
                              });
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded"
                            title="Delete"
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
          </>
        )}
      </div>

      {/* Move Project Modal */}
      {moveModal && (
        <MoveProjectModal
          projectName={moveModal.projectName}
          projectLabel={moveModal.projectLabel}
          fromStage={moveModal.fromStage}
          toStage={moveModal.toStage}
          onClose={() => setMoveModal(null)}
          onMoved={loadData}
        />
      )}

      <NewProjectDialog
        open={showNewProject}
        typeOptions={[...new Set(projects.map((p) => p.metadata?.["유형"] || "").filter(Boolean))].sort()}
        onCancel={() => setShowNewProject(false)}
        onConfirm={async (data) => {
          setShowNewProject(false);
          try {
            await apiFetch("/api/projects/create", {
              method: "POST",
              body: JSON.stringify({
                folder_name: data.folder,
                label: data.label,
                project_type: data.projectType,
                related_projects: data.relatedProjects,
                stage: "2_initiation_stage",
              }),
            });
            loadData();
            toast.success(`Created "${data.label}"`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />
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
        title={promptDialog?.title || ""}
        defaultValue={promptDialog?.defaultValue || ""}
        onConfirm={(val) => { promptDialog?.onConfirm(val); }}
        onCancel={() => setPromptDialog(null)}
      />
    </div>
  );
}
