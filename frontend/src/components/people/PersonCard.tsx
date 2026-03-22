"use client";

import { useState } from "react";
import {
  Users,
  Building2,
  Mail,
  Tag,
  Edit3,
  Trash2,
  Star,
  Smile,
  GripVertical,
  Link2,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { PersonForm } from "./PersonForm";
import {
  type Person,
  type PersonFormData,
  RELATIONSHIP_COLORS,
  HIERARCHY_COLORS,
} from "./types";

export function PersonCard({
  person,
  allPeople,
  allProjectLabels,
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
  allProjectLabels: string[];
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
          alias: person.alias,
          role: person.role,
          affiliation: person.affiliation,
          industry: person.industry || "",
          email: person.email,
          expertise: person.expertise.join(", "),
          relationship: person.relationship,
          hierarchy: person.hierarchy || "",
          importance: String(person.importance || 0),
          closeness: String(person.closeness || 0),
          notes: person.notes,
          projects: person.projects || [],
          connections: person.connections || [],
        }}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
        saving={saving}
        allPeople={allPeople}
        allProjectLabels={allProjectLabels}
        currentId={person.id}
        currentPhoto={person.photo}
      />
    );
  }

  const relColor =
    RELATIONSHIP_COLORS[person.relationship] || RELATIONSHIP_COLORS.external;

  return (
    <div
      className={`bg-white dark:bg-neutral-900 rounded-xl p-5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors group ${
        isDragged
          ? "opacity-50 border border-neutral-300 dark:border-neutral-800"
          : isDragOver
          ? "border border-indigo-400 dark:border-indigo-500"
          : person.relationship === "self"
          ? "border-2 border-amber-400 dark:border-amber-500"
          : "border border-neutral-200 dark:border-neutral-700"
      }`}
      draggable
      onDragStart={dragHandlers?.onDragStart}
      onDragEnd={dragHandlers?.onDragEnd}
      onDragOver={dragHandlers?.onDragOver}
      onDrop={dragHandlers?.onDrop}
      onDragLeave={dragHandlers?.onDragLeave}
    >
      {/* Header with photo */}
      <div className="flex gap-4 mb-3">
        {/* Photo thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
          {person.photo ? (
            <img src={`/api/people/photos/${encodeURIComponent(person.photo)}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
              <Users className="w-7 h-7" />
            </div>
          )}
        </div>
        {/* Name + affiliation + details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <GripVertical className="w-3 h-3 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">
                  {person.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
              <button onClick={onEdit} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" title="Edit">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => { if (confirmDelete) { onDelete(); setConfirmDelete(false); } else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); } }} className={`p-1 rounded transition-colors ${confirmDelete ? "bg-red-100 dark:bg-red-950 text-red-600" : "hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-400 hover:text-red-500"}`} title={confirmDelete ? "Click again to confirm" : "Delete"}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Alias + Role */}
          {(person.alias || person.role) && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 pl-4">
              {person.alias && <span>{person.alias}</span>}
              {person.alias && person.role && <span className="text-neutral-300 dark:text-neutral-600 mx-1">·</span>}
              {person.role && <span>{person.role}</span>}
            </p>
          )}
          {/* Affiliation */}
          {person.affiliation && (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 pl-4 truncate">{person.affiliation}</p>
          )}
        </div>
      </div>

      {/* Details — text aligned with name */}
      <div className="pl-4">

        {/* Industry (affiliation moved to header) */}
        {person.industry && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{person.industry}</span>
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


      </div>

      {/* Notes — separated by line, boxed */}
      {person.notes && (
        <>
          <div className="border-t border-neutral-100 dark:border-neutral-800 my-2" />
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-md px-3 py-2">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-5 whitespace-pre-line">
              {person.notes}
            </p>
          </div>
        </>
      )}

      {/* Projects — show latest 3 in card view, one per line */}
      {person.projects.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500 mb-1">Projects</p>
          <div className="pl-2 space-y-0.5">
            {person.projects.slice(-3).map((proj, i) => (
              <p key={i} className="text-xs text-neutral-500 dark:text-neutral-400 truncate">· {proj}</p>
            ))}
            {person.projects.length > 3 && (
              <p className="text-xs text-neutral-400">+{person.projects.length - 3} more</p>
            )}
          </div>
        </div>
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

    </div>
  );
}
