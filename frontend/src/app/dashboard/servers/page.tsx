"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch, ServerStatus } from "@/lib/api";
import {
  Loader2,
  Play,
  Square,
  RotateCw,
  Circle,
  RefreshCw,
  Terminal,
  ExternalLink,
  X,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

export default function ServersPage() {
  const { t } = useLocale();
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [logProject, setLogProject] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = useState(false);

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
      setTimeout(loadServers, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: "start-all" | "stop-all" | "restart-all") => {
    setBulkLoading(action);
    try {
      const data = await apiFetch<{ results: Array<{ project: string; success: boolean }> }>(
        `/api/servers/${action}`,
        { method: "POST" }
      );
      const succeeded = data.results?.filter((r) => r.success).length ?? 0;
      const total = data.results?.length ?? 0;
      toast.success(`${action.replace("-all", "")}: ${succeeded}/${total} servers`);
      setTimeout(loadServers, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setBulkLoading(null);
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
  const openLogs = useCallback(
    (projectName: string) => {
      if (logProject === projectName) {
        setLogProject(null);
        return;
      }
      setLogProject(projectName);
      fetchLogs(projectName);
    },
    [fetchLogs, logProject]
  );

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logLines]);

  // Auto-refresh logs every 5 seconds when panel is open
  useEffect(() => {
    if (!logProject) return;
    const interval = setInterval(() => fetchLogs(logProject), 5000);
    return () => clearInterval(interval);
  }, [logProject, fetchLogs]);

  const getBorderColor = (server: ServerStatus): string => {
    if (server.backend_alive || server.frontend_alive) {
      return "border-l-green-500";
    }
    if (!server.backend_port && !server.frontend_port) {
      return "border-l-neutral-300 dark:border-l-neutral-700";
    }
    return "border-l-red-400";
  };

  const openInBrowser = (server: ServerStatus) => {
    const port = server.frontend_port || server.backend_port;
    if (port) {
      window.open(`http://localhost:${port}`, "_blank");
    }
  };

  const SORT_OPTIONS = [
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
    { key: "backend_port", label: "Backend Port" },
    { key: "frontend_port", label: "Frontend Port" },
  ];

  const sortedServers = [...servers].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = (a.label || a.project_name).localeCompare(b.label || b.project_name);
        break;
      case "status": {
        const aRunning = a.backend_alive || a.frontend_alive ? 1 : 0;
        const bRunning = b.backend_alive || b.frontend_alive ? 1 : 0;
        cmp = bRunning - aRunning; // running first by default
        break;
      }
      case "backend_port":
        cmp = (a.backend_port || 0) - (b.backend_port || 0);
        break;
      case "frontend_port":
        cmp = (a.frontend_port || 0) - (b.frontend_port || 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const runningCount = servers.filter((s) => s.backend_alive || s.frontend_alive).length;
  const stoppedCount = servers.length - runningCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleBulkAction("start-all")}
            disabled={bulkLoading !== null || stoppedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-950 border border-green-200 dark:border-green-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkLoading === "start-all" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Start All
          </button>
          <button
            onClick={() => handleBulkAction("restart-all")}
            disabled={bulkLoading !== null || servers.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950 border border-amber-200 dark:border-amber-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkLoading === "restart-all" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCw className="w-3.5 h-3.5" />
            )}
            Restart All
          </button>
          <button
            onClick={() => handleBulkAction("stop-all")}
            disabled={bulkLoading !== null || runningCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950 border border-red-200 dark:border-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {bulkLoading === "stop-all" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            Stop All
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">
            {runningCount} running / {stoppedCount} stopped
          </span>
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort
              <ChevronDown className="w-3 h-3" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10 py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (sortKey === opt.key) {
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      } else {
                        setSortKey(opt.key);
                        setSortDir("asc");
                      }
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between ${
                      sortKey === opt.key
                        ? "text-indigo-600 dark:text-indigo-400 font-medium"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {opt.label}
                    {sortKey === opt.key && (
                      <span className="text-xs">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={loadServers}
            className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t("action.refresh")}
          </button>
        </div>
      </div>

      {/* Server Cards */}
      <div className="space-y-2">
        {sortedServers.map((server) => (
          <div key={server.project_name}>
            <div
              className={`bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-4 ${getBorderColor(server)} overflow-hidden`}
            >
              <div className="flex items-center px-4 py-3">
                {/* Left: Project info */}
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {server.label || server.project_name}
                  </h3>
                  {server.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {server.description}
                    </p>
                  )}
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate mt-0.5">
                    {server.path}
                  </p>
                </div>

                {/* Middle: Ports */}
                <div className="flex items-center gap-4 mr-6 shrink-0">
                  {server.backend_port && (
                    <div className="flex items-center gap-1.5">
                      <Circle
                        className={`w-2 h-2 ${
                          server.backend_alive
                            ? "fill-green-500 text-green-500"
                            : "fill-red-400 text-red-400"
                        }`}
                      />
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        BE:{server.backend_port}
                      </span>
                    </div>
                  )}
                  {server.frontend_port && (
                    <div className="flex items-center gap-1.5">
                      <Circle
                        className={`w-2 h-2 ${
                          server.frontend_alive
                            ? "fill-green-500 text-green-500"
                            : "fill-red-400 text-red-400"
                        }`}
                      />
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        FE:{server.frontend_port}
                      </span>
                    </div>
                  )}
                  {!server.backend_port && !server.frontend_port && server.port && (
                    <div className="flex items-center gap-1.5">
                      <Circle
                        className={`w-2 h-2 ${
                          server.status === "running"
                            ? "fill-green-500 text-green-500"
                            : "fill-red-400 text-red-400"
                        }`}
                      />
                      <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                        {server.port}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 shrink-0">
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
                    className={`p-1.5 rounded-md transition-colors ${
                      logProject === server.project_name
                        ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    }`}
                    title="Live Log"
                  >
                    <Terminal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openInBrowser(server)}
                    disabled={!server.frontend_alive && !server.backend_alive}
                    className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Open in Browser"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Inline Log Panel */}
            {logProject === server.project_name && (
              <div className="mt-1 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
                  <h4 className="text-xs font-medium text-neutral-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Logs -- {server.project_name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-600">
                      Auto-refresh 5s | {logLines.length} lines
                    </span>
                    <button
                      onClick={() => setLogProject(null)}
                      className="p-0.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-auto p-3">
                  {logLoading && logLines.length === 0 ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                    </div>
                  ) : logLines.length === 0 ? (
                    <p className="text-xs text-neutral-600 text-center py-6">
                      No logs available
                    </p>
                  ) : (
                    <pre className="text-[11px] font-mono text-green-400 whitespace-pre-wrap break-all leading-5">
                      {logLines.join("\n")}
                    </pre>
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>
        ))}
        {servers.length === 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-12 text-center">
            <p className="text-sm text-neutral-400">
              {t("servers.noServers")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
