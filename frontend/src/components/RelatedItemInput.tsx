"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface RelatedItem {
  id: string;
  label: string;
  sublabel?: string;
}

export type RelatedItemType = "todos" | "notes" | "learning" | "issues" | "schedule";

export async function fetchItemsByType(type: RelatedItemType): Promise<RelatedItem[]> {
  if (type === "todos") {
    const data = await apiFetch<{
      projects: Array<{ label: string; items: Array<{ id: string; title: string }> }>;
    }>("/api/todos/all");
    return data.projects.flatMap((p) =>
      p.items.map((i) => ({ id: i.id, label: i.title, sublabel: p.label }))
    );
  }
  if (type === "notes") {
    const data = await apiFetch<{
      files: Array<{ filename: string; path: string; is_directory: boolean }>;
    }>("/api/common/notes");
    return data.files
      .filter((f) => !f.is_directory)
      .map((f) => ({ id: f.path, label: f.filename }));
  }
  if (type === "learning") {
    const data = await apiFetch<{
      files: Array<{ filename: string; path: string; is_directory: boolean }>;
    }>("/api/common/learning");
    return data.files
      .filter((f) => !f.is_directory)
      .map((f) => ({ id: f.path, label: f.filename }));
  }
  if (type === "issues") {
    const data = await apiFetch<{
      issues: Array<{ id: string; title: string; _project_label?: string }>;
    }>("/api/issues/all");
    return data.issues.map((i) => ({
      id: i.id,
      label: i.title,
      sublabel: i._project_label,
    }));
  }
  if (type === "schedule") {
    const projectsData = await apiFetch<{
      projects: Array<{ name: string; metadata?: { label?: string } }>;
    }>("/api/projects");
    const schedules = await Promise.all(
      projectsData.projects.map(async (proj) => {
        try {
          const data = await apiFetch<{
            tasks: Array<{ id: string; title: string }>;
          }>(`/api/projects/${proj.name}/schedule`);
          const label = proj.metadata?.label ?? proj.name;
          return (data.tasks ?? []).map((t) => ({
            id: t.id,
            label: t.title,
            sublabel: label,
          }));
        } catch {
          return [] as RelatedItem[];
        }
      })
    );
    return schedules.flat();
  }
  return [];
}

interface RelatedItemInputProps {
  label: string;
  icon: React.ElementType;
  type: RelatedItemType;
  value: string[];
  onChange: (value: string[]) => void;
}

export function RelatedItemInput({
  label,
  icon: Icon,
  type,
  value,
  onChange,
}: RelatedItemInputProps) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchItemsByType(type).then(setItems).catch(() => {});
  }, [type]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = items.filter(
    (item) =>
      !value.includes(item.id) &&
      (item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase()))
  );

  function select(item: RelatedItem) {
    onChange([...value, item.id]);
    setQuery("");
    setOpen(false);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function getLabel(id: string) {
    return items.find((i) => i.id === id)?.label ?? id;
  }

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {getLabel(id)}
              <button onClick={() => remove(id)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={dropRef}>
        <button
          onClick={() => {
            setOpen(!open);
            setQuery("");
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          추가
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <Search className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="검색..."
                  className="flex-1 text-xs bg-transparent outline-none text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400"
                />
              </div>
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-xs text-neutral-400 text-center">
                  {items.length === 0 ? "불러오는 중..." : "항목 없음"}
                </li>
              ) : (
                filtered.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => select(item)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="text-neutral-800 dark:text-neutral-200 block truncate">
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className="text-neutral-400 text-[10px]">
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
