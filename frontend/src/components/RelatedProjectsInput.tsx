"use client";

import { useEffect, useState } from "react";
import { apiFetch, Project } from "@/lib/api";
import { X, Plus, FolderKanban, ChevronDown } from "lucide-react";

interface RelatedProjectsInputProps {
  value: string[];           // Array of project folder names
  onChange: (value: string[]) => void;
  label?: string;
}

// Stage colors for pills
const STAGE_COLORS: Record<string, string> = {
  "1_idea_stage": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "2_initiation_stage": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "3_in_development": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "4_in_testing": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "5_completed": "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  "6_archived": "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
  "7_discarded": "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

export function RelatedProjectsInput({
  value,
  onChange,
  label = "Related Projects",
}: RelatedProjectsInputProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    apiFetch<{ projects: Project[] }>("/api/projects")
      .then((res) => {
        const sorted = (res.projects || [])
          .filter((p) => p.stage !== "7_discarded")
          .sort((a, b) => a.name.localeCompare(b.name));
        setProjects(sorted);
      })
      .catch(() => {});
  }, []);

  const addProject = (name: string) => {
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
    setFilter("");
    setOpen(false);
  };

  const removeProject = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  // Projects not yet added, filtered by search
  const available = projects.filter(
    (p) => !value.includes(p.name) && (
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.metadata.label || "").toLowerCase().includes(filter.toLowerCase())
    )
  );

  // Get short stage label
  const getStageShort = (stage: string): string => {
    if (stage.includes("idea")) return "Idea";
    if (stage.includes("initiation")) return "Init";
    if (stage.includes("development")) return "Dev";
    if (stage.includes("testing")) return "Test";
    if (stage.includes("completed")) return "Done";
    if (stage.includes("archived")) return "Arch";
    if (stage.includes("discarded")) return "Disc";
    return stage;
  };

  return (
    <div>
      {label && (
        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
          <FolderKanban className="w-3.5 h-3.5" />
          {label}
        </label>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {value.map((name) => {
          const proj = projects.find((p) => p.name === name);
          const stage = proj?.stage || "";
          const color = STAGE_COLORS[stage] || STAGE_COLORS["5_completed"];
          return (
            <span
              key={name}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${color}`}
            >
              {proj?.metadata.label || name}
              <button
                onClick={() => removeProject(name)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}

        {/* Add button */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
            <ChevronDown className="w-3 h-3" />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden">
              {/* Filter input */}
              <div className="p-1.5 border-b border-neutral-100 dark:border-neutral-700">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                  }}
                  placeholder="Search projects..."
                  className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Project list */}
              <div className="max-h-60 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-neutral-400">
                    {projects.length === 0 ? "No projects" : "No matches"}
                  </p>
                ) : (
                  available.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => addProject(p.name)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between"
                    >
                      <span className="text-neutral-800 dark:text-neutral-200 truncate">
                        {p.metadata.label || p.name}
                        {p.metadata.label && p.metadata.label !== p.name && (
                          <span className="text-neutral-400 ml-1 font-mono">({p.name})</span>
                        )}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ml-2 ${STAGE_COLORS[p.stage] || ""}`}>
                        {getStageShort(p.stage)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
