"use client";

import { useEffect, useState } from "react";
import { apiFetch, Project } from "@/lib/api";
import {
  Loader2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

export default function TrashPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      const res = await apiFetch<{ projects: Project[] }>("/api/projects");
      setItems(
        (res.projects || []).filter((p) => p.stage === "7_discarded")
      );
    } catch {
      toast.error(t("toast.failedToLoadTrash"));
    } finally {
      setLoading(false);
    }
  };

  const restoreProject = async (name: string) => {
    setActionLoading(name);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}/restore`, {
        method: "POST",
        body: JSON.stringify({ target_stage: "1_idea_stage" }),
      });
      setItems((prev) => prev.filter((p) => p.name !== name));
      toast.success(`"${name}" restored to Ideas`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.failedToRestore"));
    } finally {
      setActionLoading(null);
    }
  };

  const permanentDelete = async (name: string) => {
    setActionLoading(name);
    try {
      await apiFetch(`/api/projects/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((p) => p.name !== name));
      setConfirmDelete(null);
      toast.success(`"${name}" permanently deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.failedToDelete"));
    } finally {
      setActionLoading(null);
    }
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
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950">
          <Trash2 className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            Trash
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {items.length} {t("trash.discardedItems")}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Trash2 className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-neutral-500 dark:text-neutral-400">{t("trash.empty")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item) => (
                <tr key={item.name} className="group">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {item.metadata?.label || item.name}
                      </p>
                      {item.metadata?.label && (
                        <p className="text-xs text-neutral-400 font-mono">{item.name}</p>
                      )}
                      {item.metadata?.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                          {item.metadata.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                    {item.metadata?.["유형"] || "-"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.metadata?.["작성일"] || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {confirmDelete === item.name ? (
                        <>
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t("trash.permanent")}
                          </span>
                          <button
                            onClick={() => permanentDelete(item.name)}
                            disabled={actionLoading === item.name}
                            className="px-2.5 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-40 transition-colors"
                          >
                            {actionLoading === item.name ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              t("action.confirm")
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2.5 py-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded text-xs hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                          >
                            {t("action.cancel")}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => restoreProject(item.name)}
                            disabled={actionLoading === item.name}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-950/50 disabled:opacity-40 transition-colors"
                          >
                            {actionLoading === item.name ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            {t("action.restore")}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(item.name)}
                            className="flex items-center gap-1 px-2.5 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded text-xs transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            {t("action.delete")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
