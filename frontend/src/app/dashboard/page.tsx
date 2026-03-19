"use client";

import { useEffect, useState, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project, ServerStatus } from "@/lib/api";
import { STAGES, KANBAN_STAGES, getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import { FolderKanban, Server, Layers, Loader2, GripVertical, Lightbulb, LayoutGrid, List, Clock, Pencil, Trash2, Download, Plus } from "lucide-react";
import { MetaTags } from "@/components/MetaTags";
import { ProgressBar } from "@/components/ProgressBar";
import { MoveProjectModal } from "@/components/MoveProjectModal";
import { useLocale } from "@/lib/i18n";
import toast from "react-hot-toast";

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, serversRes, orderRes] = await Promise.all([
        apiFetch<{ projects: Project[] }>("/api/projects"),
        apiFetch<{ servers: ServerStatus[] }>("/api/servers/status").catch(() => ({ servers: [] })),
        apiFetch<Record<string, string[]>>("/api/card-order").catch(() => ({})),
      ]);
      setProjects(projectsRes.projects || []);
      setServers(serversRes.servers || []);
      setCardOrder(orderRes || {});
    } catch (err) {
      toast.error(t("toast.failedToLoadData"));
    } finally {
      setLoading(false);
    }
  };

  // Filter out idea-stage projects for kanban (ideas have their own page)
  const kanbanProjects = projects.filter((p) => p.stage !== "1_idea_stage");
  const ideaCount = projects.filter((p) => p.stage === "1_idea_stage").length;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
          onClick={() => router.push("/dashboard/ideas")}
        >
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950">
              <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{kanbanProjects.length}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("dashboard.activeProjects")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950">
              <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{activeServers}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("dashboard.activeServers")}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">{t("dashboard.byStage")}</p>
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
              onClick={() => {
                const folder = prompt(t("ideas.folderName"));
                if (!folder?.trim()) return;
                const label = prompt(t("ideas.displayName")) || folder;
                apiFetch("/api/projects/create", {
                  method: "POST",
                  body: JSON.stringify({
                    folder_name: folder.trim().toLowerCase().replace(/\s+/g, "-"),
                    label,
                    stage: "2_initiation_stage",
                  }),
                }).then(() => { loadData(); toast.success(`Created "${label}"`); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("projects.newProject")}
            </button>
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
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="grid grid-cols-5 gap-3 min-h-[400px]">
            {KANBAN_STAGES.map((stage) => {
              const stageProjects = projectsByStage[stage.folder] || [];
              const isDragOver = dragOverStage === stage.folder;
              return (
                <div
                  key={stage.folder}
                  className={`flex flex-col rounded-xl border transition-colors ${
                    isDragOver
                      ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.folder)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.folder)}
                >
                  <div className="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${stage.textColor}`}>
                          {stage.label}
                        </span>
                        {stage.sublabel && (
                          <span className="text-[10px] text-neutral-400 ml-1.5">
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
                    {stageProjects.map((project) => (
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
                        onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`)}
                        className={`group p-2.5 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                          draggedProject?.name === project.name
                            ? "opacity-50 border-neutral-100 dark:border-neutral-800"
                            : dragOverCard === project.name && draggedProject?.stage === stage.folder
                            ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                            : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-indigo-300 dark:hover:border-indigo-700"
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
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
                            <MetaTags metadata={project.metadata} compact />
                            <ProgressBar metadata={project.metadata} compact />
                            <div className="flex items-center gap-1 mt-1">
                              {getTypeBadge(project.metadata?.유형)}
                              {project.metadata?.작성일 && (
                                <span className="text-xs text-neutral-400">
                                  {project.metadata.작성일}
                                </span>
                              )}
                              {project.metadata?.포트 && (
                                <span className="text-xs text-neutral-400">
                                  :{project.metadata.포트}
                                </span>
                              )}
                            </div>
                            {project.metadata?.["목표종료일"] && (
                              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {project.metadata["목표종료일"]}
                              </p>
                            )}
                            {project.metadata?.related_people && (
                              <p className="text-xs text-neutral-400 mt-0.5 truncate">
                                {project.metadata.related_people}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`); }}
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
                              if (!confirm(`Delete "${project.metadata?.label || project.name}"?`)) return;
                              apiFetch(`/api/projects/move`, {
                                method: "POST",
                                body: JSON.stringify({ project_name: project.name, from_stage: project.stage, to_stage: "7_discarded", instruction: "" }),
                              }).then(() => { loadData(); toast.success("Moved to trash"); }).catch(() => toast.error("Failed"));
                            }}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded ml-auto" title={t("action.delete")}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t("dashboard.project")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t("dashboard.stage")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t("dashboard.type")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t("dashboard.tags")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-32">{t("dashboard.progress")}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t("dashboard.created")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {kanbanProjects.map((project) => {
                  const pStage = getStageByFolder(project.stage);
                  return (
                    <tr
                      key={project.name}
                      onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
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
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                          {pStage?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {project.metadata?.유형 || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <MetaTags metadata={project.metadata} compact />
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar metadata={project.metadata} compact />
                      </td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                        {project.metadata?.작성일 || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
