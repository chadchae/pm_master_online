"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Building2,
  Mail,
  Tag,
  Edit3,
  Trash2,
  Plus,
  Search,
  X,
  Save,
  Loader2,
  Link2,
  LayoutGrid,
  List,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";
import { ListExportBar, generateMD, generateCSV, downloadFile, printList } from "@/components/ListExportBar";

// Types
interface Person {
  id: string;
  name: string;
  name_ko: string;
  role: string;
  affiliation: string;
  email: string;
  expertise: string[];
  relationship: string;
  notes: string;
  projects: string[];
  connections: string[];  // IDs of connected people
  created_at: string;
  updated_at: string;
}

interface PersonFormData {
  name: string;
  name_ko: string;
  role: string;
  affiliation: string;
  email: string;
  expertise: string;
  relationship: string;
  notes: string;
  connections: string[];  // IDs
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  self: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "co-author": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  advisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  colleague: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  external: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const RELATIONSHIP_OPTIONS = [
  "self",
  "co-author",
  "advisor",
  "student",
  "colleague",
  "external",
];

const EMPTY_FORM: PersonFormData = {
  name: "",
  name_ko: "",
  role: "",
  affiliation: "",
  email: "",
  expertise: "",
  relationship: "colleague",
  notes: "",
  connections: [],
};

// Reusable form component for create and edit
function PersonForm({
  initial,
  onSave,
  onCancel,
  saving,
  allPeople = [],
  currentId,
}: {
  initial: PersonFormData;
  onSave: (data: PersonFormData) => void;
  onCancel: () => void;
  saving: boolean;
  allPeople?: Person[];
  currentId?: string;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<PersonFormData>(initial);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.name")} *
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={t("people.fullName")}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.koreanName")}
          </label>
          <input
            name="name_ko"
            value={form.name_ko}
            onChange={handleChange}
            placeholder={t("people.koreanNameOptional")}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.role")}
          </label>
          <input
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="e.g. Professor, Researcher, Student"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.affiliation")}
          </label>
          <input
            name="affiliation"
            value={form.affiliation}
            onChange={handleChange}
            placeholder="University or Organization"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.email")}
          </label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email@example.com"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.relationship")}
          </label>
          <select
            name="relationship"
            value={form.relationship}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {t("people.expertiseHint")}
        </label>
        <input
          name="expertise"
          value={form.expertise}
          onChange={handleChange}
          placeholder="e.g. HRD, AI, Bibliometrics"
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {t("people.notes")}
        </label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Free text notes"
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
      {/* Connections */}
      {allPeople.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {t("people.connectedPeople")}
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg min-h-[36px]">
            {allPeople
              .filter((p) => p.id !== currentId)
              .map((p) => {
                const isSelected = form.connections.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        connections: isSelected
                          ? f.connections.filter((id) => id !== p.id)
                          : [...f.connections, p.id],
                      }))
                    }
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                    }`}
                  >
                    {p.name}{p.name_ko ? ` (${p.name_ko})` : ""}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {t("action.cancel")}
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("action.save")}
        </button>
      </div>
    </div>
  );
}

// Person card component
function PersonCard({
  person,
  allPeople,
  onEdit,
  onDelete,
  editing,
  onSaveEdit,
  onCancelEdit,
  saving,
}: {
  person: Person;
  allPeople: Person[];
  onEdit: () => void;
  onDelete: () => void;
  editing: boolean;
  onSaveEdit: (data: PersonFormData) => void;
  onCancelEdit: () => void;
  saving: boolean;
}) {
  const { t } = useLocale();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <PersonForm
        initial={{
          name: person.name,
          name_ko: person.name_ko,
          role: person.role,
          affiliation: person.affiliation,
          email: person.email,
          expertise: person.expertise.join(", "),
          relationship: person.relationship,
          notes: person.notes,
          connections: person.connections || [],
        }}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
        saving={saving}
        allPeople={allPeople}
        currentId={person.id}
      />
    );
  }

  const relColor =
    RELATIONSHIP_COLORS[person.relationship] || RELATIONSHIP_COLORS.external;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-white truncate">
          {person.name}
        </h3>
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {/* Name KO + Role */}
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
        {person.name_ko && (
          <span className="mr-2">{person.name_ko}</span>
        )}
        {person.name_ko && person.role && (
          <span className="text-neutral-300 dark:text-neutral-600 mr-2">
            ·
          </span>
        )}
        {person.role && <span>{person.role}</span>}
      </p>

      {/* Affiliation */}
      {person.affiliation && (
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{person.affiliation}</span>
        </div>
      )}

      {/* Email */}
      {person.email && (
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-3">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <a
            href={`mailto:${person.email}`}
            className="truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {person.email}
          </a>
        </div>
      )}

      {/* Expertise tags */}
      {person.expertise.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {person.expertise.map((exp, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            >
              <Tag className="w-2.5 h-2.5" />
              {exp}
            </span>
          ))}
        </div>
      )}

      {/* Relationship badge */}
      {person.relationship && (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${relColor} mb-3`}
        >
          {person.relationship}
        </span>
      )}

      {/* Notes */}
      {person.notes && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-3 line-clamp-2">
          {person.notes}
        </p>
      )}

      {/* Projects */}
      {person.projects.length > 0 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-1">
          <span className="font-medium">Projects:</span>{" "}
          {person.projects.join(", ")}
        </p>
      )}

      {/* Connections */}
      {person.connections && person.connections.length > 0 && (
        <div className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-500">
          <Link2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            {person.connections
              .map((cid) => {
                const connected = allPeople.find((p) => p.id === cid);
                return connected ? connected.name : cid;
              })
              .join(", ")}
          </span>
        </div>
      )}

      {/* Delete action */}
      <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400">
              {t("people.deleteConfirm")}
            </span>
            <button
              onClick={() => {
                onDelete();
                setConfirmDelete(false);
              }}
              className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500 transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Main page component
export default function PeoplePage() {
  const { t } = useLocale();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedPeople = [...people].sort((a, b) => {
    let va = "", vb = "";
    switch (sortKey) {
      case "name": va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break;
      case "role": va = (a.role || "").toLowerCase(); vb = (b.role || "").toLowerCase(); break;
      case "affiliation": va = (a.affiliation || "").toLowerCase(); vb = (b.affiliation || "").toLowerCase(); break;
      case "email": va = (a.email || "").toLowerCase(); vb = (b.email || "").toLowerCase(); break;
      case "relationship": va = a.relationship || ""; vb = b.relationship || ""; break;
      case "projects": va = String(a.projects?.length || 0); vb = String(b.projects?.length || 0); break;
    }
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ people: Person[] }>("/api/people");
      setPeople(data.people);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      toast.error(t("toast.failedToDeletePerson"));
    }
  };

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
          />
        </div>
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
        /* Card grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              allPeople={people}
              onEdit={() => setEditingId(person.id)}
              onDelete={() => handleDelete(person.id)}
              editing={editingId === person.id}
              onSaveEdit={(data) => handleUpdate(person.id, data)}
              onCancelEdit={() => setEditingId(null)}
              saving={saving}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <>
          <ListExportBar
            onPrint={() => {
              const rows = sortedPeople.map((p) => ({
                Name: p.name,
                "Korean Name": p.name_ko || "-",
                Role: p.role || "-",
                Affiliation: p.affiliation || "-",
                Email: p.email || "-",
                Relationship: p.relationship || "-",
                Expertise: p.expertise.length > 0 ? p.expertise.join(", ") : "-",
                Projects: p.projects.length > 0 ? p.projects.join(", ") : "-",
              }));
              printList("People", rows);
            }}
            onExportMD={() => {
              const rows = sortedPeople.map((p) => ({
                Name: p.name,
                "Korean Name": p.name_ko || "-",
                Role: p.role || "-",
                Affiliation: p.affiliation || "-",
                Email: p.email || "-",
                Relationship: p.relationship || "-",
                Expertise: p.expertise.length > 0 ? p.expertise.join(", ") : "-",
                Projects: p.projects.length > 0 ? p.projects.join(", ") : "-",
              }));
              downloadFile(generateMD("People", rows), "people.md", "text/markdown");
            }}
            onExportCSV={() => {
              const rows = sortedPeople.map((p) => ({
                Name: p.name,
                "Korean Name": p.name_ko || "",
                Role: p.role || "",
                Affiliation: p.affiliation || "",
                Email: p.email || "",
                Relationship: p.relationship || "",
                Expertise: p.expertise.join(", "),
                Projects: p.projects.join(", "),
              }));
              downloadFile(generateCSV(rows), "people.csv", "text/csv");
            }}
          />
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                  {[
                    { key: "name", label: "Name" },
                    { key: "role", label: "Role" },
                    { key: "affiliation", label: "Affiliation" },
                    { key: "email", label: "Email" },
                    { key: "relationship", label: "Relationship" },
                    { key: "projects", label: "Projects" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key && (
                          <span className="text-indigo-500">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {sortedPeople.map((person) => {
                  const relColor =
                    RELATIONSHIP_COLORS[person.relationship] || RELATIONSHIP_COLORS.external;
                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {person.name}
                          </p>
                          {person.name_ko && (
                            <p className="text-xs text-neutral-400">{person.name_ko}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {person.role || "-"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                        {person.affiliation || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {person.email ? (
                          <a
                            href={`mailto:${person.email}`}
                            className="text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {person.email}
                          </a>
                        ) : (
                          <span className="text-neutral-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {person.relationship && (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${relColor}`}
                          >
                            {person.relationship}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {person.projects.length > 0
                          ? person.projects.join(", ")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingId(person.id)}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(person.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
