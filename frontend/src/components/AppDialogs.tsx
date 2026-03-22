"use client";

import { useState, useEffect, ReactNode } from "react";
import { X } from "lucide-react";
import { RelatedProjectsInput } from "./RelatedProjectsInput";

// ===== Confirm Dialog =====
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "OK", cancelLabel = "Cancel", variant = "default", onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;
  const btnClass = variant === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-indigo-600 hover:bg-indigo-700 text-white";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-sm mx-4">
        <div className="px-5 py-4">
          {title && <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">{title}</h3>}
          <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg transition-colors ${btnClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ===== Prompt Dialog =====
interface PromptDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: "text" | "select";
  selectOptions?: { value: string; label: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({ open, title, message, placeholder, defaultValue = "", inputType = "text", selectOptions, confirmLabel = "OK", cancelLabel = "Cancel", onConfirm, onCancel }: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && inputType === "text") onConfirm(value);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, value, onConfirm, onCancel, inputType]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">{title || "Input"}</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {message && <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{message}</p>}
          {inputType === "text" ? (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            />
          ) : (
            <select
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-white"
            >
              {selectOptions?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">{cancelLabel}</button>
          <button onClick={() => onConfirm(value)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ===== New Project Dialog (multi-step) =====
interface NewProjectDialogProps {
  open: boolean;
  typeOptions?: string[];
  onConfirm: (data: { folder: string; label: string; projectType: string; relatedProjects: string }) => void;
  onCancel: () => void;
}

export function NewProjectDialog({ open, typeOptions, onConfirm, onCancel }: NewProjectDialogProps) {
  const [folder, setFolder] = useState("");
  const [label, setLabel] = useState("");
  const [typeChoice, setTypeChoice] = useState("개발");
  const [customType, setCustomType] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [relatedProjects, setRelatedProjects] = useState<string[]>([]);

  useEffect(() => {
    if (open) { setFolder(""); setLabel(""); setTypeChoice("개발"); setCustomType(""); setShowCustom(false); setRelatedProjects([]); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!folder.trim()) return;
    const finalType = showCustom ? customType.trim() : typeChoice;
    onConfirm({
      folder: folder.trim().toLowerCase().replace(/\s+/g, "-"),
      label: label.trim() || folder.trim(),
      projectType: finalType,
      relatedProjects: relatedProjects.join(", "),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">New Project</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Folder Name (English, hyphens)</label>
            <input autoFocus value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="my-project" className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Display Name</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={folder || "Project Name"} className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {(typeOptions && typeOptions.length > 0 ? typeOptions : ["개인", "개발", "연구"]).map((t) => (
                <button key={t} onClick={() => { setTypeChoice(t); setShowCustom(false); }} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${!showCustom && typeChoice === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300"}`}>{t}</button>
              ))}
              <button onClick={() => setShowCustom(true)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${showCustom ? "bg-indigo-600 text-white border-indigo-600" : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300"}`}>+ Custom</button>
            </div>
            {showCustom && (
              <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Custom type..." className="w-full mt-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-neutral-900 dark:text-white" />
            )}
          </div>
          <div>
            <RelatedProjectsInput value={relatedProjects} onChange={setRelatedProjects} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!folder.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">Create</button>
        </div>
      </div>
    </div>
  );
}
