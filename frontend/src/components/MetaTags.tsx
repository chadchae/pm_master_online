"use client";

import { Star, AlertTriangle, Clock, Users, User, Crown } from "lucide-react";
import { ProjectMetadata } from "@/lib/api";

interface MetaTagsProps {
  metadata: ProjectMetadata;
  compact?: boolean;
}

// Severity/Critical colors
const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "text-green-500", label: "Low" },
  medium: { color: "text-yellow-500", label: "Med" },
  high: { color: "text-orange-500", label: "High" },
  critical: { color: "text-red-500", label: "Crit" },
};

// Urgency colors
const URGENCY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: "text-green-500", label: "Low" },
  medium: { color: "text-yellow-500", label: "Med" },
  high: { color: "text-orange-500", label: "High" },
  urgent: { color: "text-red-500", label: "Urg" },
};

export function MetaTags({ metadata, compact = false }: MetaTagsProps) {
  const importance = parseInt(metadata?.["중요도"] || "0", 10);
  const severity = metadata?.["위급도"];
  const urgency = metadata?.["긴급도"];
  const collab = metadata?.["협업"];
  const role = metadata?.["주도"];
  const owner = metadata?.["오너"];

  const hasAny = importance > 0 || severity || urgency || collab;
  if (!hasAny) return null;

  const iconSize = compact ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Importance: stars */}
      {importance > 0 && (
        <span className="inline-flex items-center" title={`Importance: ${importance}/5`}>
          {Array.from({ length: Math.min(importance, 5) }).map((_, i) => (
            <Star
              key={i}
              className={`${compact ? "w-2.5 h-2.5" : "w-3 h-3"} text-amber-400 fill-amber-400`}
            />
          ))}
        </span>
      )}

      {/* Severity/Critical */}
      {severity && SEVERITY_CONFIG[severity] && (
        <span
          className={`inline-flex items-center gap-0.5 ${SEVERITY_CONFIG[severity].color}`}
          title={`Severity: ${SEVERITY_CONFIG[severity].label}`}
        >
          <AlertTriangle className={iconSize} />
          {!compact && (
            <span className="text-xs">{SEVERITY_CONFIG[severity].label}</span>
          )}
        </span>
      )}

      {/* Urgency */}
      {urgency && URGENCY_CONFIG[urgency] && (
        <span
          className={`inline-flex items-center gap-0.5 ${URGENCY_CONFIG[urgency].color}`}
          title={`Urgency: ${URGENCY_CONFIG[urgency].label}`}
        >
          <Clock className={iconSize} />
          {!compact && (
            <span className="text-xs">{URGENCY_CONFIG[urgency].label}</span>
          )}
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
