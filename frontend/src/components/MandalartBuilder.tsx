"use client";

import { useState, useRef } from "react";

// ── Data ────────────────────────────────────────────────────────────────────
export interface MandalartData {
  center: string;
  themes: string[];    // length 8
  actions: string[][]; // length 8, each length 8
}

export function createEmptyMandalart(): MandalartData {
  return {
    center: "",
    themes: Array(8).fill("") as string[],
    actions: Array.from({ length: 8 }, () => Array(8).fill("") as string[]),
  };
}

// ── Theme colors ─────────────────────────────────────────────────────────────
const THEME_COLORS = [
  { bg: "bg-rose-50 dark:bg-rose-950/20",    cBg: "bg-rose-200 dark:bg-rose-800",    text: "text-rose-800 dark:text-rose-100",    border: "border-rose-200 dark:border-rose-700"    },
  { bg: "bg-orange-50 dark:bg-orange-950/20", cBg: "bg-orange-200 dark:bg-orange-800", text: "text-orange-800 dark:text-orange-100", border: "border-orange-200 dark:border-orange-700" },
  { bg: "bg-amber-50 dark:bg-amber-950/20",   cBg: "bg-amber-200 dark:bg-amber-800",   text: "text-amber-800 dark:text-amber-100",   border: "border-amber-200 dark:border-amber-700"   },
  { bg: "bg-emerald-50 dark:bg-emerald-950/20", cBg: "bg-emerald-200 dark:bg-emerald-800", text: "text-emerald-800 dark:text-emerald-100", border: "border-emerald-200 dark:border-emerald-700" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/20",    cBg: "bg-cyan-200 dark:bg-cyan-800",    text: "text-cyan-800 dark:text-cyan-100",    border: "border-cyan-200 dark:border-cyan-700"    },
  { bg: "bg-blue-50 dark:bg-blue-950/20",    cBg: "bg-blue-200 dark:bg-blue-800",    text: "text-blue-800 dark:text-blue-100",    border: "border-blue-200 dark:border-blue-700"    },
  { bg: "bg-violet-50 dark:bg-violet-950/20", cBg: "bg-violet-200 dark:bg-violet-800", text: "text-violet-800 dark:text-violet-100", border: "border-violet-200 dark:border-violet-700" },
  { bg: "bg-pink-50 dark:bg-pink-950/20",    cBg: "bg-pink-200 dark:bg-pink-800",    text: "text-pink-800 dark:text-pink-100",    border: "border-pink-200 dark:border-pink-700"    },
] as const;

// ── Arrow direction per theme index (0-7) ────────────────────────────────────
// Rotation degrees for a right-pointing (→) base arrow
const ARROW_DEG: Record<number, number> = {
  0: -135, // ↖
  1: -90,  // ↑
  2: -45,  // ↗
  3: 180,  // ←
  4: 0,    // →
  5: 135,  // ↙
  6: 90,   // ↓
  7: 45,   // ↘
};

// ── Helpers ──────────────────────────────────────────────────────────────────
/** (bRow, bCol) → themeIdx 0-7; center block (1,1) → -1 */
function blockTheme(bRow: number, bCol: number): number {
  const f = bRow * 3 + bCol;
  if (f === 4) return -1;
  return f < 4 ? f : f - 1;
}

/** Local (lRow, lCol) in 3×3 → 0-7; center (1,1) → -1 */
function localIdx(lRow: number, lCol: number): number {
  const f = lRow * 3 + lCol;
  if (f === 4) return -1;
  return f < 4 ? f : f - 1;
}

// ── Center-adjacent cell per action block ────────────────────────────────────
// For each action block (bRow, bCol), the local (lRow, lCol) that faces the center
// and the outward arrow direction (same as the corresponding theme cell arrow)
const CENTER_ADJ: Record<string, { lRow: number; lCol: number; deg: number }> = {
  "0,0": { lRow: 2, lCol: 2, deg: -135 }, // TL block → bottom-right cell → ↖ outward
  "0,1": { lRow: 2, lCol: 1, deg: -90  }, // TC block → bottom-center cell → ↑ outward
  "0,2": { lRow: 2, lCol: 0, deg: -45  }, // TR block → bottom-left  cell → ↗ outward
  "1,0": { lRow: 1, lCol: 2, deg: 180  }, // ML block → middle-right cell → ← outward
  "1,2": { lRow: 1, lCol: 0, deg: 0    }, // MR block → middle-left  cell → → outward
  "2,0": { lRow: 0, lCol: 2, deg: 135  }, // BL block → top-right    cell → ↙ outward
  "2,1": { lRow: 0, lCol: 1, deg: 90   }, // BC block → top-center   cell → ↓ outward
  "2,2": { lRow: 0, lCol: 0, deg: 45   }, // BR block → top-left     cell → ↘ outward
};

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  data: MandalartData;
  onChange?: (data: MandalartData) => void;
  /** Compact read-only preview mode */
  compact?: boolean;
}

export function MandalartBuilder({ data, onChange, compact = false }: Props) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const readOnly = !onChange;

  // Sizing
  const cw = compact ? 32 : 64;
  const ch = compact ? 32 : 64;
  const cfs = compact ? 7 : 10;
  const bpad = compact ? 2 : 4;
  const bgap = compact ? 1 : 3;
  const cgap = compact ? 1 : 2;

  function startEdit(key: string, value: string) {
    if (readOnly) return;
    setEditKey(key);
    setDraft(value);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    if (!editKey || !onChange) return;
    const next: MandalartData = {
      center: data.center,
      themes: [...data.themes],
      actions: data.actions.map((a) => [...a]),
    };
    if (editKey === "center") {
      next.center = draft;
    } else if (editKey.startsWith("t-")) {
      next.themes[parseInt(editKey.slice(2))] = draft;
    } else if (editKey.startsWith("a-")) {
      const [, ts, as_] = editKey.split("-");
      next.actions[parseInt(ts)][parseInt(as_)] = draft;
    }
    onChange(next);
    setEditKey(null);
  }

  function renderCell(
    key: string,
    text: string,
    bgCls: string,
    textCls: string,
    bold: boolean,
    interactive: boolean,
    dimmed = false,
    arrowDeg?: number,
    arrowOpacity?: number,
    fontSizeOverride?: number,
  ) {
    const fs = fontSizeOverride ?? cfs;
    const baseStyle: React.CSSProperties = {
      width: cw, height: ch,
      fontSize: fs,
      flexShrink: 0,
    };

    if (editKey === key) {
      return (
        <textarea
          key={key}
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); commit(); }
            if (e.key === "Escape") setEditKey(null);
          }}
          style={{ ...baseStyle, resize: "none", padding: 2 }}
          className="rounded border-2 border-indigo-500 outline-none text-center text-neutral-900 dark:text-white bg-white dark:bg-neutral-900"
        />
      );
    }

    const arrowSize = compact ? 26 : 52;

    return (
      <div
        key={key}
        onClick={() => { if (interactive && !dimmed) startEdit(key, text); }}
        style={baseStyle}
        className={`relative flex items-center justify-center rounded border overflow-hidden text-center leading-tight p-0.5 transition-opacity duration-300
          ${bgCls} ${textCls} ${bold ? "font-semibold" : ""}
          ${dimmed ? "opacity-20 pointer-events-none" : ""}
          ${interactive && !readOnly && !dimmed ? "cursor-text hover:opacity-75" : ""}`}
      >
        {/* Directional arrow — only visible when theme is filled (sub-mandart activated) */}
        {arrowDeg !== undefined && (arrowOpacity ?? 0) > 0 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: arrowOpacity, transition: "opacity 0.3s" }}
          >
            <svg
              width={arrowSize} height={arrowSize}
              viewBox="0 0 18 18"
              fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: `rotate(${arrowDeg}deg)` }}
            >
              <path d="M2 9 L14 9 M10 5 L14 9 L10 13" />
            </svg>
          </div>
        )}
        {text ? (
          <span
            className="dark:[text-shadow:0_0_3px_#000,0_0_3px_#000,0_0_4px_rgba(0,0,0,0.8)]"
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: fs,
              lineHeight: 1.2,
              wordBreak: "break-all",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {text}
          </span>
        ) : (!readOnly && interactive ? (
          <span style={{ position: "relative", zIndex: 1, fontSize: cfs, opacity: 0.25 }}>···</span>
        ) : null)}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateColumns: "repeat(3, auto)",
        gap: bgap,
      }}
    >
      {[0, 1, 2].flatMap((bRow) =>
        [0, 1, 2].map((bCol) => {
          const ti = blockTheme(bRow, bCol);
          const isCenter = ti === -1;
          const clr = isCenter ? null : THEME_COLORS[ti];

          const blockBg = isCenter
            ? "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
            : `${clr!.bg} border ${clr!.border}`;

          // Action blocks are dimmed until the corresponding theme is filled
          const themefilled = isCenter || !!(data.themes[ti] ?? "");

          return (
            <div
              key={`b${bRow}${bCol}`}
              className={`rounded-lg transition-opacity duration-300 ${blockBg} ${!themefilled ? "opacity-40 pointer-events-none" : ""}`}
              style={{
                display: "inline-grid",
                gridTemplateColumns: "repeat(3, auto)",
                gap: cgap,
                padding: bpad,
              }}
            >
              {[0, 1, 2].flatMap((lRow) =>
                [0, 1, 2].map((lCol) => {
                  const li = localIdx(lRow, lCol);
                  const isLC = li === -1;

                  if (isCenter) {
                    if (isLC) {
                      return renderCell(
                        "center", data.center,
                        "bg-indigo-600 dark:bg-indigo-700 border-indigo-700 dark:border-indigo-600",
                        "text-white", true, true,
                        false, undefined, undefined,
                        compact ? 10 : 15, // larger center text
                      );
                    }
                    const tc = THEME_COLORS[li];
                    return renderCell(
                      `t-${li}`, data.themes[li] ?? "",
                      `${tc.cBg} ${tc.border}`,
                      tc.text, true, true,
                      !data.center,
                    );
                  }

                  // Action block
                  if (isLC) {
                    // Theme label at block center — larger & bold
                    return renderCell(
                      `_th-${ti}-${lRow}-${lCol}`,
                      data.themes[ti] ?? "",
                      `${clr!.cBg} ${clr!.border}`,
                      clr!.text, true, false,
                      false, undefined, undefined,
                      compact ? 9 : 13, // larger sub-center text
                    );
                  }

                  // Check if this cell is center-adjacent for its block
                  const adjInfo = CENTER_ADJ[`${bRow},${bCol}`];
                  const isAdj = adjInfo && lRow === adjInfo.lRow && lCol === adjInfo.lCol;
                  const themeFilled = !!(data.themes[ti]);

                  return renderCell(
                    `a-${ti}-${li}`,
                    data.actions[ti]?.[li] ?? "",
                    "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700",
                    "text-neutral-700 dark:text-neutral-300",
                    false, true,
                    false,                              // not dimmed
                    isAdj ? adjInfo.deg : undefined,    // arrow only on adjacent cell
                    (isAdj && themeFilled) ? 0.2 : 0,
                  );
                })
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
