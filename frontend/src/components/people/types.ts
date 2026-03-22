import { Star } from "lucide-react";

// Types
export interface Person {
  id: string;
  name: string;
  alias: string;
  role: string;
  affiliation: string;
  industry: string;
  email: string;
  expertise: string[];
  relationship: string;
  hierarchy: string;
  importance: number;
  closeness: number;
  notes: string;
  projects: string[];
  connections: string[];
  photo: string;
  created_at: string;
  updated_at: string;
}

export interface PersonFormData {
  name: string;
  alias: string;
  role: string;
  affiliation: string;
  industry: string;
  email: string;
  expertise: string;
  relationship: string;
  hierarchy: string;
  importance: string;
  closeness: string;
  notes: string;
  projects: string[];
  connections: string[];
}

export const RELATIONSHIP_COLORS: Record<string, string> = {
  self: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "co-author": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  advisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  advisee: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  student: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  colleague: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  friend: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  external: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const RELATIONSHIP_OPTIONS = [
  "self",
  "co-author",
  "advisor",
  "advisee",
  "student",
  "colleague",
  "friend",
  "external",
];

export const HIERARCHY_OPTIONS = ["선배", "동기", "후배", "???"];
export const HIERARCHY_COLORS: Record<string, string> = {
  "선배": "text-purple-600 dark:text-purple-400",
  "동기": "text-blue-600 dark:text-blue-400",
  "후배": "text-green-600 dark:text-green-400",
  "???": "text-neutral-400 dark:text-neutral-500",
};

export const EMPTY_FORM: PersonFormData = {
  name: "",
  alias: "",
  role: "",
  affiliation: "",
  industry: "",
  email: "",
  expertise: "",
  relationship: "colleague",
  hierarchy: "",
  importance: "0",
  closeness: "0",
  notes: "",
  projects: [],
  connections: [],
};

export type RatingInputIcon = typeof Star;

export interface PeopleFilters {
  relationships: Set<string>;
  affiliations: Set<string>;
  industries: Set<string>;
  hierarchies: Set<string>;
  roles: Set<string>;
  importances: Set<string>;
  closenesses: Set<string>;
}
