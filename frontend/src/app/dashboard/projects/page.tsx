"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project } from "@/lib/api";
import { getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import { Loader2, Search, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { MetaTags } from "@/components/MetaTags";
import { NewProjectDialog } from "@/components/AppDialogs";
import { useLocale } from "@/lib/i18n";
import toast from "react-hot-toast";

type SortKey = "name" | "stage" | "type" | "port" | "modified";
type SortDir = "asc" | "desc";

export default function ProjectsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    apiFetch<{ projects: Project[] }>("/api/projects")
      .then((res) => setProjects(res.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const filtered = projects
    .filter((p) => {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.metadata?.label || "").toLowerCase().includes(q) ||
        (p.metadata?.description || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return (a.metadata?.label || a.name).localeCompare(b.metadata?.label || b.name) * dir;
        case "stage":
          return (a.stage || "").localeCompare(b.stage || "") * dir;
        case "type":
          return (a.metadata?.["유형"] || "").localeCompare(b.metadata?.["유형"] || "") * dir;
        case "port":
          return (a.metadata?.["포트"]?.toString() || "").localeCompare(b.metadata?.["포트"]?.toString() || "") * dir;
        case "modified":
          return ((a.last_modified || "") > (b.last_modified || "") ? 1 : -1) * dir;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const columns: { key: SortKey; label: string; width?: string }[] = [
    { key: "name", label: t("sidebar.projects") },
    { key: "stage", label: t("dashboard.byStage") },
    { key: "type", label: t("ideas.type") },
    { key: "port", label: "Port" },
    { key: "modified", label: "Modified" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("action.search") + "..."}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">{filtered.length} projects</span>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("projects.newProject")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 select-none"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((project) => {
              const stage = getStageByFolder(project.stage);
              return (
                <tr
                  key={project.name}
                  onClick={() => router.push(`/dashboard/projects/${encodeURIComponent(project.name)}`)}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {project.metadata?.label || project.name}
                        </span>
                      </div>
                      {project.metadata?.label && (
                        <p className="text-xs text-neutral-400 font-mono ml-6">{project.name}</p>
                      )}
                      {project.metadata?.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 ml-6 mt-0.5 line-clamp-1">
                          {project.metadata.description}
                        </p>
                      )}
                      <div className="ml-6 mt-1">
                        <MetaTags metadata={project.metadata} compact />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                      {stage?.label || project.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {project.metadata?.["유형"] || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                    {project.metadata?.["포트"] || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {project.last_modified
                      ? new Date(project.last_modified).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">
                  No projects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <NewProjectDialog
        open={showNewProject}
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
                stage: "2_initiation_stage",
              }),
            });
            window.location.reload();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          }
        }}
      />
    </div>
  );
}
