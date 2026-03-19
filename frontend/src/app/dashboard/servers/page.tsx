"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, ServerStatus } from "@/lib/api";
import {
  Loader2,
  Play,
  Square,
  RotateCw,
  Circle,
  RefreshCw,
  FileText,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

export default function ServersPage() {
  const { t } = useLocale();
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [logProject, setLogProject] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const loadServers = useCallback(async () => {
    try {
      const data = await apiFetch<{ servers: ServerStatus[] }>("/api/servers/status");
      setServers(data.servers || []);
    } catch {
      // Silently fail on auto-refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
    const interval = setInterval(loadServers, 10000);
    return () => clearInterval(interval);
  }, [loadServers]);

  const handleAction = async (project: string, action: "start" | "stop" | "restart") => {
    setActionLoading(`${project}-${action}`);
    try {
      const data = await apiFetch<{ success: boolean; message: string }>(
        `/api/servers/${encodeURIComponent(project)}/${action}`,
        { method: "POST" }
      );
      toast.success(data.message || `${action} successful`);
      // Reload server status after action
      setTimeout(loadServers, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Fetch logs for a project
  const fetchLogs = useCallback(async (projectName: string) => {
    setLogLoading(true);
    try {
      const data = await apiFetch<{ lines: string[]; project: string }>(
        `/api/servers/${encodeURIComponent(projectName)}/logs?lines=100`
      );
      setLogLines(data.lines || []);
    } catch {
      setLogLines([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  // Open log viewer
  const openLogs = useCallback((projectName: string) => {
    setLogProject(projectName);
    fetchLogs(projectName);
  }, [fetchLogs]);

  // Auto-refresh logs every 5 seconds when panel is open
  useEffect(() => {
    if (!logProject) return;
    const interval = setInterval(() => fetchLogs(logProject), 5000);
    return () => clearInterval(interval);
  }, [logProject, fetchLogs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <Circle className="w-2.5 h-2.5 fill-current" />
            <span className="text-sm">{t("servers.running")}</span>
          </span>
        );
      case "stopped":
        return (
          <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <Circle className="w-2.5 h-2.5" />
            <span className="text-sm">{t("servers.stopped")}</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-amber-500">
            <Circle className="w-2.5 h-2.5 fill-current" />
            <span className="text-sm">{status}</span>
          </span>
        );
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t("servers.autoRefresh")}
        </p>
        <button
          onClick={loadServers}
          className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t("action.refresh")}
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t("servers.project")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t("servers.port")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t("servers.status")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                PID
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t("servers.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {servers.map((server) => (
              <tr key={server.project_name} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {server.project_name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                    {server.port || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">{getStatusBadge(server.status)}</td>
                <td className="px-4 py-3">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                    {server.pid || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {server.status !== "running" && (
                      <button
                        onClick={() => handleAction(server.project_name, "start")}
                        disabled={actionLoading !== null}
                        className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-950 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                        title="Start"
                      >
                        {actionLoading === `${server.project_name}-start` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {server.status === "running" && (
                      <button
                        onClick={() => handleAction(server.project_name, "stop")}
                        disabled={actionLoading !== null}
                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                        title="Stop"
                      >
                        {actionLoading === `${server.project_name}-stop` ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(server.project_name, "restart")}
                      disabled={actionLoading !== null}
                      className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 transition-colors disabled:opacity-50"
                      title="Restart"
                    >
                      {actionLoading === `${server.project_name}-restart` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openLogs(server.project_name)}
                      className="p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title={t("server.viewLogs")}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {servers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-400">
                  {t("servers.noServers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Log viewer modal */}
      {logProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
              <h3 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("server.logs")} — {logProject}
              </h3>
              <button
                onClick={() => setLogProject(null)}
                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Log content */}
            <div className="flex-1 overflow-auto p-4">
              {logLoading && logLines.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                </div>
              ) : logLines.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-8">
                  {t("server.noLogs")}
                </p>
              ) : (
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all leading-5">
                  {logLines.join("\n")}
                </pre>
              )}
            </div>
            {/* Footer */}
            <div className="px-4 py-2 border-t border-neutral-700 text-xs text-neutral-500">
              Auto-refreshing every 5s &middot; Last {logLines.length} lines
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
