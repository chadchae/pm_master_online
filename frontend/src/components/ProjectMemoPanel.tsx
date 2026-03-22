"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  X,
  Plus,
  Trash2,
  Send,
  Loader2,
  FolderKanban,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
  Folder,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

interface QuickNote {
  filename: string;
  size: number;
  last_modified: number;
}

interface ProjectItem {
  name: string;
  stage: string;
  metadata?: { label?: string };
}

interface ProjectMemoPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectMemoPanel({ open, onClose }: ProjectMemoPanelProps) {
  const { t } = useLocale();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Expand / edit
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteContents, setNoteContents] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  // Move to project
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [showProjectList, setShowProjectList] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [moving, setMoving] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ notes: QuickNote[] }>("/api/project-memos");
      setNotes(res.notes || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await apiFetch<{ projects: ProjectItem[] }>("/api/projects");
      setProjects(res.projects || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadNotes();
      loadProjects();
    }
  }, [open, loadNotes, loadProjects]);

  const loadFolders = async (projectName: string) => {
    setLoadingFolders(true);
    setFolders([]);
    setSelectedFolder("");
    try {
      const res = await apiFetch<{ folders: string[] }>(
        `/api/projects/${encodeURIComponent(projectName)}/docs-tree`
      );
      setFolders(res.folders || [""]);
    } catch {
      setFolders([""]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const createNote = async () => {
    if (!title.trim() && !content.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/project-memos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || "untitled",
          content: content.trim(),
        }),
      });
      setTitle("");
      setContent("");
      setShowNew(false);
      toast.success(t("toast.noteCreated"));
      loadNotes();
    } catch {
      toast.error(t("toast.failedToCreate"));
    } finally {
      setCreating(false);
    }
  };

  const deleteNote = async (filename: string) => {
    try {
      await apiFetch(`/api/project-memos/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      toast.success(t("toast.deleted"));
      loadNotes();
    } catch {
      toast.error(t("toast.failedToDelete"));
    }
  };

  const toggleExpand = async (filename: string) => {
    if (expandedNote === filename) {
      setExpandedNote(null);
      setEditingNote(null);
      return;
    }
    setExpandedNote(filename);
    setEditingNote(null);
    if (!noteContents[filename]) {
      setLoadingContent(filename);
      try {
        const res = await apiFetch<{ content: string }>(
          `/api/project-memos/${encodeURIComponent(filename)}`
        );
        setNoteContents((prev) => ({ ...prev, [filename]: res.content }));
      } catch {
        setNoteContents((prev) => ({
          ...prev,
          [filename]: "(failed to load)",
        }));
      } finally {
        setLoadingContent(null);
      }
    }
  };

  const startEdit = (filename: string) => {
    setEditingNote(filename);
    setEditContent(noteContents[filename] || "");
  };

  const saveEdit = async (filename: string) => {
    setSavingEdit(true);
    try {
      await apiFetch(`/api/project-memos/${encodeURIComponent(filename)}`, {
        method: "PUT",
        body: JSON.stringify({ content: editContent }),
      });
      setNoteContents((prev) => ({ ...prev, [filename]: editContent }));
      setEditingNote(null);
      toast.success("Updated");
      loadNotes();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSavingEdit(false);
    }
  };

  const openMoveTarget = (filename: string) => {
    if (moveTarget === filename) {
      setMoveTarget(null);
      return;
    }
    setMoveTarget(filename);
    setSelectedProject("");
    setShowProjectList(false);
    setProjectSearch("");
    setFolders([]);
    setSelectedFolder("");
    setExpandedFolders(new Set());
  };

  const selectProject = (p: ProjectItem) => {
    setSelectedProject(p.name);
    setShowProjectList(false);
    setProjectSearch("");
    setSelectedFolder("");
    setExpandedFolders(new Set());
    loadFolders(p.name);
  };

  const toggleFolderExpand = (folder: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const getProjectLabel = (p: ProjectItem) => p.metadata?.label || p.name;

  const filteredProjects = projects.filter((p) =>
    getProjectLabel(p).toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Build folder tree structure
  const buildFolderTree = (flatFolders: string[]) => {
    const childrenMap: Record<string, string[]> = {};
    for (const f of flatFolders) {
      if (f === "") continue;
      const parts = f.split("/");
      const parent = parts.length === 1 ? "" : parts.slice(0, -1).join("/");
      if (!childrenMap[parent]) childrenMap[parent] = [];
      childrenMap[parent].push(f);
    }
    return childrenMap;
  };

  const moveToProject = async (filename: string) => {
    if (!selectedProject) return;
    setMoving(true);
    try {
      await apiFetch("/api/project-memos/move-to-project", {
        method: "POST",
        body: JSON.stringify({
          filename,
          project_name: selectedProject,
          target_folder: selectedFolder,
        }),
      });
      const folderLabel = selectedFolder || "/";
      toast.success(`Moved to ${selectedProject}/docs/${folderLabel}`);
      setMoveTarget(null);
      loadNotes();
    } catch {
      toast.error(t("toast.failedToMove"));
    } finally {
      setMoving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative ml-auto w-96 h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-sm">{t("sidebar.projectMemo")}</span>
            <span className="text-xs text-neutral-400">_project_memo/</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNew(!showNew)}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
              title={t("quicknote.newNote")}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New note form */}
        {showNew && (
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("quicknote.titlePlaceholder")}
              className="w-full px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("quicknote.contentPlaceholder")}
              rows={4}
              className="w-full px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                onClick={createNote}
                disabled={creating || (!title.trim() && !content.trim())}
                className="px-3 py-1.5 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {creating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {t("action.save")}
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-400 text-sm">
              <FolderKanban className="w-8 h-8 mb-2 opacity-30" />
              <p>{t("quicknote.noNotes")}</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-2 text-indigo-500 hover:text-indigo-600 text-xs"
              >
                {t("quicknote.createOne")}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {notes.map((note) => {
                const isExpanded = expandedNote === note.filename;
                const isEditing = editingNote === note.filename;
                return (
                  <div key={note.filename} className="px-4 py-3 group">
                    <div className="flex items-start justify-between">
                      <button
                        onClick={() => toggleExpand(note.filename)}
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                            {note.filename.replace(/\.md$/, "")}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {(note.size / 1024).toFixed(1)} KB
                            {" · "}
                            {new Date(
                              note.last_modified * 1000
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isExpanded && !isEditing && (
                          <button
                            onClick={() => startEdit(note.filename)}
                            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-blue-500 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openMoveTarget(note.filename)}
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-500 transition-colors"
                          title="Move to Project"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteNote(note.filename)}
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Collapsible content */}
                    {isExpanded && (
                      <div className="mt-2 ml-5">
                        {loadingContent === note.filename ? (
                          <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                        ) : isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={8}
                              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setEditingNote(null)}
                                className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveEdit(note.filename)}
                                disabled={savingEdit}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-40 flex items-center gap-1"
                              >
                                {savingEdit ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap font-mono bg-neutral-50 dark:bg-neutral-800/50 rounded-md p-2 max-h-48 overflow-y-auto">
                            {noteContents[note.filename] || ""}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Move to project selector */}
                    {moveTarget === note.filename && (
                      <div className="mt-2 ml-5 space-y-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-md">
                        {/* Project select (custom dropdown) */}
                        <div className="relative">
                          <button
                            onClick={() => setShowProjectList(!showProjectList)}
                            className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-left flex items-center justify-between"
                          >
                            <span className={selectedProject ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400"}>
                              {selectedProject ? getProjectLabel(projects.find((p) => p.name === selectedProject)!) : "-- Select Project --"}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${showProjectList ? "rotate-180" : ""}`} />
                          </button>
                          {showProjectList && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-lg overflow-hidden">
                              <input
                                type="text"
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full px-2 py-1.5 text-xs border-b border-neutral-200 dark:border-neutral-700 bg-transparent focus:outline-none"
                                autoFocus
                              />
                              <div className="max-h-48 overflow-y-auto">
                                {filteredProjects.map((p, i) => (
                                  <button
                                    key={`${p.stage}/${p.name}-${i}`}
                                    onClick={() => selectProject(p)}
                                    className={`w-full text-left px-2 py-1.5 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${
                                      selectedProject === p.name ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : "text-neutral-700 dark:text-neutral-300"
                                    }`}
                                  >
                                    <p className="font-medium truncate">{getProjectLabel(p)}</p>
                                    <p className="text-neutral-400 truncate">{p.name}</p>
                                  </button>
                                ))}
                                {filteredProjects.length === 0 && (
                                  <p className="px-2 py-2 text-xs text-neutral-400 text-center">No projects found</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Folder tree (collapsible) */}
                        {selectedProject && (
                          <div>
                            {loadingFolders ? (
                              <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading folders...
                              </div>
                            ) : (() => {
                              const tree = buildFolderTree(folders);
                              const renderFolder = (path: string, depth: number): React.ReactNode => {
                                const children = tree[path] || [];
                                const hasChildren = children.length > 0;
                                const isExpanded = expandedFolders.has(path);
                                const isSelected = selectedFolder === path;
                                const name = path === "" ? "/ (docs root)" : path.split("/").pop();
                                return (
                                  <div key={path}>
                                    <div
                                      className={`flex items-center text-xs transition-colors cursor-pointer ${
                                        isSelected
                                          ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                                          : "hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300"
                                      }`}
                                      style={{ paddingLeft: `${4 + depth * 14}px` }}
                                    >
                                      {hasChildren ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleFolderExpand(path); }}
                                          className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
                                        >
                                          {isExpanded
                                            ? <ChevronDown className="w-3 h-3" />
                                            : <ChevronRight className="w-3 h-3" />
                                          }
                                        </button>
                                      ) : (
                                        <span className="w-4" />
                                      )}
                                      <button
                                        onClick={() => setSelectedFolder(path)}
                                        className="flex-1 flex items-center gap-1 py-1 text-left min-w-0"
                                      >
                                        <Folder className={`w-3 h-3 flex-shrink-0 ${path === "" ? "text-indigo-500" : "text-amber-500"}`} />
                                        <span className="truncate">{name}</span>
                                      </button>
                                    </div>
                                    {hasChildren && isExpanded && children.map((child) => renderFolder(child, depth + 1))}
                                  </div>
                                );
                              };
                              return (
                                <div className="overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 py-0.5" style={{ maxHeight: "calc(100vh - 350px)" }}>
                                  {renderFolder("", 0)}
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Move button */}
                        {selectedProject && !loadingFolders && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => moveToProject(note.filename)}
                              disabled={moving}
                              className="px-2.5 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 disabled:opacity-40 transition-colors flex items-center gap-1"
                            >
                              {moving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Move
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-400">
          {notes.length} memo{notes.length !== 1 ? "s" : ""} in _project_memo/
        </div>
      </div>
    </div>
  );
}
