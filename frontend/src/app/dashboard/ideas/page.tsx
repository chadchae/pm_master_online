"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project } from "@/lib/api";
import {
  Loader2,
  Lightbulb,
  ArrowRight,
  Trash2,
  FileText,
  Calendar,
  Tag,
  Monitor,
  Search,
  Plus,
  X,
  LayoutGrid,
  List,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import { MetaTags } from "@/components/MetaTags";
import { MoveProjectModal } from "@/components/MoveProjectModal";
import { ConfirmDialog, PromptDialog } from "@/components/AppDialogs";
import { useLocale } from "@/lib/i18n";
import { ListExportBar, generateMD, generateCSV, downloadFile, printList } from "@/components/ListExportBar";

export default function IdeasPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [ideas, setIdeas] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [moveModal, setMoveModal] = useState<{
    projectName: string;
    projectLabel?: string;
    toStage: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [promoting, setPromoting] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<string | null>(null);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ title: string; defaultValue?: string; onConfirm: (val: string) => void } | null>(null);
  const [typeFilters, setTypeFilters] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pm_ideaTypeFilters");
      if (saved) { try { return new Set(JSON.parse(saved)); } catch {} }
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem("pm_ideaTypeFilters", JSON.stringify([...typeFilters]));
  }, [typeFilters]);

  useEffect(() => {
    loadIdeas();
  }, []);

  const createIdea = async () => {
    if (!newFolder.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/projects/create", {
        method: "POST",
        body: JSON.stringify({
          folder_name: newFolder.trim().toLowerCase().replace(/\s+/g, "-"),
          label: newLabel || newFolder,
          description: newDesc,
          project_type: newType,
          stage: "1_idea_stage",
        }),
      });
      toast.success(`Created "${newLabel || newFolder}"`);
      setShowNewIdea(false);
      setNewFolder(""); setNewLabel(""); setNewDesc(""); setNewType("");
      loadIdeas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const loadIdeas = async () => {
    try {
      const res = await apiFetch<{ projects: Project[] }>("/api/projects");
      setIdeas(
        (res.projects || []).filter((p) => p.stage === "1_idea_stage")
      );
    } catch {
      toast.error(t("toast.failedToLoadIdeas"));
    } finally {
      setLoading(false);
    }
  };

  const promoteToInitiation = async (name: string) => {
    setPromoting(name);
    try {
      await apiFetch("/api/projects/move", {
        method: "POST",
        body: JSON.stringify({
          project_name: name,
          from_stage: "1_idea_stage",
          to_stage: "2_initiation_stage",
        }),
      });
      setIdeas((prev) => prev.filter((p) => p.name !== name));
      toast.success(`"${name}" promoted to Initiation`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.failedToPromote"));
    } finally {
      setPromoting(null);
    }
  };

  const doDiscardIdea = async (name: string) => {
    setDiscarding(name);
    try {
      await apiFetch("/api/projects/move", {
        method: "POST",
        body: JSON.stringify({
          project_name: name,
          from_stage: "1_idea_stage",
          to_stage: "7_discarded",
        }),
      });
      setIdeas((prev) => prev.filter((p) => p.name !== name));
      toast.success(`"${name}" discarded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.failedToDiscard"));
    } finally {
      setDiscarding(null);
    }
  };

  const discardIdea = (name: string) => {
    setConfirmDialog({
      message: `Discard "${name}"? (moves to 7_discarded)`,
      onConfirm: () => {
        setConfirmDialog(null);
        doDiscardIdea(name);
      },
    });
  };

  const TYPE_ORDER = ["개인", "연구", "개발", "기타"] as const;
  const normalizeType = (t: string): string => {
    if (!t) return "기타";
    if (t === "개인" || t === "연구" || t === "개발") return t;
    if (t.includes("연구") && t.includes("개발")) return "연구";
    return "기타";
  };

  const filtered = ideas.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.metadata?.description || "").toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (typeFilters.size === 0) return true;
    return typeFilters.has(p.metadata?.["유형"] || "");
  });

  // Group by type
  const byType: Record<string, Project[]> = {};
  for (const p of filtered) {
    const type = p.metadata?.["유형"] || "Untyped";
    if (!byType[type]) byType[type] = [];
    byType[type].push(p);
  }

  const typeColors: Record<string, string> = {
    "연구": "border-l-cyan-500",
    "개발": "border-l-orange-500",
    "연구+개발": "border-l-violet-500",
    "연구 프로젝트 (논문)": "border-l-cyan-500",
    "연구 + 개발 프로젝트": "border-l-violet-500",
    "Untyped": "border-l-neutral-300 dark:border-l-neutral-600",
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    let va = "", vb = "";
    switch (sortKey) {
      case "name": va = (a.metadata?.label || a.name).toLowerCase(); vb = (b.metadata?.label || b.name).toLowerCase(); break;
      case "type": va = a.metadata?.["유형"] || ""; vb = b.metadata?.["유형"] || ""; break;
      case "importance": va = a.metadata?.["중요도"] || "0"; vb = b.metadata?.["중요도"] || "0"; break;
      case "severity": va = a.metadata?.["위급도"] || ""; vb = b.metadata?.["위급도"] || ""; break;
      case "urgency": va = a.metadata?.["긴급도"] || ""; vb = b.metadata?.["긴급도"] || ""; break;
      case "created": va = a.metadata?.["작성일"] || ""; vb = b.metadata?.["작성일"] || ""; break;
      case "modified": va = a.last_modified || ""; vb = b.last_modified || ""; break;
    }
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950">
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
              Ideas
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {ideas.length} {t("ideas.inPipeline")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ideas.search")}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
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
              Cards
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
              List
            </button>
          </div>
          <button
            onClick={() => setShowNewIdea(!showNewIdea)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
          >
            {showNewIdea ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showNewIdea ? t("common.cancel") : t("ideas.newIdea")}
          </button>
        </div>
      </div>

      {/* Type filter row — show all actual types */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">Type:</span>
        {[...new Set(ideas.map((p) => p.metadata?.["유형"] || "").filter(Boolean))].sort().map((type) => (
          <span key={type} className="inline-flex items-center gap-1">
            <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input type="checkbox" checked={typeFilters.has(type)} onChange={() => { setTypeFilters((prev) => { const next = new Set(prev); next.has(type) ? next.delete(type) : next.add(type); return next; }); }} className="w-3.5 h-3.5 rounded border-neutral-300 text-amber-600 focus:ring-amber-500" />
              {type}
            </label>
            <button onClick={() => { setPromptDialog({ title: `Rename "${type}"`, defaultValue: type, onConfirm: async (newName) => { setPromptDialog(null); if (newName.trim() && newName.trim() !== type) { try { await apiFetch("/api/projects/rename-type", { method: "PUT", body: JSON.stringify({ old_type: type, new_type: newName.trim() }) }); loadIdeas(); toast.success(`Renamed → "${newName.trim()}"`); } catch { toast.error("Failed"); } } } }); }} className="text-neutral-400 hover:text-indigo-500" title="Rename"><Pencil className="w-2.5 h-2.5" /></button>
            <button onClick={() => { setConfirmDialog({ message: `Delete type "${type}" from all projects?`, onConfirm: async () => { setConfirmDialog(null); try { await apiFetch(`/api/projects/delete-type/${encodeURIComponent(type)}`, { method: "DELETE" }); loadIdeas(); toast.success("Deleted"); } catch { toast.error("Failed"); } } }); }} className="text-neutral-400 hover:text-red-500" title="Delete"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
        {typeFilters.size > 0 && (
          <button onClick={() => setTypeFilters(new Set())} className="text-xs text-neutral-400 hover:text-neutral-600">×</button>
        )}
      </div>

      {/* New Idea Form */}
      {showNewIdea && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-amber-200 dark:border-amber-800 p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">{t("ideas.folderName")} *</label>
              <input type="text" value={newFolder} onChange={(e) => setNewFolder(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="my-new-idea" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">{t("ideas.displayName")}</label>
              <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="My New Idea" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">{t("ideas.description")}</label>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={2} placeholder="What is this idea about?" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">{t("ideas.type")}</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500">
                <option value="">-</option>
                <option value="개발">개발</option>
                <option value="연구">연구</option>
                <option value="연구+개발">연구+개발</option>
              </select>
            </div>
            <div className="flex-1" />
            <button onClick={() => setShowNewIdea(false)} className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">{t("common.cancel")}</button>
            <button onClick={createIdea} disabled={creating || !newFolder.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-40 transition-colors">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t("common.create")}
            </button>
          </div>
        </div>
      )}

      {/* Ideas Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {ideas.length === 0 ? t("ideas.noIdeas") : t("ideas.noMatching")}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((idea) => {
            const typeClass = Object.entries(typeColors).find(
              ([k]) => idea.metadata?.["유형"]?.includes(k)
            )?.[1] || typeColors["Untyped"];

            return (
              <div
                key={idea.name}
                className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-800 border-l-4 ${typeClass} overflow-hidden hover:shadow-md transition-shadow`}
              >
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    router.push(
                      `/dashboard/projects/${encodeURIComponent(idea.name)}`
                    )
                  }
                >
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {idea.metadata?.label || idea.name}
                  </h3>
                  {idea.metadata?.label && (
                    <p className="text-xs text-neutral-400 font-mono">{idea.name}</p>
                  )}
                  {idea.metadata?.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed line-clamp-3">
                      {idea.metadata.description}
                    </p>
                  )}
                  <div className="mt-2">
                    <MetaTags metadata={idea.metadata} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {idea.metadata?.["유형"] && (() => {
                      const t = idea.metadata["유형"];
                      const colors: Record<string, string> = {
                        "개인": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                        "연구": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
                        "개발": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                        "사업": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                      };
                      return <span className={`text-xs px-1.5 py-0.5 rounded ${colors[t] || "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}>{t}</span>;
                    })()}
                    {idea.metadata?.["포트"] && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Monitor className="w-3 h-3" />
                        :{idea.metadata["포트"]}
                      </span>
                    )}
                    {idea.metadata?.["작성일"] && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Calendar className="w-3 h-3" />
                        {idea.metadata["작성일"]}
                      </span>
                    )}
                    {idea.last_modified && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {idea.last_modified.split("T")[0]}
                      </span>
                    )}
                    {idea.has_docs && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <FileText className="w-3 h-3" />
                        docs
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => setMoveModal({
                      projectName: idea.name,
                      projectLabel: idea.metadata?.label,
                      toStage: "2_initiation_stage",
                    })}
                    disabled={promoting === idea.name}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors disabled:opacity-40"
                  >
                    {promoting === idea.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    {t("ideas.promoteToInitiation")}
                  </button>
                  <div className="w-px bg-neutral-200 dark:bg-neutral-800" />
                  <button
                    onClick={() => discardIdea(idea.name)}
                    disabled={discarding === idea.name}
                    className="flex items-center justify-center px-3 py-2 text-xs text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                    title="Discard"
                  >
                    {discarding === idea.name ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <>
        <ListExportBar
          onPrint={() => {
            const rows = sortedFiltered.map((idea) => ({
              Project: idea.metadata?.label || idea.name,
              Type: idea.metadata?.["유형"] || "-",
              Importance: idea.metadata?.["중요도"] ? "\u2605".repeat(parseInt(idea.metadata["중요도"])) : "-",
              Severity: idea.metadata?.["위급도"] || "-",
              Urgency: idea.metadata?.["긴급도"] || "-",
              Created: idea.metadata?.["작성일"] || "-",
              Modified: idea.last_modified?.split("T")[0] || "-",
            }));
            printList("Ideas", rows);
          }}
          onExportMD={() => {
            const rows = sortedFiltered.map((idea) => ({
              Project: idea.metadata?.label || idea.name,
              Type: idea.metadata?.["유형"] || "-",
              Importance: idea.metadata?.["중요도"] ? "\u2605".repeat(parseInt(idea.metadata["중요도"])) : "-",
              Severity: idea.metadata?.["위급도"] || "-",
              Urgency: idea.metadata?.["긴급도"] || "-",
              Created: idea.metadata?.["작성일"] || "-",
              Modified: idea.last_modified?.split("T")[0] || "-",
            }));
            downloadFile(generateMD("Ideas", rows), "ideas.md", "text/markdown");
          }}
          onExportCSV={() => {
            const rows = sortedFiltered.map((idea) => ({
              Project: idea.metadata?.label || idea.name,
              Folder: idea.name,
              Type: idea.metadata?.["유형"] || "",
              Importance: idea.metadata?.["중요도"] || "",
              Severity: idea.metadata?.["위급도"] || "",
              Urgency: idea.metadata?.["긴급도"] || "",
              Created: idea.metadata?.["작성일"] || "",
              Modified: idea.last_modified?.split("T")[0] || "",
            }));
            downloadFile(generateCSV(rows), "ideas.csv", "text/csv");
          }}
        />
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">
                    Project
                    {sortKey === "name" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("type")}>
                  <span className="inline-flex items-center gap-1">
                    Type
                    {sortKey === "type" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("importance")}>
                  <span className="inline-flex items-center gap-1">
                    Importance
                    {sortKey === "importance" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("severity")}>
                  <span className="inline-flex items-center gap-1">
                    Severity
                    {sortKey === "severity" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("urgency")}>
                  <span className="inline-flex items-center gap-1">
                    Urgency
                    {sortKey === "urgency" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("created")}>
                  <span className="inline-flex items-center gap-1">
                    Created
                    {sortKey === "created" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("modified")}>
                  <span className="inline-flex items-center gap-1">
                    Modified
                    {sortKey === "modified" && <span className="text-amber-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>}
                  </span>
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {sortedFiltered.map((idea) => (
                <tr
                  key={idea.name}
                  onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(idea.name)}`)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {idea.metadata?.label || idea.name}
                      </p>
                      {idea.metadata?.label && (
                        <p className="text-xs text-neutral-400 font-mono">{idea.name}</p>
                      )}
                      {idea.metadata?.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {idea.metadata.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {idea.metadata?.["유형"] && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                        <Tag className="w-3 h-3" />
                        {idea.metadata["유형"]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => { const v = parseInt(idea.metadata?.["중요도"] || "0"); return v > 0 ? <span className="text-amber-500">{"★".repeat(v)}</span> : <span className="text-neutral-300">-</span>; })()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {idea.metadata?.["위급도"] ? <span className={`${idea.metadata["위급도"] === "critical" ? "text-red-500" : idea.metadata["위급도"] === "high" ? "text-orange-500" : idea.metadata["위급도"] === "medium" ? "text-yellow-500" : "text-green-500"}`}>{idea.metadata["위급도"]}</span> : <span className="text-neutral-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {idea.metadata?.["긴급도"] ? <span className={`${idea.metadata["긴급도"] === "urgent" ? "text-red-500" : idea.metadata["긴급도"] === "high" ? "text-orange-500" : idea.metadata["긴급도"] === "medium" ? "text-yellow-500" : "text-green-500"}`}>{idea.metadata["긴급도"]}</span> : <span className="text-neutral-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {idea.metadata?.["작성일"] || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                    {idea.last_modified ? idea.last_modified.split("T")[0] : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMoveModal({
                          projectName: idea.name,
                          projectLabel: idea.metadata?.label,
                          toStage: "2_initiation_stage",
                        })}
                        disabled={promoting === idea.name}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors disabled:opacity-40"
                        title={t("ideas.promoteToInitiation")}
                      >
                        {promoting === idea.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => discardIdea(idea.name)}
                        disabled={discarding === idea.name}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors disabled:opacity-40"
                        title="Discard"
                      >
                        {discarding === idea.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      {/* Move Modal */}
      {moveModal && (
        <MoveProjectModal
          projectName={moveModal.projectName}
          projectLabel={moveModal.projectLabel}
          fromStage="1_idea_stage"
          toStage={moveModal.toStage}
          onClose={() => setMoveModal(null)}
          onMoved={loadIdeas}
        />
      )}
      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message || ""}
        variant="danger"
        confirmLabel="Discard"
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
