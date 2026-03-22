"use client";

import {
  Edit3,
  Trash2,
  Star,
  Smile,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { ListExportBar, generateMD, generateCSV, downloadFile, printList } from "@/components/ListExportBar";
import {
  type Person,
  RELATIONSHIP_COLORS,
  RELATIONSHIP_OPTIONS,
  HIERARCHY_OPTIONS,
  HIERARCHY_COLORS,
} from "./types";

export function PeopleListView({
  filteredPeople,
  sortKey,
  sortDir,
  toggleSort,
  listEditingId,
  editName,
  setEditName,
  editRole,
  setEditRole,
  editAffiliation,
  setEditAffiliation,
  editEmail,
  setEditEmail,
  editRelationship,
  setEditRelationship,
  editHierarchy,
  setEditHierarchy,
  saving,
  saveListEdit,
  cancelListEdit,
  startListEdit,
  confirmDeletePerson,
}: {
  filteredPeople: Person[];
  sortKey: string;
  sortDir: "asc" | "desc";
  toggleSort: (key: string) => void;
  listEditingId: string | null;
  editName: string;
  setEditName: (v: string) => void;
  editRole: string;
  setEditRole: (v: string) => void;
  editAffiliation: string;
  setEditAffiliation: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editRelationship: string;
  setEditRelationship: (v: string) => void;
  editHierarchy: string;
  setEditHierarchy: (v: string) => void;
  saving: boolean;
  saveListEdit: () => void;
  cancelListEdit: () => void;
  startListEdit: (person: Person) => void;
  confirmDeletePerson: (person: Person) => void;
}) {
  return (
    <>
      <ListExportBar
        onPrint={() => {
          const rows = filteredPeople.map((p) => ({
            Name: p.name,
            "별칭": p.alias || "-",
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
            "별칭": p.alias || "-",
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
            "별칭": p.alias || "",
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
                { key: "industry", label: "산업" },
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
                        {person.alias && (
                          <p className="text-xs text-neutral-400">{person.alias}</p>
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
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 text-sm">
                    {person.industry || "-"}
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
  );
}
