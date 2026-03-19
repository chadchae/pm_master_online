"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, Project } from "@/lib/api";
import { getStageBadgeClasses, getStageByFolder } from "@/lib/stages";
import { Loader2, Search, FolderOpen } from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch<{ projects: Project[] }>("/api/projects")
      .then((res) => setProjects(res.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Project list */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Stage
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Port
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Last Modified
              </th>
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
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {project.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStageBadgeClasses(project.stage)}`}>
                      {stage?.label || project.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {project.metadata?.유형 || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {project.metadata?.포트 || "-"}
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
    </div>
  );
}
