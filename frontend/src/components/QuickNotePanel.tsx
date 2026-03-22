"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  X,
  Plus,
  Trash2,
  Send,
  Loader2,
  StickyNote,
  ChevronDown,
  ChevronRight,
  Pencil,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

interface QuickNote {
  filename: string;
  size: number;
  last_modified: number;
}

// Target files in _notes/ for organizing
const NOTE_TARGETS = [
  { file: "_research_ideas.md", label: "Research Ideas" },
  { file: "_curiosity.md", label: "Curiosity" },
  { file: "_reflections.md", label: "Reflections" },
  { file: "_tech_notes.md", label: "Tech Notes" },
  { file: "_personal.md", label: "Personal" },
];

interface QuickNotePanelProps {
  open: boolean;
  onClose: () => void;
}

export function QuickNotePanel({ open, onClose }: QuickNotePanelProps) {
  const { t } = useLocale();
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState(NOTE_TARGETS[0].file);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteContents, setNoteContents] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingContent, setLoadingContent] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ notes: QuickNote[] }>("/api/quicknotes");
      setNotes(res.notes || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadNotes();
  }, [open, loadNotes]);

  const createNote = async () => {
    if (!title.trim() && !content.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/quicknotes", {
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
      await apiFetch(`/api/quicknotes/${encodeURIComponent(filename)}`, {
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
        const res = await apiFetch<{ content: string }>(`/api/quicknotes/${encodeURIComponent(filename)}`);
        setNoteContents((prev) => ({ ...prev, [filename]: res.content }));
      } catch {
        setNoteContents((prev) => ({ ...prev, [filename]: "(failed to load)" }));
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
      await apiFetch(`/api/quicknotes/${encodeURIComponent(filename)}`, {
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

  const moveNote = async (filename: string) => {
    try {
      await apiFetch("/api/quicknotes/move", {
        method: "POST",
        body: JSON.stringify({
          filename,
          target_file: selectedTarget,
        }),
      });
      toast.success(`${t("toast.movedTo")} ${selectedTarget}`);
      setMoveTarget(null);
      loadNotes();
    } catch {
      toast.error(t("toast.failedToMove"));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-96 h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-amber-500" />
            <span className="font-semibold text-sm">{t("quicknote.title")}</span>
            <span className="text-xs text-neutral-400">_temp/</span>
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
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 space-y-2 bg-amber-50/50 dark:bg-amber-950/20">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("quicknote.titlePlaceholder")}
              className="w-full px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("quicknote.contentPlaceholder")}
              rows={4}
              className="w-full px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="flex justify-end">
              <button
                onClick={createNote}
                disabled={creating || (!title.trim() && !content.trim())}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
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
              <StickyNote className="w-8 h-8 mb-2 opacity-30" />
              <p>{t("quicknote.noNotes")}</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-2 text-amber-500 hover:text-amber-600 text-xs"
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
                          {new Date(note.last_modified * 1000).toLocaleDateString()}
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
                        onClick={() =>
                          setMoveTarget(
                            moveTarget === note.filename ? null : note.filename
                          )
                        }
                        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-amber-500 transition-colors"
                        title={t("quicknote.moveToNotes")}
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
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                              {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
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

                  {/* Move target selector */}
                  {moveTarget === note.filename && (
                    <div className="mt-2 ml-5 flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={selectedTarget}
                          onChange={(e) => setSelectedTarget(e.target.value)}
                          className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs appearance-none pr-6 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {NOTE_TARGETS.map((t) => (
                            <option key={t.file} value={t.file}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                      </div>
                      <button
                        onClick={() => moveNote(note.filename)}
                        className="px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 transition-colors"
                      >
                        {t("action.move")}
                      </button>
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
          {notes.length} note{notes.length !== 1 ? "s" : ""} in _temp/
        </div>
      </div>
    </div>
  );
}
