"use client";

import { Star, AlertTriangle, Clock, Users, User, Crown } from "lucide-react";
import { ProjectMetadata } from "@/lib/api";

interface MetaTagsProps {
  metadata: ProjectMetadata;
  compact?: boolean;
  editable?: boolean;
  onUpdate?: (field: string, value: string) => void;
}

// Severity/Critical colors
const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "text-green-500", label: "Low" },
  medium: { color: "text-yellow-500", label: "Med" },
  high: { color: "text-orange-500", label: "High" },
  critical: { color: "text-red-500", label: "Crit" },
};

const SEVERITY_ORDER = ["low", "medium", "high", "critical"];

// Urgency colors
const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "text-green-500", label: "Low" },
  medium: { color: "text-yellow-500", label: "Med" },
  high: { color: "text-orange-500", label: "High" },
  urgent: { color: "text-red-500", label: "Urg" },
};

const URGENCY_ORDER = ["low", "medium", "high", "urgent"];

export function MetaTags({ metadata, compact = false, editable = false, onUpdate }: MetaTagsProps) {
  const importance = parseInt(metadata?.["중요도"] || "0", 10);
  const severity = metadata?.["위급도"];
  const urgency = metadata?.["긴급도"];
  const collab = metadata?.["협업"];
  const role = metadata?.["주도"];
  const owner = metadata?.["오너"];

  const hasAny = importance > 0 || severity || urgency || collab || editable;
  if (!hasAny) return null;

  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";
  const starSize = compact ? "w-2.5 h-2.5" : "w-3 h-3";

  const handleStarClick = (rating: number) => {
    if (!editable || !onUpdate) return;
    const newVal = importance === rating ? 0 : rating;
    onUpdate("중요도", String(newVal));
  };

  const cycleSeverity = () => {
    if (!editable || !onUpdate) return;
    const idx = severity ? SEVERITY_ORDER.indexOf(severity) : -1;
    const next = SEVERITY_ORDER[(idx + 1) % (SEVERITY_ORDER.length + 1)];
    onUpdate("위급도", next || "");
  };

  const cycleUrgency = () => {
    if (!editable || !onUpdate) return;
    const idx = urgency ? URGENCY_ORDER.indexOf(urgency) : -1;
    const next = URGENCY_ORDER[(idx + 1) % (URGENCY_ORDER.length + 1)];
    onUpdate("긴급도", next || "");
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Importance: stars — clickable when editable */}
      <span className={`inline-flex items-center ${editable ? "cursor-pointer" : ""}`} title={`중요도: ${importance}/5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            onClick={(e) => { e.stopPropagation(); handleStarClick(i + 1); }}
            className={`${starSize} ${
              i < importance
                ? "text-amber-400 fill-amber-400"
                : editable
                ? "text-neutral-300 dark:text-neutral-600 hover:text-amber-300 cursor-pointer"
                : "hidden"
            } ${editable ? "cursor-pointer" : ""}`}
          />
        ))}
      </span>

      {/* Severity/Critical — click to cycle */}
      {(severity || editable) && (
        <span
          className={`inline-flex items-center gap-0.5 ${
            severity && SEVERITY_CONFIG[severity] ? SEVERITY_CONFIG[severity].color : "text-neutral-300 dark:text-neutral-600"
          } ${editable ? "cursor-pointer hover:opacity-80" : ""}`}
          title={`엄정함: ${severity || "none"}`}
          onClick={(e) => { e.stopPropagation(); cycleSeverity(); }}
        >
          <AlertTriangle className={iconSize} />
          {!compact && (severity ? SEVERITY_CONFIG[severity]?.label || severity : editable ? "Sev" : "")}
        </span>
      )}

      {/* Urgency — click to cycle */}
      {(urgency || editable) && (
        <span
          className={`inline-flex items-center gap-0.5 ${
            urgency && URGENCY_CONFIG[urgency] ? URGENCY_CONFIG[urgency].color : "text-neutral-300 dark:text-neutral-600"
          } ${editable ? "cursor-pointer hover:opacity-80" : ""}`}
          title={`긴급도: ${urgency || "none"}`}
          onClick={(e) => { e.stopPropagation(); cycleUrgency(); }}
        >
          <Clock className={iconSize} />
          {!compact && (urgency ? URGENCY_CONFIG[urgency]?.label || urgency : editable ? "Urg" : "")}
        </span>
      )}

      {/* Collaboration */}
      {collab === "collaboration" && (
        <span
          className="inline-flex items-center gap-0.5 text-blue-500"
          title={`Collaboration${role === "lead" ? " (Lead)" : role === "member" ? " (Member)" : ""}${owner ? ` — Owner: ${owner}` : ""}`}
        >
          {role === "lead" ? (
            <Crown className={iconSize} />
          ) : (
            <Users className={iconSize} />
          )}
          {!compact && owner && (
            <span className="text-xs truncate max-w-[60px]">{owner}</span>
          )}
        </span>
      )}

      {collab === "personal" && (
        <span
          className="inline-flex items-center text-neutral-400"
          title="Personal project"
        >
          <User className={iconSize} />
        </span>
      )}
    </div>
  );
}
