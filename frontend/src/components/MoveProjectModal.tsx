"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { ArrowRight, Loader2, X, FileText } from "lucide-react";
import { KANBAN_STAGES, getStageByFolder } from "@/lib/stages";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

interface MoveProjectModalProps {
  projectName: string;
  projectLabel?: string;
  fromStage: string;
  toStage: string;
  onClose: () => void;
  onMoved: () => void;
}

export function MoveProjectModal({
  projectName,
  projectLabel,
  fromStage,
  toStage,
  onClose,
  onMoved,
}: MoveProjectModalProps) {
  const { t } = useLocale();
  const [instruction, setInstruction] = useState("");
  const [moving, setMoving] = useState(false);

  const fromLabel = getStageByFolder(fromStage)?.label || fromStage;
  const toLabel = getStageByFolder(toStage)?.label || toStage;

  const handleMove = async () => {
    setMoving(true);
    try {
      const res = await apiFetch<{ note_created?: string }>("/api/projects/move", {
        method: "POST",
        body: JSON.stringify({
          project_name: projectName,
          from_stage: fromStage,
          to_stage: toStage,
          instruction: instruction.trim(),
        }),
      });
      const msg = instruction.trim()
        ? `${t("toast.movedTo")} ${toLabel} (note: ${res.note_created || t("toast.created")})`
        : `${t("toast.movedTo")} ${toLabel}`;
      toast.success(msg);
      onMoved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toast.failedToMove"));
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {t("move.moveProject")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Project name */}
          <div>
            <p className="text-base font-medium text-neutral-900 dark:text-white">
              {projectLabel || projectName}
            </p>
            {projectLabel && (
              <p className="text-xs text-neutral-400 font-mono">{projectName}</p>
            )}
          </div>

          {/* Transition arrow */}
          <div className="flex items-center gap-3 py-2">
            <span className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-600 dark:text-neutral-400">
              {fromLabel}
            </span>
            <ArrowRight className="w-4 h-4 text-neutral-400" />
            <span className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              {toLabel}
            </span>
          </div>

          {/* Instruction */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t("move.workInstruction")}
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              placeholder={t("move.whatNeedsToBeDone")}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            {instruction.trim() && (
              <p className="text-xs text-neutral-400 mt-1">
                Will create <code className="font-mono">작업지시_{new Date().toISOString().split("T")[0]}.md</code> in project docs/작업지시/
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {t("action.cancel")}
          </button>
          <button
            onClick={handleMove}
            disabled={moving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {moving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {t("action.move")}
          </button>
        </div>
      </div>
    </div>
  );
}
