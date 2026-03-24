"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Map, CalendarDays, CalendarClock, CheckCircle2, CircleDot,
  AlarmClock, Plus, X, LayoutGrid, List, Columns2,
  Edit3, Save, ChevronLeft, CheckSquare, StickyNote, BookOpen, AlertCircle, CalendarRange,
  Star, AlertTriangle, Clock, Hash, Target, Download, FolderKanban, Users, ExternalLink,
  Eye, Trash2, FileJson,
} from "lucide-react";
import { toPng } from "html-to-image";
import { RelatedProjectsInput } from "@/components/RelatedProjectsInput";
import { PeopleTagInput } from "@/components/PeopleTagInput";
import { RelatedItemInput, fetchItemsByType, RelatedItemType } from "@/components/RelatedItemInput";
import { apiFetch } from "@/lib/api";
import { PlanBuilder, PlanNode, PlanEdge } from "@/components/PlanBuilder";
import { MandalartBuilder, MandalartData, createEmptyMandalart } from "@/components/MandalartBuilder";

// ── Types ──────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  title: string;
  stage: string;
  description: string;
  relatedProjects: string[];
  relatedPeople: string[];
  relatedTodos: string[];
  relatedNotes: string[];
  relatedLearning: string[];
  relatedIssues: string[];
  relatedSchedule: string[];
  createdAt: string;
  createdAtISO: string;    // YYYY-MM-DD for date calculation
  planNodes: PlanNode[];   // 계획빌딩 nodes
  planEdges: PlanEdge[];   // 계획빌딩 edges
  mandalart: MandalartData;
  // Plan horizon
  horizon: string;         // "long" | "short" | ""
  horizonPeriod: string;   // e.g. "3months" | "1week"
  // Tags & Priority
  importance: string;      // "1"–"5" or ""
  severity: string;        // "" | "low" | "medium" | "high" | "critical"
  urgency: string;         // "" | "low" | "medium" | "high" | "urgent"
  planType: string;        // free text category
  // Timeline & Progress
  startDate: string;
  targetEndDate: string;
  actualEndDate: string;
  progress: number;        // 0–100
}

// ── Meta display helpers ───────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  low:      { label: "Low",      cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  medium:   { label: "Medium",   cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" },
  high:     { label: "High",     cls: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  critical: { label: "Critical", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};
const URGENCY_CONFIG: Record<string, { label: string; cls: string }> = {
  low:    { label: "Low",    cls: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
  medium: { label: "Medium", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" },
  high:   { label: "High",   cls: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};
const PLAN_TYPE_LABELS: Record<string, string> = {
  research: "Research", development: "Development", writing: "Writing",
  review: "Review", planning: "Planning", learning: "Learning",
  personal: "Personal", business: "Business",
};

// ── Stages ─────────────────────────────────────────────────────────────────
const STAGES = [
  { key: "idea",     label: "아이디어", bg: "bg-amber-50 dark:bg-amber-950",      text: "text-amber-600 dark:text-amber-400",    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  { key: "planning", label: "계획중",   bg: "bg-blue-50 dark:bg-blue-950",        text: "text-blue-600 dark:text-blue-400",      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { key: "active",   label: "진행중",   bg: "bg-indigo-50 dark:bg-indigo-950",    text: "text-indigo-600 dark:text-indigo-400",  badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  { key: "done",     label: "완료",     bg: "bg-neutral-100 dark:bg-neutral-800", text: "text-neutral-500 dark:text-neutral-400", badge: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300" },
];

function getStage(key: string) {
  return STAGES.find((s) => s.key === key) ?? STAGES[0];
}

const HORIZON_OPTIONS = {
  long:  ["3months", "6months", "1year", "5years", "10years"],
  short: ["1week", "1month"],
} as const;

const HORIZON_PERIOD_LABELS: Record<string, string> = {
  "3months": "3개월", "6months": "6개월", "1year": "1년", "5years": "5년", "10years": "10년",
  "1week": "1주", "1month": "1개월",
};

function calcTargetDate(isoDate: string, period: string): string {
  const d = new Date(isoDate);
  switch (period) {
    case "1week":   d.setDate(d.getDate() + 7); break;
    case "1month":  d.setMonth(d.getMonth() + 1); break;
    case "3months": d.setMonth(d.getMonth() + 3); break;
    case "6months": d.setMonth(d.getMonth() + 6); break;
    case "1year":   d.setFullYear(d.getFullYear() + 1); break;
    case "5years":  d.setFullYear(d.getFullYear() + 5); break;
    case "10years": d.setFullYear(d.getFullYear() + 10); break;
  }
  return d.toISOString().split("T")[0];
}

// ── StatCard ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconBg, iconColor, value, label, sub }: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  value: React.ReactNode; label: string; sub?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{label}</p>
          {sub && <div className="flex flex-wrap gap-1 mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>{label}</span>;
}

function StageBadge({ stageKey }: { stageKey: string }) {
  const stage = getStage(stageKey);
  return <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${stage.badge}`}>{stage.label}</span>;
}

function StarRating({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const wh = size === "md" ? "w-5 h-5" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${wh} ${value >= n ? "text-amber-400 fill-amber-400" : "text-neutral-200 dark:text-neutral-700"}`} />
      ))}
    </div>
  );
}

// ── PlanCard ───────────────────────────────────────────────────────────────
function PlanCard({
  plan, onClick, onEdit, onDelete, onExport, isDraggable, onDragStart, onDragEnd,
}: {
  plan: Plan;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const imp = parseInt(plan.importance || "0");
  const hasMandalart = !!(plan.mandalart.center || plan.mandalart.themes.some((t) => t));
  const hasDiagram = plan.planNodes.length > 0;
  return (
    <div
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug">{plan.title}</p>
        <StageBadge stageKey={plan.stage} />
      </div>
      {plan.description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2">{plan.description}</p>
      )}
      {plan.progress > 0 && (
        <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-2 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${plan.progress}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <StarRating value={imp} />
        {/* Mandalart / Diagram indicators */}
        <div className="flex items-center gap-1">
          <span title={hasDiagram ? "플랜 다이어그램 있음" : "플랜 다이어그램 없음"}>
            <Map className={`w-3 h-3 ${hasDiagram ? "text-indigo-400" : "text-neutral-200 dark:text-neutral-700"}`} />
          </span>
          <span title={hasMandalart ? "만다라트 있음" : "만다라트 없음"}>
            <LayoutGrid className={`w-3 h-3 ${hasMandalart ? "text-amber-400" : "text-neutral-200 dark:text-neutral-700"}`} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          {plan.targetEndDate && (
            <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
              <Target className="w-3 h-3" />{plan.targetEndDate}
            </span>
          )}
          <p className="text-[10px] text-neutral-400 dark:text-neutral-600">{plan.createdAt}</p>
        </div>
      </div>
      {/* Action icons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="뷰"
        ><Eye className="w-3.5 h-3.5" /></button>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="수정"
          ><Edit3 className="w-3.5 h-3.5" /></button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="삭제"
          ><Trash2 className="w-3.5 h-3.5" /></button>
        )}
        {onExport && (
          <button
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            title="JSON 내보내기"
          ><FileJson className="w-3.5 h-3.5" /></button>
        )}
      </div>
    </div>
  );
}

// ── PlanRow ────────────────────────────────────────────────────────────────
function PlanRow({
  plan, onClick, onEdit, onDelete, onExport,
}: {
  plan: Plan;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
}) {
  const imp = parseInt(plan.importance || "0");
  const hasMandalart = !!(plan.mandalart.center || plan.mandalart.themes.some((t) => t));
  const hasDiagram = plan.planNodes.length > 0;
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer last:border-b-0"
    >
      <StageBadge stageKey={plan.stage} />
      <p className="flex-1 text-sm text-neutral-900 dark:text-white font-medium">{plan.title}</p>
      {/* indicators */}
      <div className="hidden md:flex items-center gap-1">
        <span title={hasDiagram ? "플랜 다이어그램" : ""}><Map className={`w-3 h-3 ${hasDiagram ? "text-indigo-400" : "text-neutral-200 dark:text-neutral-700"}`} /></span>
        <span title={hasMandalart ? "만다라트" : ""}><LayoutGrid className={`w-3 h-3 ${hasMandalart ? "text-amber-400" : "text-neutral-200 dark:text-neutral-700"}`} /></span>
      </div>
      <div className="hidden md:block"><StarRating value={imp} /></div>
      {plan.progress > 0 && (
        <span className="hidden md:block text-[10px] text-indigo-500 font-medium w-8 text-right">{plan.progress}%</span>
      )}
      {plan.targetEndDate && (
        <span className="hidden lg:flex items-center gap-0.5 text-[10px] text-neutral-400 shrink-0">
          <Target className="w-3 h-3" />{plan.targetEndDate}
        </span>
      )}
      <p className="shrink-0 text-[10px] text-neutral-400">{plan.createdAt}</p>
      {/* row action icons */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-blue-600 transition-colors" title="뷰"><Eye className="w-3.5 h-3.5" /></button>
        {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-indigo-600 transition-colors" title="수정"><Edit3 className="w-3.5 h-3.5" /></button>}
        {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-red-600 transition-colors" title="삭제"><Trash2 className="w-3.5 h-3.5" /></button>}
        {onExport && <button onClick={(e) => { e.stopPropagation(); onExport(); }} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-emerald-600 transition-colors" title="JSON 내보내기"><FileJson className="w-3.5 h-3.5" /></button>}
      </div>
    </div>
  );
}

// ── Plan Detail (project-style) ────────────────────────────────────────────
function PlanDetail({
  plan,
  onBack,
  onChange,
  initialTab = "view",
}: {
  plan: Plan;
  onBack: () => void;
  onChange: (updated: Plan) => void;
  initialTab?: "view" | "mandalart" | "settings";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"view" | "mandalart" | "settings">(initialTab);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(plan.title);
  const [descDraft, setDescDraft] = useState(plan.description);
  const [saved, setSaved] = useState(false);
  const [relatedLabels, setRelatedLabels] = useState<Record<string, string>>({});
  const mandartRef = useRef<HTMLDivElement>(null);
  const planViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDescDraft(plan.description);
  }, [plan.id]);

  useEffect(() => {
    const types: RelatedItemType[] = ["todos", "notes", "learning", "issues", "schedule"];
    Promise.all(types.map(fetchItemsByType)).then((results) => {
      const map: Record<string, string> = {};
      results.flat().forEach((item) => { map[item.id] = item.label; });
      setRelatedLabels(map);
    }).catch(() => {});
  }, [plan.id]);

  async function downloadAsPng(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
    if (!ref.current) return;
    try {
      const url = await toPng(ref.current, { cacheBust: true, backgroundColor: "#f1f5f9" });
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
    } catch (e) {
      console.error("다운로드 실패", e);
    }
  }

  function saveTitle() {
    if (titleDraft.trim()) {
      const newTitle = titleDraft.trim();
      // Sync mandart center when title changes (if center was empty or matched old title)
      const shouldSyncCenter = !plan.mandalart.center || plan.mandalart.center === plan.title;
      onChange({
        ...plan,
        title: newTitle,
        mandalart: shouldSyncCenter
          ? { ...plan.mandalart, center: newTitle }
          : plan.mandalart,
      });
    }
    setEditingTitle(false);
  }

  const stage = getStage(plan.stage);

  return (
    <div className="flex flex-col gap-0 min-h-0">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-4">
        {/* Back + stage */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            계획 목록
          </button>
          <span className="text-neutral-300 dark:text-neutral-700">·</span>
          <select
            value={plan.stage}
            onChange={(e) => onChange({ ...plan, stage: e.target.value })}
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${stage.badge}`}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="group">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="flex-1 text-xl font-bold bg-transparent border-b-2 border-indigo-500 outline-none text-neutral-900 dark:text-white"
              />
              <button onClick={saveTitle} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h1
              onClick={() => { setTitleDraft(plan.title); setEditingTitle(true); }}
              className="text-xl font-bold text-neutral-900 dark:text-white cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
              title="클릭하여 수정"
            >
              {plan.title}
              <Edit3 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
            </h1>
          )}
          <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5">{plan.createdAt}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 mb-4">
        <nav className="flex gap-4">
          {(["view", "settings", "mandalart"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {tab === "view" ? "뷰" : tab === "mandalart" ? "만다라트" : "설정"}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: 뷰 — 플랜 흐름 + 만다라트 split */}
      {activeTab === "view" && (
        <div className="flex flex-col gap-4">

          {/* Row 1: Mandart + Plan flow */}
          <div className="flex gap-4 min-h-[400px] items-start">
            {/* Left: Mandart preview */}
            <div className="w-[380px] flex-shrink-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">만다라트</span>
                {plan.mandalart.center && (
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate flex-1">{plan.mandalart.center}</span>
                )}
                <button
                  onClick={() => downloadAsPng(mandartRef, `${plan.title}-만다라트.png`)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 transition-colors"
                  title="PNG로 다운로드"
                >
                  <Download className="w-3 h-3" />
                </button>
              </div>
              {plan.mandalart.center || plan.mandalart.themes.some((t) => t) ? (
                <div ref={mandartRef} className="overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex justify-center p-2">
                  <MandalartBuilder data={plan.mandalart} compact />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center gap-2">
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">만다라트 탭에서 목표와 실행 계획을 입력하면 여기에 표시됩니다</p>
                </div>
              )}
            </div>

            {/* Right: Plan flow */}
            <div className="flex-1 min-w-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Map className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">플랜 흐름 다이어그램</span>
                </div>
                <div className="flex items-center gap-2">
                  {(plan.horizon || plan.horizonPeriod) && (
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-full font-medium">
                      {plan.horizon === "long" ? "장기" : plan.horizon === "short" ? "단기" : ""}{plan.horizonPeriod ? ` · ${HORIZON_PERIOD_LABELS[plan.horizonPeriod] ?? plan.horizonPeriod}` : ""}
                    </span>
                  )}
                  {plan.planNodes.length > 0 && (
                    <button
                      onClick={() => downloadAsPng(planViewRef, `${plan.title}-플랜다이어그램.png`)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400 transition-colors"
                      title="PNG로 다운로드"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {plan.planNodes.length > 0 ? (
                <div ref={planViewRef}>
                  <PlanBuilder nodes={plan.planNodes} edges={plan.planEdges} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {STAGES.map((s, i) => (
                      <React.Fragment key={s.key}>
                        <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all ${
                          plan.stage === s.key
                            ? "border-indigo-400 " + s.bg + " shadow-sm"
                            : "border-dashed border-neutral-200 dark:border-neutral-700 opacity-50"
                        }`}>
                          <span className={`text-xs font-semibold ${plan.stage === s.key ? s.text : "text-neutral-400"}`}>{s.label}</span>
                          {plan.stage === s.key && plan.progress > 0 && (
                            <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${plan.progress}%` }} />
                            </div>
                          )}
                        </div>
                        {i < STAGES.length - 1 && (
                          <svg className="w-5 h-5 text-neutral-300 dark:text-neutral-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mt-2 leading-relaxed line-clamp-3">{plan.description}</p>
                  )}
                  {(plan.startDate || plan.targetEndDate) && (
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-400">
                      {plan.startDate && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">{plan.startDate}</span>}
                      <div className="w-16 h-0.5 bg-neutral-200 dark:bg-neutral-700 rounded" />
                      {plan.targetEndDate && <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-2 py-0.5 rounded">{plan.targetEndDate}</span>}
                    </div>
                  )}
                  <p className="text-[10px] text-neutral-300 dark:text-neutral-700 mt-4">설정 탭에서 계획빌딩으로 흐름을 만들어보세요</p>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Plan summary + Related items */}
          <div className="flex gap-4">

            {/* Plan summary */}
            <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">계획 정보</h3>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${stage.badge}`}>{stage.label}</span>
                {plan.planType && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {PLAN_TYPE_LABELS[plan.planType] ?? plan.planType}
                  </span>
                )}
                {(plan.horizon || plan.horizonPeriod) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                    {plan.horizon === "long" ? "장기" : plan.horizon === "short" ? "단기" : ""}
                    {plan.horizonPeriod ? ` · ${HORIZON_PERIOD_LABELS[plan.horizonPeriod] ?? plan.horizonPeriod}` : ""}
                  </span>
                )}
                {plan.severity && SEVERITY_CONFIG[plan.severity] && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${SEVERITY_CONFIG[plan.severity].cls}`}>
                    <AlertTriangle className="w-3 h-3" />{SEVERITY_CONFIG[plan.severity].label}
                  </span>
                )}
                {plan.urgency && URGENCY_CONFIG[plan.urgency] && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${URGENCY_CONFIG[plan.urgency].cls}`}>
                    <Clock className="w-3 h-3" />{URGENCY_CONFIG[plan.urgency].label}
                  </span>
                )}
              </div>

              {/* Importance */}
              {plan.importance && (
                <div className="flex items-center gap-1 mb-4">
                  <StarRating value={parseInt(plan.importance)} size="md" />
                  <span className="text-[11px] text-neutral-400 ml-1">중요도</span>
                </div>
              )}

              {/* Description */}
              {plan.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mb-4 whitespace-pre-line line-clamp-5">{plan.description}</p>
              )}

              {/* Timeline */}
              {(plan.startDate || plan.targetEndDate || plan.actualEndDate) && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] mb-4">
                  {plan.startDate && (
                    <span className="text-neutral-500">시작 <span className="font-medium text-neutral-700 dark:text-neutral-200">{plan.startDate}</span></span>
                  )}
                  {plan.targetEndDate && (
                    <><span className="text-neutral-300 dark:text-neutral-600">→</span><span className="font-medium text-indigo-500">목표 {plan.targetEndDate}</span></>
                  )}
                  {plan.actualEndDate && (
                    <><span className="text-neutral-300 dark:text-neutral-600">→</span><span className="font-medium text-emerald-500">완료 {plan.actualEndDate}</span></>
                  )}
                </div>
              )}

              {/* Progress */}
              {plan.progress > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-neutral-500">진행률</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{plan.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${plan.progress}%` }} />
                  </div>
                </div>
              )}

              {!plan.importance && !plan.description && !plan.startDate && !plan.targetEndDate && plan.progress === 0 && (
                <p className="text-xs text-neutral-400">설정 탭에서 계획 정보를 입력하세요.</p>
              )}
            </div>

            {/* Related items */}
            <div className="flex-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">연관 항목</h3>
              {(() => {
                const groups = [
                  { key: "proj",     label: "프로젝트", Icon: FolderKanban, ids: plan.relatedProjects, route: "/dashboard/projects" },
                  { key: "people",   label: "인물",     Icon: Users,        ids: plan.relatedPeople,   route: "/dashboard/people" },
                  { key: "todos",    label: "할일",     Icon: CheckSquare,  ids: plan.relatedTodos,    route: "/dashboard/todos" },
                  { key: "notes",    label: "노트",     Icon: StickyNote,   ids: plan.relatedNotes,    route: "/dashboard/notes" },
                  { key: "learning", label: "학습",     Icon: BookOpen,     ids: plan.relatedLearning, route: "/dashboard/learning" },
                  { key: "issues",   label: "이슈",     Icon: AlertCircle,  ids: plan.relatedIssues,   route: "/dashboard/issues" },
                  { key: "schedule", label: "스케줄",   Icon: CalendarRange,ids: plan.relatedSchedule, route: "/dashboard/schedule" },
                ].filter((g) => g.ids.length > 0);
                if (groups.length === 0) return (
                  <p className="text-xs text-neutral-400">연관된 항목이 없습니다. 설정 탭에서 추가하세요.</p>
                );
                return (
                  <div className="flex flex-col gap-4">
                    {groups.map(({ key, label, Icon, ids, route }) => (
                      <div key={key}>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-1.5">
                          <Icon className="w-3 h-3" />{label}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ids.map((id) => {
                            const displayLabel = relatedLabels[id] ?? id.split("/").pop() ?? id;
                            const href = key === "people"
                              ? `${route}?highlight=${encodeURIComponent(id)}`
                              : route!;
                            return route ? (
                              <button
                                key={id}
                                onClick={() => router.push(href)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium"
                              >
                                {displayLabel}
                                <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                              </button>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Tab: 만다라트 빌더 */}
      {activeTab === "mandalart" && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">만다라트 빌더</h3>
            <button
              onClick={() => onChange({ ...plan, mandalart: createEmptyMandalart() })}
              className="text-[11px] text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              초기화
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-5">
            중앙 셀에 핵심 목표를, 주변 8칸에 세부 테마를, 각 테마 블록에 실행 항목을 입력하세요. 셀 클릭 후 입력 → Enter 저장.
          </p>
          <div className="overflow-auto">
            <MandalartBuilder
              data={plan.mandalart}
              onChange={(m) => {
                // Sync title when mandart center changes (if title matched old center or center was empty)
                const shouldSyncTitle = !plan.title || plan.title === "새 계획" || plan.title === plan.mandalart.center;
                onChange({
                  ...plan,
                  mandalart: m,
                  title: (shouldSyncTitle && m.center) ? m.center : plan.title,
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Tab: 설정 */}
      {activeTab === "settings" && (
        <div className="space-y-4">

          {/* ─ Card 1: Plan Information ─────────────────────────────── */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Plan Information</h3>
            <div className="flex flex-col gap-5">
              {/* Stage */}
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">단계</label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onChange({ ...plan, stage: s.key })}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        plan.stage === s.key ? s.badge + " ring-2 ring-offset-1 ring-indigo-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Hash className="w-3.5 h-3.5" />Type
                </label>
                <select
                  value={plan.planType}
                  onChange={(e) => onChange({ ...plan, planType: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Not set</option>
                  <option value="research">Research</option>
                  <option value="development">Development</option>
                  <option value="writing">Writing</option>
                  <option value="review">Review</option>
                  <option value="planning">Planning</option>
                  <option value="learning">Learning</option>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                </select>
              </div>

              {/* Horizon */}
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">계획 기간</label>
                <div className="flex gap-2 mb-2">
                  {(["long", "short"] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => onChange({ ...plan, horizon: plan.horizon === h ? "" : h, horizonPeriod: "" })}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        plan.horizon === h
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-2 ring-offset-1 ring-indigo-400"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {h === "long" ? "장기" : "단기"}
                    </button>
                  ))}
                </div>
                {plan.horizon && (
                  <div className="flex flex-wrap gap-1.5">
                    {HORIZON_OPTIONS[plan.horizon as keyof typeof HORIZON_OPTIONS].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          const newPeriod = plan.horizonPeriod === p ? "" : p;
                          const targetEndDate = newPeriod
                            ? calcTargetDate(plan.createdAtISO, newPeriod)
                            : "";
                          onChange({ ...plan, horizonPeriod: newPeriod, targetEndDate });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          plan.horizonPeriod === p
                            ? "bg-indigo-500 text-white"
                            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        }`}
                      >
                        {HORIZON_PERIOD_LABELS[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">계획 상세</label>
                <textarea
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={() => { if (descDraft !== plan.description) onChange({ ...plan, description: descDraft }); }}
                  placeholder="계획에 대한 상세 설명을 입력하세요..."
                  rows={6}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              {/* Created */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">생성일</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-300">{plan.createdAt}</span>
              </div>
            </div>
          </div>

          {/* ─ 계획빌딩 ──────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">계획빌딩</h3>
            <PlanBuilder
              nodes={plan.planNodes}
              edges={plan.planEdges}
              onChange={(n, e) => onChange({ ...plan, planNodes: n, planEdges: e })}
            />
          </div>

          {/* ─ Card 2: Tags & Priority ───────────────────────────────── */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Tags & Priority</h3>
            <div className="grid grid-cols-2 gap-5">
              {/* Importance */}
              <div className="col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400" />Importance
                </label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      onClick={() => onChange({ ...plan, importance: plan.importance === String(n) ? "" : String(n) })}
                      className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <Star className={`w-5 h-5 ${parseInt(plan.importance || "0") >= n ? "text-amber-400 fill-amber-400" : "text-neutral-300 dark:text-neutral-600"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />Severity
                </label>
                <select
                  value={plan.severity}
                  onChange={(e) => onChange({ ...plan, severity: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />Urgency
                </label>
                <select
                  value={plan.urgency}
                  onChange={(e) => onChange({ ...plan, urgency: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─ Card 3: 연관 항목 ─────────────────────────────────────── */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">연관 항목</h3>
            <div className="grid grid-cols-3 gap-5">
              <RelatedProjectsInput
                value={plan.relatedProjects}
                onChange={(v) => onChange({ ...plan, relatedProjects: v })}
                label="연관 프로젝트"
              />
              <PeopleTagInput
                value={plan.relatedPeople}
                onChange={(v) => onChange({ ...plan, relatedPeople: v })}
                label="연관 인물"
              />
              <RelatedItemInput label="연관 할일" icon={CheckSquare} type="todos" value={plan.relatedTodos} onChange={(v) => onChange({ ...plan, relatedTodos: v })} />
              <RelatedItemInput label="연관 노트" icon={StickyNote} type="notes" value={plan.relatedNotes} onChange={(v) => onChange({ ...plan, relatedNotes: v })} />
              <RelatedItemInput label="연관 학습" icon={BookOpen} type="learning" value={plan.relatedLearning} onChange={(v) => onChange({ ...plan, relatedLearning: v })} />
              <RelatedItemInput label="연관 이슈" icon={AlertCircle} type="issues" value={plan.relatedIssues} onChange={(v) => onChange({ ...plan, relatedIssues: v })} />
              <RelatedItemInput label="연관 스케줄" icon={CalendarRange} type="schedule" value={plan.relatedSchedule} onChange={(v) => onChange({ ...plan, relatedSchedule: v })} />
            </div>
          </div>

          {/* ─ Card 4: Timeline & Progress ───────────────────────────── */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-4">Timeline & Progress</h3>

            {/* Date grid */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">시작일</label>
                <input
                  type="date"
                  value={plan.startDate}
                  onChange={(e) => onChange({ ...plan, startDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">목표 종료일</label>
                <input
                  type="date"
                  value={plan.targetEndDate}
                  onChange={(e) => onChange({ ...plan, targetEndDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5 block">실제 종료일</label>
                <input
                  type="date"
                  value={plan.actualEndDate}
                  onChange={(e) => onChange({ ...plan, actualEndDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Today */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs text-neutral-400">오늘</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-300">{new Date().toISOString().split("T")[0]}</span>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">진행률</label>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{plan.progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${plan.progress}%` }} />
              </div>
              <div className="flex gap-1">
                {[0, 25, 50, 75, 100].map((step) => (
                  <button
                    key={step}
                    onClick={() => onChange({ ...plan, progress: step })}
                    className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                      plan.progress === step
                        ? "bg-indigo-600 text-white"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {step}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-4">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                저장 완료
              </span>
            )}
            <button
              onClick={() => {
                onChange({ ...plan, description: descDraft });
                setSaved(true);
                setTimeout(() => { setSaved(false); setActiveTab("view"); }, 2500);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [activeTab, setActiveTab] = useState<"view" | "mandalart" | "settings">("view");
  const [showRail, setShowRail] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Load plans from backend on mount
  useEffect(() => {
    apiFetch<{ plans: Plan[] }>("/api/plans")
      .then((res) => setPlans(res.plans ?? []))
      .catch(() => {});
  }, []);

  async function createNewPlan() {
    const plan: Plan = {
      id: crypto.randomUUID(),
      title: "새 계획",
      stage: "idea",
      description: "",
      relatedProjects: [],
      relatedPeople: [],
      relatedTodos: [],
      relatedNotes: [],
      relatedLearning: [],
      relatedIssues: [],
      relatedSchedule: [],
      createdAt: new Date().toLocaleDateString("ko-KR"),
      createdAtISO: new Date().toISOString().split("T")[0],
      planNodes: [],
      planEdges: [],
      mandalart: createEmptyMandalart(),
      horizon: "",
      horizonPeriod: "",
      importance: "",
      severity: "",
      urgency: "",
      planType: "",
      startDate: "",
      targetEndDate: "",
      actualEndDate: "",
      progress: 0,
    };
    await apiFetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) }).catch(() => {});
    setPlans((prev) => [plan, ...prev]);
    setActivePlan(plan);
  }

  async function updatePlan(updated: Plan) {
    await apiFetch(`/api/plans/${updated.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActivePlan(updated);
  }

  async function deletePlan(planId: string) {
    await apiFetch(`/api/plans/${planId}`, { method: "DELETE" }).catch(() => {});
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }

  async function moveToStage(planId: string, newStage: string) {
    const p = plans.find((x) => x.id === planId);
    if (!p || p.stage === newStage) return;
    const updated = { ...p, stage: newStage };
    await apiFetch(`/api/plans/${planId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => {});
    setPlans((prev) => prev.map((x) => x.id === planId ? updated : x));
  }

  function exportPlan(plan: Plan) {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPlan(plan: Plan, tab: "view" | "mandalart" | "settings" = "view") {
    setActiveTab(tab);
    setActivePlan(plan);
  }

  const total  = plans.length;
  const active = plans.filter((p) => p.stage === "active").length;
  const undone = plans.filter((p) => p.stage !== "done").length;
  const done   = plans.filter((p) => p.stage === "done").length;

  // ── Detail View ──
  if (activePlan) {
    return (
      <div className="flex flex-col gap-0 p-6">
        <PlanDetail
          plan={activePlan}
          onBack={() => setActivePlan(null)}
          onChange={updatePlan}
          initialTab={activeTab}
        />
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
        <StatCard icon={Map}          iconBg="bg-blue-50 dark:bg-blue-950"        iconColor="text-blue-600 dark:text-blue-400"     value={total || "–"}  label="총 계획" />
        <StatCard icon={CircleDot}    iconBg="bg-indigo-50 dark:bg-indigo-950"    iconColor="text-indigo-600 dark:text-indigo-400" value={active || "–"} label="진행 중"
          sub={<>
            <Badge label={`계획중 ${plans.filter(p=>p.stage==="planning").length}`} color="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" />
            <Badge label={`진행중 ${active}`} color="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" />
          </>}
        />
        <StatCard icon={CalendarDays} iconBg="bg-emerald-50 dark:bg-emerald-950"  iconColor="text-emerald-600 dark:text-emerald-400" value={undone || "–"} label="미완료"
          sub={<Badge label={`아이디어 ${plans.filter(p=>p.stage==="idea").length}`} color="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" />}
        />
        <StatCard icon={AlarmClock}   iconBg="bg-rose-50 dark:bg-rose-950"        iconColor="text-rose-600 dark:text-rose-400"     value="–" label="마감 임박"
          sub={<><Badge label="3일 –" color="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" /><Badge label="7일 –" color="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" /></>}
        />
        <StatCard icon={CheckCircle2} iconBg="bg-neutral-100 dark:bg-neutral-800" iconColor="text-neutral-500 dark:text-neutral-400" value={done || "–"} label="완료"
          sub={<Badge label={`전체 ${done}`} color="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" />}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={createNewPlan}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 계획 추가
        </button>

        <div className="flex-1" />

        {/* Rail toggle */}
        <button
          onClick={() => setShowRail((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
            showRail
              ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300"
              : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          }`}
        >
          <Columns2 className="w-4 h-4" />
          {showRail ? "레일 있게" : "레일 없이"}
        </button>

        {/* View mode */}
        <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <button
            onClick={() => setViewMode("card")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === "card"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                : "bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            카드
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-l border-neutral-200 dark:border-neutral-700 transition-colors ${
              viewMode === "list"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                : "bg-white dark:bg-neutral-900 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            }`}
          >
            <List className="w-4 h-4" />
            리스트
          </button>
        </div>
      </div>

      {/* Content */}
      {plans.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-10 flex flex-col items-center justify-center gap-3 min-h-[400px]">
          <CalendarClock className="w-12 h-12 text-neutral-300 dark:text-neutral-700" />
          <p className="text-neutral-400 dark:text-neutral-500 font-medium">계획이 없습니다</p>
          <button onClick={createNewPlan} className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            <Plus className="w-4 h-4" />첫 계획을 추가하세요
          </button>
        </div>
      ) : showRail ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          {STAGES.map((stage) => {
            const sp = plans.filter((p) => p.stage === stage.key);
            const isDragTarget = dragOverStage === stage.key;
            return (
              <div
                key={stage.key}
                className="flex flex-col gap-2"
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) moveToStage(draggingId, stage.key);
                  setDraggingId(null);
                  setDragOverStage(null);
                }}
              >
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${isDragTarget ? "ring-2 ring-indigo-400 " : ""}${stage.bg}`}>
                  <span className={`text-xs font-semibold ${stage.text}`}>{stage.label}</span>
                  <span className={`text-xs font-bold ${stage.text}`}>{sp.length}</span>
                </div>
                {viewMode === "card" ? (
                  <div className={`flex flex-col gap-2 min-h-[60px] rounded-xl transition-colors ${isDragTarget ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""}`}>
                    {sp.map((p) => (
                      <PlanCard
                        key={p.id}
                        plan={p}
                        onClick={() => openPlan(p, "view")}
                        onEdit={() => openPlan(p, "settings")}
                        onDelete={() => deletePlan(p.id)}
                        onExport={() => exportPlan(p)}
                        isDraggable
                        onDragStart={(e) => { setDraggingId(p.id); e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                      />
                    ))}
                    {sp.length === 0 && <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 text-center text-xs text-neutral-400">비어 있음</div>}
                  </div>
                ) : (
                  <div className={`rounded-xl border overflow-hidden transition-colors ${isDragTarget ? "border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20" : "border-neutral-200 dark:border-neutral-800"}`}>
                    {sp.length === 0
                      ? <div className="p-4 text-center text-xs text-neutral-400">비어 있음</div>
                      : sp.map((p) => (
                          <PlanRow
                            key={p.id}
                            plan={p}
                            onClick={() => openPlan(p, "view")}
                            onEdit={() => openPlan(p, "settings")}
                            onDelete={() => deletePlan(p.id)}
                            onExport={() => exportPlan(p)}
                          />
                        ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onClick={() => openPlan(p, "view")}
              onEdit={() => openPlan(p, "settings")}
              onDelete={() => deletePlan(p.id)}
              onExport={() => exportPlan(p)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {plans.map((p) => (
            <PlanRow
              key={p.id}
              plan={p}
              onClick={() => openPlan(p, "view")}
              onEdit={() => openPlan(p, "settings")}
              onDelete={() => deletePlan(p.id)}
              onExport={() => exportPlan(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
