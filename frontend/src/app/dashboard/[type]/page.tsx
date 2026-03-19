"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { apiFetch, FileItem } from "@/lib/api";
import {
  Loader2,
  FileText,
  Save,
  Edit3,
  X,
  Search,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Eye,
  Folder,
  ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

const MDEditor = lazy(() => import("@uiw/react-md-editor"));

const VALID_TYPES = ["documents", "notes", "learning", "issues", "guidelines"];

export default function CommonFolderPage() {
  const params = useParams();
  const { t } = useLocale();
  const type = params.type as string;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState("");  // subfolder path
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);

  // New file/folder
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);

  const isValid = VALID_TYPES.includes(type);

  const loadFiles = (path: string = currentPath) => {
    setFiles([]);
    setSelectedFile(null);
    setContent("");
    setIsEditing(false);
    setSelectMode(false);
    setSelected(new Set());
    setShowNewFile(false);
    setShowNewFolder(false);
    setLoading(true);
    const q = path ? `?subpath=${encodeURIComponent(path)}` : "";
    apiFetch<{ files: FileItem[] }>(`/api/common/${type}${q}`)
      .then((res) => setFiles(res.files || []))
      .catch(() => toast.error(t("toast.failedToLoad")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isValid) return;
    setCurrentPath("");
    loadFiles("");
  }, [type, isValid]);

  const loadFile = (filename: string) => {
    if (selectMode) {
      toggleSelect(filename);
      return;
    }
    const file = files.find((f) => f.filename === filename);
    // Folder click → drill down
    if (file && (file as any).is_directory) {
      const newPath = currentPath ? `${currentPath}/${filename}` : filename;
      setCurrentPath(newPath);
      loadFiles(newPath);
      return;
    }
    // File click → load content
    const filePath = currentPath ? `${currentPath}/${filename}` : filename;
    setSelectedFile(filename);
    setIsEditing(false);
    setShowNewFile(false);
    setShowNewFolder(false);
    apiFetch<{ content: string }>(
      `/api/common/${type}/${encodeURIComponent(filePath)}`
    )
      .then((data) => setContent(data.content))
      .catch(() => toast.error(t("toast.failedToLoadFile")));
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const fp = currentPath ? `${currentPath}/${selectedFile}` : selectedFile;
      await apiFetch(
        `/api/common/${type}/${encodeURIComponent(fp)}`,
        { method: "PUT", body: JSON.stringify({ content: editContent }) }
      );
      setContent(editContent);
      setIsEditing(false);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.failedToSave"));
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (filename: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(filename) ? next.delete(filename) : next.add(filename);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((f) => f.filename)));
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} file${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeletingBatch(true);
    let deleted = 0;
    for (const filename of selected) {
      try {
        await apiFetch(`/api/common/${type}/${encodeURIComponent(filename)}`, {
          method: "DELETE",
        });
        deleted++;
      } catch {
        // Continue
      }
    }
    setFiles((prev) => prev.filter((f) => !selected.has(f.filename)));
    if (selectedFile && selected.has(selectedFile)) {
      setSelectedFile(null);
      setContent("");
    }
    setSelected(new Set());
    setSelectMode(false);
    setDeletingBatch(false);
    toast.success(`${t("toast.deleted")} ${deleted} ${t("file.files")}`);
  };

  const createNewFile = async () => {
    if (!newFileName.trim()) return;
    const filename = newFileName.endsWith(".md") ? newFileName : `${newFileName}.md`;
    setCreatingFile(true);
    try {
      await apiFetch(`/api/common/${type}/${encodeURIComponent(filename)}`, {
        method: "PUT",
        body: JSON.stringify({ content: newFileContent || `# ${newFileName.replace(/\.md$/, "")}\n\n` }),
      });
      // Reload file list
      const res = await apiFetch<{ files: FileItem[] }>(`/api/common/${type}`);
      setFiles(res.files || []);
      setShowNewFile(false);
      setNewFileName("");
      setNewFileContent("");
      // Select the new file
      setSelectedFile(filename);
      setContent(newFileContent || `# ${newFileName.replace(/\.md$/, "")}\n\n`);
      toast.success(`${t("toast.created")} ${filename}`);
    } catch {
      toast.error(t("toast.failedToCreateFile"));
    } finally {
      setCreatingFile(false);
    }
  };

  const filtered = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  if (!isValid) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Page not found</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* File List Panel */}
      <div className="w-72 flex-shrink-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
        {/* Path bar */}
        {currentPath && (
          <button
            onClick={() => {
              const parts = currentPath.split("/");
              parts.pop();
              const parent = parts.join("/");
              setCurrentPath(parent);
              loadFiles(parent);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-b border-neutral-100 dark:border-neutral-800 w-full"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="truncate font-mono">{currentPath}</span>
          </button>
        )}

        {/* Toolbar */}
        <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("file.searchFiles")}
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("action.new")}
            </button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden w-32">
                  <button
                    onClick={() => { setShowNewFile(true); setShowNewFolder(false); setSelectedFile(null); setShowNewMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" /> {t("files.newFile")}
                  </button>
                  <button
                    onClick={() => { setShowNewFolder(true); setShowNewFile(false); setSelectedFile(null); setShowNewMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500" /> {t("files.newFolder")}
                  </button>
                </div>
              </>
            )}
            </div>
            <button
              onClick={() => {
                setSelectMode(!selectMode);
                if (selectMode) setSelected(new Set());
              }}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                selectMode
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {t("action.select")}
            </button>
            {selectMode && selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deletingBatch}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors ml-auto"
              >
                {deletingBatch ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete ({selected.size})
              </button>
            )}
            {selectMode && (
              <button
                onClick={selectAll}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-auto px-1"
              >
                {selected.size === filtered.length ? t("action.none") : t("action.all")}
              </button>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {filtered.map((file) => (
            <div
              key={file.filename}
              className={`flex items-center group ${
                selectedFile === file.filename
                  ? "bg-indigo-50 dark:bg-indigo-950"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {selectMode && (
                <button
                  onClick={() => toggleSelect(file.filename)}
                  className="pl-3 pr-1 py-2.5"
                >
                  {selected.has(file.filename) ? (
                    <CheckSquare className="w-4 h-4 text-red-500" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-400" />
                  )}
                </button>
              )}
              <button
                onClick={() => loadFile(file.filename)}
                className={`flex-1 text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                  selectedFile === file.filename
                    ? "text-indigo-700 dark:text-indigo-300"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {(file as any).is_directory ? <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" /> : <FileText className="w-4 h-4 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="truncate">{file.filename}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </button>
              {!selectMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${file.filename}"?`)) return;
                    apiFetch(`/api/common/${type}/${encodeURIComponent(file.filename)}`, { method: "DELETE" })
                      .then(() => {
                        setFiles((prev) => prev.filter((f) => f.filename !== file.filename));
                        if (selectedFile === file.filename) {
                          setSelectedFile(null);
                          setContent("");
                        }
                        toast.success(t("toast.deleted"));
                      })
                      .catch(() => toast.error(t("toast.failedToDelete")));
                  }}
                  className="p-1.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-400 transition-all"
                  title={t("action.delete")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-sm text-neutral-400 text-center">
              {files.length === 0 ? t("file.noFiles") : t("file.noMatches")}
            </p>
          )}
        </div>

        <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-xs text-neutral-400">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Content Panel */}
      <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
        {/* New folder form */}
        {showNewFolder ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-80 space-y-3">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("files.newFolder")}</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="folder-name"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    apiFetch(`/api/common/${type}/folders`, {
                      method: "POST",
                      body: JSON.stringify({ folder_name: newFolderName.trim() }),
                    })
                      .then(async () => {
                        const res = await apiFetch<{ files: FileItem[] }>(`/api/common/${type}`);
                        setFiles(res.files || []);
                        setShowNewFolder(false);
                        setNewFolderName("");
                        toast.success(t("toast.created"));
                      })
                      .catch(() => toast.error(t("toast.failedToCreate")));
                  }
                  if (e.key === "Escape") setShowNewFolder(false);
                }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNewFolder(false)} className="px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">{t("action.cancel")}</button>
                <button
                  onClick={() => {
                    if (!newFolderName.trim()) return;
                    apiFetch(`/api/common/${type}/folders`, {
                      method: "POST",
                      body: JSON.stringify({ folder_name: newFolderName.trim() }),
                    })
                      .then(async () => {
                        const res = await apiFetch<{ files: FileItem[] }>(`/api/common/${type}`);
                        setFiles(res.files || []);
                        setShowNewFolder(false);
                        setNewFolderName("");
                        toast.success(t("toast.created"));
                      })
                      .catch(() => toast.error(t("toast.failedToCreate")));
                  }}
                  disabled={!newFolderName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Folder className="w-4 h-4" /> {t("action.create")}
                </button>
              </div>
            </div>
          </div>
        ) : showNewFile ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {t("file.newFile")}
              </span>
              <button
                onClick={() => setShowNewFile(false)}
                className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="filename.md"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") createNewFile(); }}
              />
            </div>
            <div className="flex-1 overflow-hidden" data-color-mode="dark">
              <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>}>
                <MDEditor
                  value={newFileContent}
                  onChange={(v) => setNewFileContent(v || "")}
                  height="100%"
                  preview="edit"
                />
              </Suspense>
            </div>
            <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setShowNewFile(false)}
                className="px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                {t("action.cancel")}
              </button>
              <button
                onClick={createNewFile}
                disabled={creatingFile || !newFileName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {creatingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t("action.create")}
              </button>
            </div>
          </>
        ) : selectedFile ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {selectedFile}
              </span>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={saveFile}
                      disabled={saving}
                      className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Save"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditContent(content); setIsEditing(true); }}
                      className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete "${selectedFile}"?`)) return;
                        apiFetch(`/api/common/${type}/${encodeURIComponent(selectedFile)}`, { method: "DELETE" })
                          .then(() => {
                            setFiles((prev) => prev.filter((f) => f.filename !== selectedFile));
                            setSelectedFile(null);
                            setContent("");
                            toast.success(t("toast.deleted"));
                          })
                          .catch(() => toast.error(t("toast.failedToDelete")));
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 transition-colors"
                      title={t("action.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto" data-color-mode="dark">
              {isEditing ? (
                <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
                  <MDEditor
                    value={editContent}
                    onChange={(v) => setEditContent(v || "")}
                    height="100%"
                    preview="live"
                  />
                </Suspense>
              ) : (
                <pre className="p-4 text-sm font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">
                  {content}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-400">
            {t("project.selectFileOrCreate")}
          </div>
        )}
      </div>
    </div>
  );
}
