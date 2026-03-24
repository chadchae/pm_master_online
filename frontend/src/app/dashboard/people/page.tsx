"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users,
  Search,
  X,
  Plus,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/AppDialogs";
import dynamic from "next/dynamic";
const PeopleNetwork = dynamic(() => import("@/components/PeopleNetwork").then(m => ({ default: m.PeopleNetwork })), { ssr: false });

import {
  PersonCard,
  PersonForm,
  PeopleFilter,
  PeopleListView,
  type Person,
  type PersonFormData,
  type PeopleFilters,
  EMPTY_FORM,
} from "@/components/people";

// Main page component
export default function PeoplePage() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allProjectLabels, setAllProjectLabels] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Inline edit states for list view
  const [listEditingId, setListEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editAffiliation, setEditAffiliation] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRelationship, setEditRelationship] = useState("");
  const [editHierarchy, setEditHierarchy] = useState("");
  // ConfirmDialog state for delete
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Drag-and-drop state
  const [draggedPerson, setDraggedPerson] = useState<string | null>(null);
  const [dragOverPerson, setDragOverPerson] = useState<string | null>(null);
  const [peopleOrder, setPeopleOrder] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pm_peopleOrder");
      if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    }
    return [];
  });

  // Relationship group filter
  const [relFilter, setRelFilter] = useState<string>("all");
  // Grouping mode
  const [groupBy, setGroupBy] = useState<"none" | "hierarchy" | "role" | "industry" | "importance" | "closeness" | "project">("none");

  // Checkbox filters
  const [filters, setFilters] = useState<PeopleFilters>({ relationships: new Set(), affiliations: new Set(), industries: new Set(), hierarchies: new Set(), roles: new Set(), importances: new Set(), closenesses: new Set() });

  // Persist people order
  useEffect(() => {
    localStorage.setItem("pm_peopleOrder", JSON.stringify(peopleOrder));
  }, [peopleOrder]);

  // Extract unique values for filter checkboxes
  const uniqueRelationships = useMemo(() => [...new Set(people.map((p) => p.relationship).filter(Boolean))], [people]);
  const uniqueAffiliations = useMemo(() => [...new Set(people.map((p) => p.affiliation).filter(Boolean))], [people]);
  const uniqueIndustries = useMemo(() => [...new Set(people.map((p) => p.industry).filter(Boolean))], [people]);
  const uniqueHierarchies = useMemo(() => [...new Set(people.map((p) => p.hierarchy).filter(Boolean))], [people]);
  const uniqueRoles = useMemo(() => [...new Set(people.map((p) => p.role).filter(Boolean))], [people]);
  const uniqueImportances = useMemo(() => [...new Set(people.map((p) => String(p.importance || 0)).filter((v) => v !== "0"))].sort(), [people]);
  const uniqueClosenesses = useMemo(() => [...new Set(people.map((p) => String(p.closeness || 0)).filter((v) => v !== "0"))].sort(), [people]);

  const toggleFilter = (group: keyof PeopleFilters, value: string) => {
    setFilters((prev) => {
      const next = new Set(prev[group]);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return { ...prev, [group]: next };
    });
  };

  const hasActiveFilters = filters.relationships.size > 0 || filters.affiliations.size > 0 || filters.industries.size > 0 || filters.hierarchies.size > 0 || filters.roles.size > 0 || filters.importances.size > 0 || filters.closenesses.size > 0;

  const startListEdit = (person: Person) => {
    setListEditingId(person.id);
    setEditName(person.name);
    setEditRole(person.role || "");
    setEditAffiliation(person.affiliation || "");
    setEditEmail(person.email || "");
    setEditRelationship(person.relationship || "colleague");
    setEditHierarchy(person.hierarchy || "");
    setEditingId(null);
  };

  const cancelListEdit = () => {
    setListEditingId(null);
  };

  const saveListEdit = async () => {
    if (!listEditingId || !editName.trim()) return;
    const person = people.find((p) => p.id === listEditingId);
    if (!person) return;
    setSaving(true);
    try {
      const payload = {
        name: editName,
        alias: person.alias,
        role: editRole,
        affiliation: editAffiliation,
        email: editEmail,
        expertise: person.expertise.join(", "),
        relationship: editRelationship,
        hierarchy: editHierarchy,
        importance: person.importance || 0,
        closeness: person.closeness || 0,
        notes: person.notes,
        connections: person.connections || [],
      };
      const processedPayload = {
        ...payload,
        expertise: payload.expertise
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await apiFetch(`/api/people/${listEditingId}`, {
        method: "PUT",
        body: JSON.stringify(processedPayload),
      });
      toast.success(t("toast.personUpdated"));
      setListEditingId(null);
      fetchPeople();
    } catch {
      toast.error(t("toast.failedToUpdatePerson"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeletePerson = (person: Person) => {
    setConfirmDialog({
      message: `Delete "${person.name}"? This action cannot be undone.`,
      onConfirm: () => {
        setConfirmDialog(null);
        handleDelete(person.id);
      },
    });
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          break;
        case "role":
          cmp = (a.role || "").toLowerCase().localeCompare((b.role || "").toLowerCase());
          break;
        case "affiliation":
          cmp = (a.affiliation || "").toLowerCase().localeCompare((b.affiliation || "").toLowerCase());
          break;
        case "industry":
          cmp = (a.industry || "zzz").toLowerCase().localeCompare((b.industry || "zzz").toLowerCase());
          break;
        case "email":
          cmp = (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase());
          break;
        case "relationship":
          cmp = (a.relationship || "zzz").localeCompare(b.relationship || "zzz");
          break;
        case "hierarchy": {
          const hOrder = (h: string) => h === "선배" ? "a" : h === "동기" ? "b" : h === "후배" ? "c" : h === "???" ? "d" : "zzz";
          cmp = hOrder(a.hierarchy).localeCompare(hOrder(b.hierarchy));
          break;
        }
        case "importance":
          cmp = (a.importance || 0) - (b.importance || 0);
          break;
        case "closeness":
          cmp = (a.closeness || 0) - (b.closeness || 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [people, sortKey, sortDir]);

  // Apply filters (relationship group + checkbox filters)
  const filteredPeople = useMemo(() => {
    let result = sortedPeople;

    // Relationship group filter
    if (relFilter !== "all") {
      result = result.filter((p) => p.relationship === relFilter);
    }

    // Checkbox filters (when any checked in a group, filter to matching)
    if (filters.relationships.size > 0) {
      result = result.filter((p) => filters.relationships.has(p.relationship));
    }
    if (filters.affiliations.size > 0) {
      result = result.filter((p) => filters.affiliations.has(p.affiliation));
    }
    if (filters.industries.size > 0) {
      result = result.filter((p) => filters.industries.has(p.industry));
    }
    if (filters.hierarchies.size > 0) {
      result = result.filter((p) => filters.hierarchies.has(p.hierarchy));
    }
    if (filters.roles.size > 0) {
      result = result.filter((p) => filters.roles.has(p.role));
    }
    if (filters.importances.size > 0) {
      result = result.filter((p) => filters.importances.has(String(p.importance || 0)));
    }
    if (filters.closenesses.size > 0) {
      result = result.filter((p) => filters.closenesses.has(String(p.closeness || 0)));
    }

    return result;
  }, [sortedPeople, relFilter, filters]);

  // Ordered people for card view (drag-and-drop)
  const orderedPeople = useMemo(() => {
    if (peopleOrder.length === 0) return filteredPeople;
    const orderMap = new Map(peopleOrder.map((id, idx) => [id, idx]));
    return [...filteredPeople].sort((a, b) => {
      const ia = orderMap.get(a.id) ?? 999999;
      const ib = orderMap.get(b.id) ?? 999999;
      return ia - ib;
    });
  }, [filteredPeople, peopleOrder]);

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      const [peopleData, projectsData] = await Promise.all([
        apiFetch<{ people: Person[] }>("/api/people"),
        apiFetch<{ projects: { name: string; stage: string; metadata: { label?: string } }[] }>("/api/projects").catch(() => ({ projects: [] })),
      ]);
      setPeople(peopleData.people);
      setAllProjectLabels(
        projectsData.projects
          .filter((p) => !["5_completed", "6_archived", "7_discarded"].includes(p.stage))
          .map((p) => p.metadata?.label || p.name)
          .sort()
      );
      // Auto-sync projects→people
      apiFetch("/api/people/sync-projects", { method: "POST" }).catch(() => {});
    } catch {
      toast.error(t("toast.failedToLoadPeople"));
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPeople = useCallback(async (query: string) => {
    try {
      const data = await apiFetch<{ people: Person[] }>(
        `/api/people/search?q=${encodeURIComponent(query)}`
      );
      setPeople(data.people);
    } catch {
      toast.error(t("toast.searchFailed"));
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchPeople(searchQuery);
      } else {
        fetchPeople();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPeople, fetchPeople]);

  const handleCreate = async (formData: PersonFormData) => {
    if (!formData.name.trim()) {
      toast.error(t("toast.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        importance: parseInt(formData.importance) || 0,
        closeness: parseInt(formData.closeness) || 0,
        expertise: formData.expertise
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        connections: formData.connections || [],
      };
      await apiFetch("/api/people", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(t("toast.personAdded"));
      setShowAddForm(false);
      fetchPeople();
    } catch {
      toast.error(t("toast.failedToCreatePerson"));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (personId: string, formData: PersonFormData) => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        importance: parseInt(formData.importance) || 0,
        closeness: parseInt(formData.closeness) || 0,
        expertise: formData.expertise
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        connections: formData.connections || [],
      };
      await apiFetch(`/api/people/${personId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      toast.success(t("toast.personUpdated"));
      setEditingId(null);
      fetchPeople();
    } catch {
      toast.error(t("toast.failedToUpdatePerson"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (personId: string) => {
    try {
      await apiFetch(`/api/people/${personId}`, { method: "DELETE" });
      toast.success(t("toast.personDeleted"));
      fetchPeople();
    } catch {
      toast.error(t("toast.failedToDeletePerson"));
    }
  };

  // Drag-and-drop handlers
  const handleDragDrop = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = orderedPeople.map((p) => p.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, fromId);
    setPeopleOrder(ids);
  };

  // Separate self group for card view
  const selfPeople = people.filter((p) => p.relationship === "self");
  const nonSelfPeople = orderedPeople.filter((p) => p.relationship !== "self");

  // Render card section
  const renderCardGrid = (personList: Person[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {personList.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          allPeople={people}
          allProjectLabels={allProjectLabels}
          onEdit={() => setEditingId(person.id)}
          onDelete={() => handleDelete(person.id)}
          editing={editingId === person.id}
          onSaveEdit={(data) => handleUpdate(person.id, data)}
          onCancelEdit={() => setEditingId(null)}
          saving={saving}
          isDragged={draggedPerson === person.id}
          isDragOver={dragOverPerson === person.id}
          dragHandlers={{
            onDragStart: () => setDraggedPerson(person.id),
            onDragEnd: () => { setDraggedPerson(null); setDragOverPerson(null); },
            onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverPerson(person.id); },
            onDrop: () => {
              if (draggedPerson && draggedPerson !== person.id) {
                handleDragDrop(draggedPerson, person.id);
              }
              setDraggedPerson(null);
              setDragOverPerson(null);
            },
            onDragLeave: () => setDragOverPerson(null),
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
            People
          </h1>
          <span className="text-sm text-neutral-400">
            {people.length} {people.length === 1 ? "person" : "people"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("people.searchPeople")}
              className="pl-9 pr-8 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* View toggle */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "card"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
          {/* Add button */}
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            {showAddForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showAddForm ? t("action.cancel") : t("people.addPerson")}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-6">
          <PersonForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => setShowAddForm(false)}
            saving={saving}
            allPeople={people}
            allProjectLabels={allProjectLabels}
          />
        </div>
      )}

      {/* Relationship group filter buttons */}
      {!loading && people.length > 0 && (
        <PeopleFilter
          people={people}
          relFilter={relFilter}
          setRelFilter={setRelFilter}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          filters={filters}
          toggleFilter={toggleFilter}
          hasActiveFilters={hasActiveFilters}
          clearFilters={() => setFilters({ relationships: new Set(), affiliations: new Set(), industries: new Set(), hierarchies: new Set(), roles: new Set(), importances: new Set(), closenesses: new Set() })}
          uniqueAffiliations={uniqueAffiliations}
          uniqueIndustries={uniqueIndustries}
          uniqueHierarchies={uniqueHierarchies}
          uniqueRoles={uniqueRoles}
          uniqueImportances={uniqueImportances}
          uniqueClosenesses={uniqueClosenesses}
          uniqueRelationships={uniqueRelationships}
        />
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-20 text-neutral-500 dark:text-neutral-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>
            {searchQuery ? t("people.noMatch") : t("people.noPeople")}
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* Card grid with grouping */
        <div className="space-y-6">
          {/* Self + Network — always pinned at top regardless of filters/groups */}
          {selfPeople.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Self</h2>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div>
                  {selfPeople.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      allPeople={people}
                      allProjectLabels={allProjectLabels}
                      onEdit={() => setEditingId(person.id)}
                      onDelete={() => handleDelete(person.id)}
                      editing={editingId === person.id}
                      onSaveEdit={(data) => handleUpdate(person.id, data)}
                      onCancelEdit={() => setEditingId(null)}
                      saving={saving}
                    />
                  ))}
                </div>
                <div className="xl:col-span-2 bg-white dark:bg-neutral-900 rounded-xl border-2 border-amber-400 dark:border-amber-500 p-3 overflow-hidden">
                  <h3 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">연관인물 네트워크</h3>
                  <PeopleNetwork width={800} height={400} filterNodeIds={hasActiveFilters ? filteredPeople.map((p) => p.id) : null} />
                </div>
              </div>
            </div>
          )}

          {groupBy === "none" ? (
            <>
              {nonSelfPeople.length > 0 && renderCardGrid(nonSelfPeople)}
              {relFilter === "self" && renderCardGrid(orderedPeople)}
            </>
          ) : (
            /* Grouped view */
            (() => {
              let groupOrder: string[];
              const groups: Record<string, typeof orderedPeople> = {};

              if (groupBy === "project") {
                // A person can be in multiple projects
                const allProjs = new Set<string>();
                for (const p of orderedPeople) {
                  for (const proj of (p.projects || [])) { allProjs.add(proj); }
                  if (!p.projects || p.projects.length === 0) allProjs.add("");
                }
                groupOrder = [...allProjs].sort();
                for (const p of orderedPeople) {
                  if (!p.projects || p.projects.length === 0) {
                    if (!groups[""]) groups[""] = [];
                    groups[""].push(p);
                  } else {
                    for (const proj of p.projects) {
                      if (!groups[proj]) groups[proj] = [];
                      groups[proj].push(p);
                    }
                  }
                }
              } else if (groupBy === "importance" || groupBy === "closeness") {
                groupOrder = ["5", "4", "3", "2", "1", "0"];
                for (const p of orderedPeople) {
                  const key = String(groupBy === "importance" ? (p.importance || 0) : (p.closeness || 0));
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(p);
                }
              } else {
                const groupKey = groupBy as string;
                groupOrder = groupBy === "hierarchy" ? ["선배", "동기", "후배", "???", ""] : [...new Set(orderedPeople.map((p) => (p as unknown as Record<string, string>)[groupKey] || ""))].sort();
                for (const p of orderedPeople) {
                  const key = (p as unknown as Record<string, string>)[groupKey] || "";
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(p);
                }
              }
              return (
                <>
                  {groupOrder.map((key) => {
                    const groupPeople = (groups[key] || []).filter((p) => p.relationship !== "self");
                    if (groupPeople.length === 0) return null;
                    const label = groupBy === "importance" ? (key === "0" ? "미지정" : "★".repeat(parseInt(key)))
                      : groupBy === "closeness" ? (key === "0" ? "미지정" : `친밀도 ${key}`)
                      : key || "미지정";
                    return (
                      <div key={key || "__none__"}>
                        <div className="flex items-center gap-3 mb-3">
                          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{label} ({groupPeople.length})</h2>
                          <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                        </div>
                        {renderCardGrid(groupPeople)}
                      </div>
                    );
                  })}
                </>
              );
            })()
          )}
        </div>
      ) : (
        /* List view */
        <PeopleListView
          filteredPeople={filteredPeople}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          listEditingId={listEditingId}
          editName={editName}
          setEditName={setEditName}
          editRole={editRole}
          setEditRole={setEditRole}
          editAffiliation={editAffiliation}
          setEditAffiliation={setEditAffiliation}
          editEmail={editEmail}
          setEditEmail={setEditEmail}
          editRelationship={editRelationship}
          setEditRelationship={setEditRelationship}
          editHierarchy={editHierarchy}
          setEditHierarchy={setEditHierarchy}
          saving={saving}
          saveListEdit={saveListEdit}
          cancelListEdit={cancelListEdit}
          startListEdit={startListEdit}
          confirmDeletePerson={confirmDeletePerson}
        />
      )}
      <ConfirmDialog
        open={!!confirmDialog}
        message={confirmDialog?.message || ""}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => { confirmDialog?.onConfirm(); }}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
