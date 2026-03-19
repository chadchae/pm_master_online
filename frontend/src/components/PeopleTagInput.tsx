"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { X, Plus, Users, ChevronDown } from "lucide-react";

interface Person {
  id: string;
  name: string;
  name_ko: string;
  role: string;
  relationship: string;
}

interface PeopleTagInputProps {
  value: string[];        // Array of person names
  onChange: (value: string[]) => void;
  label?: string;
  placeholder?: string;
}

const REL_COLORS: Record<string, string> = {
  self: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "co-author": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  advisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  colleague: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  external: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

export function PeopleTagInput({
  value,
  onChange,
  label = "Related People",
  placeholder = "Add person...",
}: PeopleTagInputProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    apiFetch<{ people: Person[] }>("/api/people")
      .then((res) => setPeople(res.people || []))
      .catch(() => {});
  }, []);

  const addPerson = async (name: string) => {
    if (!name.trim() || value.includes(name.trim())) return;
    const trimmed = name.trim();

    // If not in People list, auto-create
    const exists = people.find((p) => p.name === trimmed);
    if (!exists) {
      try {
        await apiFetch("/api/people", {
          method: "POST",
          body: JSON.stringify({
            name: trimmed,
            relationship: "colleague",
          }),
        });
        // Reload people list
        const res = await apiFetch<{ people: Person[] }>("/api/people");
        setPeople(res.people || []);
      } catch {
        // Continue anyway — add to tags even if API fails
      }
    }

    onChange([...value, trimmed]);
    setCustomInput("");
    setOpen(false);
  };

  const removePerson = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  // People not yet added
  const available = people.filter((p) => !value.includes(p.name));

  return (
    <div>
      {label && (
        <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
          <Users className="w-3.5 h-3.5" />
          {label}
        </label>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {value.map((name) => {
          const person = people.find((p) => p.name === name);
          const color = person ? (REL_COLORS[person.relationship] || REL_COLORS.external) : REL_COLORS.external;
          return (
            <span
              key={name}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${color}`}
            >
              {person?.name_ko ? `${name} (${person.name_ko})` : name}
              <button
                onClick={() => removePerson(name)}
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
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-20 overflow-hidden">
              {/* Custom input */}
              <div className="p-1.5 border-b border-neutral-100 dark:border-neutral-700">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customInput.trim()) {
                      addPerson(customInput);
                    }
                    if (e.key === "Escape") setOpen(false);
                  }}
                  placeholder={placeholder}
                  className="w-full px-2 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* People list */}
              <div className="max-h-40 overflow-y-auto">
                {available.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-neutral-400">
                    {people.length === 0 ? "No people registered" : "All added"}
                  </p>
                ) : (
                  available.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addPerson(p.name)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-between"
                    >
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {p.name}
                        {p.name_ko && (
                          <span className="text-neutral-400 ml-1">({p.name_ko})</span>
                        )}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${REL_COLORS[p.relationship] || ""}`}>
                        {p.relationship}
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
