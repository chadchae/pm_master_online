"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { EmbeddedTerminal } from "./EmbeddedTerminal";
import {
  X,
  Loader2,
  Play,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Terminal,
  Clock,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";

interface InstructionBlock {
  time: string;
  text: string;
}

interface WorkInstruction {
  project: string;
  stage: string;
  path: string;
  filename: string;
  date: string;
  blocks: InstructionBlock[];
  unchecked: string[];
  checked: string[];
  total: number;
  done: number;
}

interface WorkExecutionPanelProps {
  open: boolean;
  onClose: () => void;
}

export function WorkExecutionPanel({ open, onClose }: WorkExecutionPanelProps) {
  const { t } = useLocale();
  const [instructions, setInstructions] = useState<WorkInstruction[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<{
    project: string;
    path: string;
    command: string;
    filename: string;
    unchecked: string[];
  } | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const loadInstructions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ instructions: WorkInstruction[] }>(
        "/api/work-instructions"
      );
      setInstructions(res.instructions || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadInstructions();
  }, [open, loadInstructions]);

  const markDone = async (
    project: string,
    filename: string,
    itemText: string,
    projectPath: string
  ) => {
    setMarkingDone(itemText);
    try {
      await apiFetch("/api/work-instructions/mark-done", {
        method: "POST",
        body: JSON.stringify({
          project_name: project,
          filename,
          item_text: itemText,
          project_path: projectPath,
        }),
      });
      loadInstructions();
    } catch {
      toast.error(t("toast.failedToMarkDone"));
    } finally {
      setMarkingDone(null);
    }
  };

  const launchTerminal = (
    project: string,
    path: string,
    instruction: string,
    filename: string,
    unchecked: string[]
  ) => {
    const escaped = instruction.replace(/"/g, '\\"');
    setSessionCompleted(false);
    setActiveTerminal({
      project,
      path,
      command: `/Users/chadchae/.local/bin/claude "${escaped}\\n\\nAfter completing this work, update the checklist in docs/${filename} — mark completed items as [x]. If all tasks are done, add a completion timestamp at the bottom."`,
      filename,
      unchecked,
    });
  };

  const handleSessionEnd = () => {
    if (!activeTerminal || sessionCompleted) return;
    setSessionCompleted(true);
    // Refresh instructions — Claude Code updates the file directly via prompt
    toast.success(`${activeTerminal.project}: ${t("toast.sessionEnded")}`);
    loadInstructions();
  };

  if (!open) return null;

  const totalPending = instructions.reduce(
    (sum, i) => sum + i.unchecked.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative ml-auto w-[480px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-sm">{t("work.execution")}</span>
            {totalPending > 0 && (
              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                {totalPending}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : instructions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-neutral-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-30" />
              <p>{t("work.noPendingInstructions")}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {instructions.map((inst) => {
                const isExpanded = expandedProject === `${inst.project}:${inst.filename}`;
                const key = `${inst.project}:${inst.filename}`;
                // Combine all block texts for execution
                const fullInstruction = inst.blocks
                  .map((b) => b.text)
                  .join("\n\n");

                return (
                  <div key={key}>
                    {/* Project header */}
                    <button
                      onClick={() =>
                        setExpandedProject(isExpanded ? null : key)
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {inst.project}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span className="text-xs text-neutral-400">
                            {inst.date}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {inst.done}/{inst.total} done
                          </span>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs rounded-full flex-shrink-0">
                        {inst.unchecked.length} {t("work.pending")}
                      </span>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-3">
                        {/* Instruction blocks */}
                        {inst.blocks.map((block, i) => (
                          <div
                            key={i}
                            className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3"
                          >
                            {block.time && (
                              <span className="text-xs text-neutral-400 mb-1 block">
                                {block.time}
                              </span>
                            )}
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                              {block.text}
                            </p>
                          </div>
                        ))}

                        {/* Checklist */}
                        <div className="space-y-1">
                          {inst.checked.map((item, i) => (
                            <div
                              key={`done-${i}`}
                              className="flex items-center gap-2 text-xs text-neutral-400 line-through"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              {item}
                            </div>
                          ))}
                          {inst.unchecked.map((item, i) => (
                            <button
                              key={`todo-${i}`}
                              onClick={() =>
                                markDone(inst.project, inst.filename, item, inst.path)
                              }
                              disabled={markingDone === item}
                              className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 hover:text-green-600 dark:hover:text-green-400 transition-colors w-full text-left"
                            >
                              {markingDone === item ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Circle className="w-3.5 h-3.5" />
                              )}
                              {item}
                            </button>
                          ))}
                        </div>

                        {/* Execute button */}
                        <button
                          onClick={() =>
                            launchTerminal(
                              inst.project,
                              inst.path,
                              fullInstruction,
                              inst.filename,
                              inst.unchecked
                            )
                          }
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          {t("work.launchClaudeCode")}
                        </button>

                        {/* Embedded terminal */}
                        {activeTerminal?.project === inst.project && (
                          <div className="mt-2">
                            <EmbeddedTerminal
                              projectPath={activeTerminal.path}
                              command={activeTerminal.command}
                              onClose={() => {
                                setActiveTerminal(null);
                              }}
                              onSessionEnd={handleSessionEnd}
                            />
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
          {instructions.length} project{instructions.length !== 1 ? "s" : ""}{" "}
          with pending instructions
        </div>
      </div>
    </div>
  );
}
