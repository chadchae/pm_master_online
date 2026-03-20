"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Check,
  Star,
  Smile,
  GripVertical,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";
import { useLocale } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/AppDialogs";
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
  hierarchy: string;
  importance: number;
  closeness: number;
  notes: string;
  projects: string[];
  connections: string[];
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
  hierarchy: string;
  importance: string;
  closeness: string;
  notes: string;
  connections: string[];
}

const RELATIONSHIP_COLORS: Record<string, string> = {
  self: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "co-author": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  advisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  colleague: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  friend: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  external: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const RELATIONSHIP_OPTIONS = [
  "self",
  "co-author",
  "advisor",
  "student",
  "colleague",
  "friend",
  "external",
];

const HIERARCHY_OPTIONS = ["선배", "동기", "후배"];
const HIERARCHY_COLORS: Record<string, string> = {
  "선배": "text-purple-600 dark:text-purple-400",
  "동기": "text-blue-600 dark:text-blue-400",
  "후배": "text-green-600 dark:text-green-400",
};

const EMPTY_FORM: PersonFormData = {
  name: "",
  name_ko: "",
  role: "",
  affiliation: "",
  email: "",
  expertise: "",
  relationship: "colleague",
  hierarchy: "",
  importance: "0",
  closeness: "0",
  notes: "",
  connections: [],
};

// Star/Smile rating component
function RatingInput({
  value,
  onChange,
  max = 5,
  icon: Icon,
  activeColor,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  icon: typeof Star;
  activeColor: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
          className={`p-0.5 rounded transition-colors ${
            i < value ? activeColor : "text-neutral-300 dark:text-neutral-600 hover:text-neutral-400"
          }`}
        >
          <Icon className="w-4 h-4" fill={i < value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

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
            별칭
          </label>
          <input
            name="name_ko"
            value={form.name_ko}
            onChange={handleChange}
            placeholder="별칭 (선택)"
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
          {(() => {
            const emails = form.email ? form.email.split(",").map((e) => e.trim()) : [""];
            const updateEmails = (newEmails: string[]) => setForm({ ...form, email: newEmails.join(", ") });
            return (
              <div className="space-y-1.5">
                {emails.map((em, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      value={em}
                      onChange={(e) => { const arr = [...emails]; arr[idx] = e.target.value; updateEmails(arr); }}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {emails.length > 1 && (
                      <button type="button" onClick={() => { const arr = emails.filter((_, i) => i !== idx); updateEmails(arr.length ? arr : [""]); }} className="p-1 text-neutral-400 hover:text-red-500 rounded"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => updateEmails([...emails, ""])} className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">
                  <Plus className="w-3 h-3" /> Add email
                </button>
              </div>
            );
          })()}
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
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            위계
          </label>
          <select
            name="hierarchy"
            value={form.hierarchy}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">--</option>
            {HIERARCHY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Importance + Closeness */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            중요도
          </label>
          <RatingInput
            value={parseInt(form.importance) || 0}
            onChange={(v) => setForm({ ...form, importance: String(v) })}
            icon={Star}
            activeColor="text-amber-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            친밀도
          </label>
          <RatingInput
            value={parseInt(form.closeness) || 0}
            onChange={(v) => setForm({ ...form, closeness: String(v) })}
            icon={Smile}
            activeColor="text-pink-400"
          />
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
  dragHandlers,
  isDragged,
  isDragOver,
}: {
  person: Person;
  allPeople: Person[];
  onEdit: () => void;
  onDelete: () => void;
  editing: boolean;
  onSaveEdit: (data: PersonFormData) => void;
  onCancelEdit: () => void;
  saving: boolean;
  dragHandlers?: {
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
    onDragLeave: () => void;
  };
  isDragged?: boolean;
  isDragOver?: boolean;
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
          hierarchy: person.hierarchy || "",
          importance: String(person.importance || 0),
          closeness: String(person.closeness || 0),
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
    <div
      className={`bg-white dark:bg-neutral-900 border rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors group ${
        isDragged
          ? "opacity-50 border-neutral-300 dark:border-neutral-800"
          : isDragOver
          ? "border-indigo-400 dark:border-indigo-500"
          : "border-neutral-200 dark:border-neutral-700"
      }`}
      draggable
      onDragStart={dragHandlers?.onDragStart}
      onDragEnd={dragHandlers?.onDragEnd}
      onDragOver={dragHandlers?.onDragOver}
      onDrop={dragHandlers?.onDrop}
      onDragLeave={dragHandlers?.onDragLeave}
    >
      {/* Header — name + alias + role on same line */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1 min-w-0">
          <GripVertical className="w-3 h-3 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
            {person.name}
          </h3>
          {person.name_ko && (
            <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-1">{person.name_ko}</span>
          )}
          {person.role && (
            <span className="text-sm text-neutral-400 dark:text-neutral-500 ml-1">· {person.role}</span>
          )}
        </div>
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex-shrink-0"
          title="Edit"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {/* Details */}
      <div>

        {/* Affiliation */}
        {person.affiliation && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{person.affiliation}</span>
          </div>
        )}

        {/* Email(s) */}
        {person.email && (
          <div className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 min-w-0">
              {person.email.split(",").map((em, i) => (
                <a key={i} href={`mailto:${em.trim()}`} className="truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{em.trim()}</a>
              ))}
            </div>
          </div>
        )}

        {/* Expertise tags */}
        {person.expertise.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {person.expertise.map((exp, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <Tag className="w-2.5 h-2.5" />{exp}
              </span>
            ))}
          </div>
        )}

        {/* Relationship + Hierarchy + Importance + Closeness */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {person.relationship && (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${relColor}`}>
            {person.relationship}
          </span>
        )}
        {person.hierarchy && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${HIERARCHY_COLORS[person.hierarchy] || "text-neutral-500"}`}>
            {person.hierarchy}
          </span>
        )}
        {(person.importance || 0) > 0 && (
          <span className="inline-flex text-amber-400" title={`중요도: ${person.importance}/5`}>
            {Array.from({ length: person.importance }).map((_, i) => (
              <Star key={i} className="w-3 h-3" fill="currentColor" />
            ))}
          </span>
        )}
        {(person.closeness || 0) > 0 && (
          <span className="inline-flex text-pink-400" title={`친밀도: ${person.closeness}/5`}>
            {Array.from({ length: person.closeness }).map((_, i) => (
              <Smile key={i} className="w-3 h-3" />
            ))}
          </span>
        )}
      </div>


        {/* Notes */}
        {person.notes && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-2 line-clamp-2">
            {person.notes}
          </p>
        )}
      </div>

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

  // Checkbox filters
  const [filters, setFilters] = useState<{
    relationships: Set<string>;
    affiliations: Set<string>;
    hierarchies: Set<string>;
    roles: Set<string>;
    importances: Set<string>;
    closenesses: Set<string>;
  }>({ relationships: new Set(), affiliations: new Set(), hierarchies: new Set(), roles: new Set(), importances: new Set(), closenesses: new Set() });

  // Persist people order
  useEffect(() => {
    localStorage.setItem("pm_peopleOrder", JSON.stringify(peopleOrder));
  }, [peopleOrder]);

  // Extract unique values for filter checkboxes
  const uniqueRelationships = useMemo(() => [...new Set(people.map((p) => p.relationship).filter(Boolean))], [people]);
  const uniqueAffiliations = useMemo(() => [...new Set(people.map((p) => p.affiliation).filter(Boolean))], [people]);
  const uniqueHierarchies = useMemo(() => [...new Set(people.map((p) => p.hierarchy).filter(Boolean))], [people]);
  const uniqueRoles = useMemo(() => [...new Set(people.map((p) => p.role).filter(Boolean))], [people]);
  const uniqueImportances = useMemo(() => [...new Set(people.map((p) => String(p.importance || 0)).filter((v) => v !== "0"))].sort(), [people]);
  const uniqueClosenesses = useMemo(() => [...new Set(people.map((p) => String(p.closeness || 0)).filter((v) => v !== "0"))].sort(), [people]);

  const toggleFilter = (group: keyof typeof filters, value: string) => {
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

  const hasActiveFilters = filters.relationships.size > 0 || filters.affiliations.size > 0 || filters.hierarchies.size > 0 || filters.roles.size > 0 || filters.importances.size > 0 || filters.closenesses.size > 0;

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
        name_ko: person.name_ko,
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
        case "email":
          cmp = (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase());
          break;
        case "relationship":
          cmp = (a.relationship || "zzz").localeCompare(b.relationship || "zzz");
          break;
        case "hierarchy": {
          const hOrder = (h: string) => h === "선배" ? "a" : h === "동기" ? "b" : h === "후배" ? "c" : "zzz";
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
      const data = await apiFetch<{ people: Person[] }>("/api/people");
      setPeople(data.people);
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
  const selfPeople = orderedPeople.filter((p) => p.relationship === "self");
  const nonSelfPeople = orderedPeople.filter((p) => p.relationship !== "self");

  // Render card section
  const renderCardGrid = (personList: Person[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {personList.map((person) => (
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
          />
        </div>
      )}

      {/* Relationship group filter buttons */}
      {!loading && people.length > 0 && (
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
          </div>

          {/* Checkbox filters — one category per line */}
          <div className="space-y-1.5 text-xs">
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
                onClick={() => setFilters({ relationships: new Set(), affiliations: new Set(), hierarchies: new Set(), roles: new Set(), importances: new Set(), closenesses: new Set() })}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
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
        /* Card grid with self section */
        <div className="space-y-6">
          {/* Self section */}
          {selfPeople.length > 0 && relFilter === "all" && (
            <div>
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Self</h2>
              {renderCardGrid(selfPeople)}
            </div>
          )}
          {/* Others */}
          {nonSelfPeople.length > 0 && renderCardGrid(nonSelfPeople)}
          {/* If filtered to self only */}
          {relFilter === "self" && renderCardGrid(orderedPeople)}
        </div>
      ) : (
        /* List view */
        <>
          <ListExportBar
            onPrint={() => {
              const rows = filteredPeople.map((p) => ({
                Name: p.name,
                "별칭": p.name_ko || "-",
                Role: p.role || "-",
                Affiliation: p.affiliation || "-",
                Email: p.email || "-",
                Relationship: p.relationship || "-",
                중요도: p.importance ? String(p.importance) : "-",
                친밀도: p.closeness ? String(p.closeness) : "-",
                Expertise: p.expertise.length > 0 ? p.expertise.join(", ") : "-",
                Projects: p.projects.length > 0 ? p.projects.join(", ") : "-",
              }));
              printList("People", rows);
            }}
            onExportMD={() => {
              const rows = filteredPeople.map((p) => ({
                Name: p.name,
                "별칭": p.name_ko || "-",
                Role: p.role || "-",
                Affiliation: p.affiliation || "-",
                Email: p.email || "-",
                Relationship: p.relationship || "-",
                중요도: p.importance ? String(p.importance) : "-",
                친밀도: p.closeness ? String(p.closeness) : "-",
                Expertise: p.expertise.length > 0 ? p.expertise.join(", ") : "-",
                Projects: p.projects.length > 0 ? p.projects.join(", ") : "-",
              }));
              downloadFile(generateMD("People", rows), "people.md", "text/markdown");
            }}
            onExportCSV={() => {
              const rows = filteredPeople.map((p) => ({
                Name: p.name,
                "별칭": p.name_ko || "",
                Role: p.role || "",
                Affiliation: p.affiliation || "",
                Email: p.email || "",
                Relationship: p.relationship || "",
                중요도: String(p.importance || 0),
                친밀도: String(p.closeness || 0),
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
                    { key: "hierarchy", label: "위계" },
                    { key: "importance", label: "중요도" },
                    { key: "closeness", label: "친밀도" },
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
                {filteredPeople.map((person) => {
                  const relColor =
                    RELATIONSHIP_COLORS[person.relationship] || RELATIONSHIP_COLORS.external;
                  const isEditing = listEditingId === person.id;
                  const inputClass =
                    "w-full px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500";
                  return (
                    <tr
                      key={person.id}
                      className={`transition-colors ${isEditing ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}
                    >
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={inputClass}
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter") saveListEdit(); if (e.key === "Escape") cancelListEdit(); }}
                          />
                        ) : (
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {person.name}
                            </p>
                            {person.name_ko && (
                              <p className="text-xs text-neutral-400">{person.name_ko}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className={inputClass}
                            onKeyDown={(e) => { if (e.key === "Enter") saveListEdit(); if (e.key === "Escape") cancelListEdit(); }}
                          />
                        ) : (
                          <span className="text-neutral-600 dark:text-neutral-400">{person.role || "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editAffiliation}
                            onChange={(e) => setEditAffiliation(e.target.value)}
                            className={inputClass}
                            onKeyDown={(e) => { if (e.key === "Enter") saveListEdit(); if (e.key === "Escape") cancelListEdit(); }}
                          />
                        ) : (
                          <span className="text-neutral-600 dark:text-neutral-400">{person.affiliation || "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className={inputClass}
                            onKeyDown={(e) => { if (e.key === "Enter") saveListEdit(); if (e.key === "Escape") cancelListEdit(); }}
                          />
                        ) : person.email ? (
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
                        {isEditing ? (
                          <select
                            value={editRelationship}
                            onChange={(e) => setEditRelationship(e.target.value)}
                            className={inputClass}
                          >
                            {RELATIONSHIP_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : person.relationship ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${relColor}`}
                          >
                            {person.relationship}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editHierarchy}
                            onChange={(e) => setEditHierarchy(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">--</option>
                            {HIERARCHY_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : person.hierarchy ? (
                          <span className={`text-xs font-medium ${HIERARCHY_COLORS[person.hierarchy] || ""}`}>
                            {person.hierarchy}
                          </span>
                        ) : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(person.importance || 0) > 0 ? (
                          <span className="inline-flex text-amber-400">
                            {Array.from({ length: person.importance }).map((_, i) => (
                              <Star key={i} className="w-3 h-3" fill="currentColor" />
                            ))}
                          </span>
                        ) : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {(person.closeness || 0) > 0 ? (
                          <span className="inline-flex text-pink-400">
                            {Array.from({ length: person.closeness }).map((_, i) => (
                              <Smile key={i} className="w-3 h-3" />
                            ))}
                          </span>
                        ) : <span className="text-neutral-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveListEdit}
                                disabled={saving || !editName.trim()}
                                className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={cancelListEdit}
                                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startListEdit(person)}
                                className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmDeletePerson(person)}
                                className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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
