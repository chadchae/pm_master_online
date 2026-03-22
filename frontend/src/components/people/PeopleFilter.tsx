"use client";

import {
  type Person,
  type PeopleFilters,
  RELATIONSHIP_COLORS,
} from "./types";

export function PeopleFilter({
  people,
  relFilter,
  setRelFilter,
  groupBy,
  setGroupBy,
  filters,
  toggleFilter,
  hasActiveFilters,
  clearFilters,
  uniqueAffiliations,
  uniqueIndustries,
  uniqueHierarchies,
  uniqueRoles,
  uniqueImportances,
  uniqueClosenesses,
  uniqueRelationships,
}: {
  people: Person[];
  relFilter: string;
  setRelFilter: (v: string) => void;
  groupBy: "none" | "hierarchy" | "role" | "industry" | "importance" | "closeness" | "project";
  setGroupBy: (v: "none" | "hierarchy" | "role" | "industry" | "importance" | "closeness" | "project") => void;
  filters: PeopleFilters;
  toggleFilter: (group: keyof PeopleFilters, value: string) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  uniqueAffiliations: string[];
  uniqueIndustries: string[];
  uniqueHierarchies: string[];
  uniqueRoles: string[];
  uniqueImportances: string[];
  uniqueClosenesses: string[];
  uniqueRelationships: string[];
}) {
  return (
    <div className="mb-4 space-y-3">
      {/* Relationship group buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setRelFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            relFilter === "all"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          All
        </button>
        {uniqueRelationships.map((rel) => {
          const relColor = RELATIONSHIP_COLORS[rel] || RELATIONSHIP_COLORS.external;
          return (
            <button
              key={rel}
              onClick={() => setRelFilter(relFilter === rel ? "all" : rel)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                relFilter === rel ? relColor + " ring-2 ring-offset-1 ring-indigo-400" : relColor + " opacity-70 hover:opacity-100"
              }`}
            >
              {rel} ({people.filter((p) => p.relationship === rel).length})
            </button>
          );
        })}
        {/* Group by buttons */}
        <span className="text-neutral-300 dark:text-neutral-600 mx-1">|</span>
        {(["none", "hierarchy", "role", "industry", "importance", "closeness", "project"] as const).map((g) => {
          const labels: Record<string, string> = { none: "Flat", hierarchy: "위계별", role: "역할별", industry: "산업별", importance: "중요도별", closeness: "친밀도별", project: "프로젝트별" };
          return (
            <button
              key={g}
              onClick={() => setGroupBy(groupBy === g ? "none" : g)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                groupBy === g && g !== "none"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {labels[g]}
            </button>
          );
        })}
      </div>

      {/* Checkbox filters — collapsible */}
      <details className="text-xs">
        <summary className="cursor-pointer text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-xs mb-1.5 select-none">Filters</summary>
      <div className="space-y-1.5">
        {uniqueAffiliations.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium w-14 flex-shrink-0">소속</span>
            {uniqueAffiliations.map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <input type="checkbox" checked={filters.affiliations.has(v)} onChange={() => toggleFilter("affiliations", v)} className="w-3 h-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                {v}
              </label>
            ))}
          </div>
        )}
        {uniqueIndustries.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium w-14 flex-shrink-0">산업</span>
            {uniqueIndustries.map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <input type="checkbox" checked={filters.industries.has(v)} onChange={() => toggleFilter("industries", v)} className="w-3 h-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                {v}
              </label>
            ))}
          </div>
        )}
        {uniqueHierarchies.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium w-14 flex-shrink-0">위계</span>
            {uniqueHierarchies.map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <input type="checkbox" checked={filters.hierarchies.has(v)} onChange={() => toggleFilter("hierarchies", v)} className="w-3 h-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                {v}
              </label>
            ))}
          </div>
        )}
        {uniqueRoles.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium w-14 flex-shrink-0">역할</span>
            {uniqueRoles.map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <input type="checkbox" checked={filters.roles.has(v)} onChange={() => toggleFilter("roles", v)} className="w-3 h-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                {v}
              </label>
            ))}
          </div>
        )}
        {uniqueImportances.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium w-14 flex-shrink-0">중요도</span>
            {uniqueImportances.map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <input type="checkbox" checked={filters.importances.has(v)} onChange={() => toggleFilter("importances", v)} className="w-3 h-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                {"★".repeat(parseInt(v))}
              </label>
            ))}
          </div>
        )}
        {uniqueClosenesses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium w-14 flex-shrink-0">친밀도</span>
            {uniqueClosenesses.map((v) => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                <input type="checkbox" checked={filters.closenesses.has(v)} onChange={() => toggleFilter("closenesses", v)} className="w-3 h-3 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500" />
                {v}
              </label>
            ))}
          </div>
        )}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      </details>
    </div>
  );
}
