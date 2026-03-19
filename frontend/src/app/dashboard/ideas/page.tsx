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
} from "lucide-react";
import toast from "react-hot-toast";
import { MetaTags } from "@/components/MetaTags";
import { MoveProjectModal } from "@/components/MoveProjectModal";
import { useLocale } from "@/lib/i18n";

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
  const [promoting, setPromoting] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<string | null>(null);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("");
  const [creating, setCreating] = useState(false);

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

  const discardIdea = async (name: string) => {
    if (!confirm(`Discard "${name}"? (moves to 7_discarded)`)) return;
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

  const filtered = ideas.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.metadata?.description || "").toLowerCase().includes(search.toLowerCase())
  );

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
          <button
            onClick={() => setShowNewIdea(!showNewIdea)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
          >
            {showNewIdea ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showNewIdea ? t("common.cancel") : t("ideas.newIdea")}
          </button>
        </div>
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

      {/* Ideas Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {ideas.length === 0 ? t("ideas.noIdeas") : t("ideas.noMatching")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((idea) => {
            const typeClass = Object.entries(typeColors).find(
              ([k]) => idea.metadata?.["유형"]?.includes(k)
            )?.[1] || typeColors["Untyped"];

            return (
              <div
                key={idea.name}
                className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-4 ${typeClass} overflow-hidden hover:shadow-md transition-shadow`}
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
                    {idea.metadata?.["유형"] && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Tag className="w-3 h-3" />
                        {idea.metadata["유형"]}
                      </span>
                    )}
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
                    {idea.has_docs && (
                      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <FileText className="w-3 h-3" />
                        docs
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex border-t border-neutral-100 dark:border-neutral-800">
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
                  <div className="w-px bg-neutral-100 dark:bg-neutral-800" />
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
    </div>
  );
}
