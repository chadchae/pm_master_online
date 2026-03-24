"use client";

import { useState, useRef } from "react";
import { Plus, X, Check, Link2, Trash2, StickyNote } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
export type PlanNodeType = "start" | "task" | "decision" | "end" | "note" | "input" | "output";
export type PortSide = "right" | "left" | "top" | "bottom";

export interface PlanNode {
  id: string;
  type: PlanNodeType;
  title: string;
  x: number;
  y: number;
  done?: boolean;
}

export interface PlanEdge {
  id: string;
  fromId: string;
  fromPort: PortSide;
  toId: string;
  toPort: PortSide;
  label?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const NODE_W = 140;
const NODE_H = 60;
const PORT_R = 5; // port dot radius (half of w-2.5 = 10px)

const TYPE_SIZE: Record<PlanNodeType, { w: number; h: number }> = {
  start:    { w: 80,     h: 80     },
  end:      { w: 80,     h: 80     },
  decision: { w: 140,    h: 80     },
  task:     { w: NODE_W, h: NODE_H },
  note:     { w: NODE_W, h: NODE_H },
  input:    { w: NODE_W, h: NODE_H },
  output:   { w: NODE_W, h: NODE_H },
};

const CONFIGS: Record<PlanNodeType, {
  label: string;
  bg: string;
  border: string;
  text: string;
  pill: boolean;
  dot: string;
  badgeBg: string;
  portColor: string;
}> = {
  start:    { label: "시작",   bg: "bg-emerald-50 dark:bg-emerald-950/50",  border: "border-2 border-emerald-400 dark:border-emerald-500",           text: "text-emerald-700 dark:text-emerald-300", pill: true,  dot: "bg-emerald-400", badgeBg: "bg-emerald-500", portColor: "#10b981" },
  task:     { label: "작업",   bg: "bg-blue-50 dark:bg-blue-950/50",         border: "border-2 border-blue-400 dark:border-blue-500",                 text: "text-blue-700 dark:text-blue-300",       pill: false, dot: "bg-blue-400",    badgeBg: "bg-blue-500",    portColor: "#3b82f6" },
  decision: { label: "판단",   bg: "bg-amber-50 dark:bg-amber-950/50",       border: "",                                                              text: "text-amber-900 dark:text-amber-200",     pill: false, dot: "bg-amber-400",   badgeBg: "bg-amber-500",   portColor: "#f59e0b" },
  end:      { label: "종료",   bg: "bg-rose-50 dark:bg-rose-950/50",         border: "border-2 border-rose-400 dark:border-rose-500",                 text: "text-rose-700 dark:text-rose-300",       pill: true,  dot: "bg-rose-400",    badgeBg: "bg-rose-500",    portColor: "#f43f5e" },
  note:     { label: "메모",   bg: "bg-yellow-50 dark:bg-yellow-950/30",     border: "border border-yellow-300 dark:border-yellow-600",               text: "text-yellow-800 dark:text-yellow-200",  pill: false, dot: "bg-yellow-300",  badgeBg: "bg-yellow-500",  portColor: "#eab308" },
  input:    { label: "인풋",   bg: "",                                        border: "",                                                              text: "text-violet-900 dark:text-violet-200",   pill: false, dot: "bg-violet-400",  badgeBg: "bg-violet-500",  portColor: "#8b5cf6" },
  output:   { label: "아웃풋", bg: "",                                        border: "",                                                              text: "text-cyan-900 dark:text-cyan-200",       pill: false, dot: "bg-cyan-400",    badgeBg: "bg-cyan-500",    portColor: "#06b6d4" },
};

// Port CSS position (centers a 10px dot on the node edge)
const PORT_POS: Record<PortSide, React.CSSProperties> = {
  right:  { right:  -PORT_R, top:    `calc(50% - ${PORT_R}px)` },
  left:   { left:   -PORT_R, top:    `calc(50% - ${PORT_R}px)` },
  top:    { top:    -PORT_R, left:   `calc(50% - ${PORT_R}px)` },
  bottom: { bottom: -PORT_R, left:   `calc(50% - ${PORT_R}px)` },
};

// ── Geometry helpers ───────────────────────────────────────────────────────
function portPos(node: PlanNode, side: PortSide) {
  const { w, h } = TYPE_SIZE[node.type];
  switch (side) {
    case "right":  return { x: node.x + w,     y: node.y + h / 2 };
    case "left":   return { x: node.x,          y: node.y + h / 2 };
    case "top":    return { x: node.x + w / 2,  y: node.y };
    case "bottom": return { x: node.x + w / 2,  y: node.y + h };
  }
}

// Pick the best target port based on relative position
function bestTargetPort(fromX: number, fromY: number, toNode: PlanNode): PortSide {
  const { w, h } = TYPE_SIZE[toNode.type];
  const cx = toNode.x + w / 2;
  const cy = toNode.y + h / 2;
  const dx = cx - fromX;
  const dy = cy - fromY;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "left" : "right";
  return dy >= 0 ? "top" : "bottom";
}

// Control point offset for bezier
function cp(x: number, y: number, side: PortSide, d: number) {
  switch (side) {
    case "right":  return { x: x + d, y };
    case "left":   return { x: x - d, y };
    case "bottom": return { x, y: y + d };
    case "top":    return { x, y: y - d };
  }
}

// Cubic bezier path between two ports
function makePath(
  fp: { x: number; y: number },
  fromPort: PortSide,
  tp: { x: number; y: number },
  toPort?: PortSide,
): string {
  const dist = Math.hypot(tp.x - fp.x, tp.y - fp.y);
  const off = Math.max(40, Math.min(dist * 0.45, 100));
  const c1 = cp(fp.x, fp.y, fromPort, off);
  const c2 = toPort ? cp(tp.x, tp.y, toPort, off) : { x: tp.x, y: tp.y };
  return `M ${fp.x} ${fp.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${tp.x} ${tp.y}`;
}

// ── Interfaces ─────────────────────────────────────────────────────────────
interface DragState {
  nodeId: string;
  startMX: number; startMY: number;
  origX: number;   origY: number;
  moved: boolean;
}

interface ConnectState {
  nodeId: string;
  port: PortSide;
}

interface Props {
  nodes: PlanNode[];
  edges: PlanEdge[];
  onChange?: (nodes: PlanNode[], edges: PlanEdge[]) => void;
}

// ── Component ──────────────────────────────────────────────────────────────
export function PlanBuilder({ nodes, edges, onChange }: Props) {
  const readOnly    = !onChange;
  const canvasRef   = useRef<HTMLDivElement>(null);
  const dragRef     = useRef<DragState | null>(null);
  const connectRef  = useRef<ConnectState | null>(null); // sync ref for mousemove

  const [localNodes, setLocalNodes] = useState<PlanNode[]>(nodes);
  const [localEdges, setLocalEdges] = useState<PlanEdge[]>(edges);

  // Sync when parent pushes changes
  const prevRef = useRef({ nodes, edges });
  if (prevRef.current.nodes !== nodes || prevRef.current.edges !== edges) {
    prevRef.current = { nodes, edges };
    setLocalNodes(nodes);
    setLocalEdges(edges);
  }

  const [editId,         setEditId]         = useState<string | null>(null);
  const [editTitle,      setEditTitle]      = useState("");
  const [connecting,     setConnecting]     = useState<ConnectState | null>(null); // for SVG render
  const [draftEnd,       setDraftEnd]       = useState<{ x: number; y: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId,  setHoveredNodeId]  = useState<string | null>(null);
  const [editEdgeLabelId,   setEditEdgeLabelId]   = useState<string | null>(null);
  const [editEdgeLabelDraft, setEditEdgeLabelDraft] = useState("");

  // ── Commit helpers ──
  const commitNodes = (n: PlanNode[]) => { setLocalNodes(n); onChange?.(n, localEdges); };
  const commitEdges = (e: PlanEdge[]) => { setLocalEdges(e); onChange?.(localNodes, e); };

  // ── Add node ──
  function addNode(type: PlanNodeType) {
    const i = localNodes.length;
    const { w, h } = TYPE_SIZE[type];
    const newNode: PlanNode = {
      id: crypto.randomUUID(), type,
      title: CONFIGS[type].label,
      x: 24 + (i % 4) * (w + 24),
      y: 24 + Math.floor(i / 4) * (h + 44),
    };
    commitNodes([...localNodes, newNode]);
  }

  // ── Delete node (also removes its edges) ──
  function deleteNode(id: string) {
    setLocalNodes((prev) => prev.filter((n) => n.id !== id));
    const nextEdges = localEdges.filter((e) => e.fromId !== id && e.toId !== id);
    setLocalEdges(nextEdges);
    onChange?.(localNodes.filter((n) => n.id !== id), nextEdges);
    if (editId === id) setEditId(null);
  }

  // ── Toggle done ──
  function toggleDone(id: string) {
    commitNodes(localNodes.map((n) => n.id === id ? { ...n, done: !n.done } : n));
  }

  // ── Delete edge ──
  function deleteEdge(id: string) {
    commitEdges(localEdges.filter((e) => e.id !== id));
    setSelectedEdgeId(null);
    if (editEdgeLabelId === id) setEditEdgeLabelId(null);
  }

  // ── Edge label ──
  function saveEdgeLabel() {
    if (!editEdgeLabelId) return;
    commitEdges(localEdges.map((e) =>
      e.id === editEdgeLabelId ? { ...e, label: editEdgeLabelDraft.trim() || undefined } : e
    ));
    setEditEdgeLabelId(null);
  }

  // ── Edit title ──
  function saveEdit() {
    if (!editId) return;
    commitNodes(localNodes.map((n) => n.id === editId ? { ...n, title: editTitle.trim() || n.title } : n));
    setEditId(null);
  }

  // ── Drag: node body mousedown ──
  function handleNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    if (connectRef.current || readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const node = localNodes.find((n) => n.id === nodeId)!;
    dragRef.current = { nodeId, startMX: e.clientX, startMY: e.clientY, origX: node.x, origY: node.y, moved: false };
  }

  // ── Connect: port mousedown ──
  function handlePortMouseDown(e: React.MouseEvent, nodeId: string, port: PortSide) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = null;
    const state: ConnectState = { nodeId, port };
    connectRef.current = state;
    setConnecting(state);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setDraftEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  // ── Drop on node: create edge ──
  function handleNodeMouseUp(e: React.MouseEvent, targetId: string) {
    const conn = connectRef.current;
    if (!conn) return;
    e.stopPropagation();

    if (conn.nodeId !== targetId) {
      const fromNode = localNodes.find((n) => n.id === conn.nodeId)!;
      const toNode   = localNodes.find((n) => n.id === targetId)!;
      const fp       = portPos(fromNode, conn.port);
      const toPort   = bestTargetPort(fp.x, fp.y, toNode);

      const duplicate = localEdges.some(
        (ed) => ed.fromId === conn.nodeId && ed.toId === targetId && ed.fromPort === conn.port
      );
      if (!duplicate) {
        const newEdge: PlanEdge = {
          id: crypto.randomUUID(),
          fromId: conn.nodeId, fromPort: conn.port,
          toId: targetId,      toPort,
        };
        commitEdges([...localEdges, newEdge]);
      }
    }

    connectRef.current = null;
    setConnecting(null);
    setDraftEnd(null);
  }

  // ── Canvas mouse events ──
  function canvasPos(e: React.MouseEvent) {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    // Update draft line
    if (connectRef.current) {
      setDraftEnd(canvasPos(e));
      return; // skip drag while connecting
    }

    // Drag node
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startMX;
    const dy = e.clientY - d.startMY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const nodeForDrag = localNodes.find((n) => n.id === d.nodeId);
    const { w: dw, h: dh } = TYPE_SIZE[nodeForDrag?.type ?? "task"];
    const maxX = canvas.offsetWidth  - dw;
    const maxY = canvas.offsetHeight - dh;
    setLocalNodes((prev) =>
      prev.map((n) =>
        n.id === d.nodeId
          ? { ...n, x: Math.max(0, Math.min(maxX, d.origX + dx)), y: Math.max(0, Math.min(maxY, d.origY + dy)) }
          : n
      )
    );
  }

  function handleCanvasMouseUp() {
    // Cancel connection if not dropped on a node
    if (connectRef.current) {
      connectRef.current = null;
      setConnecting(null);
      setDraftEnd(null);
      return;
    }

    // Finish drag
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;

    if (!d.moved) {
      if (!readOnly) {
        const node = localNodes.find((n) => n.id === d.nodeId);
        if (node) { setEditId(node.id); setEditTitle(node.title); }
      }
    } else {
      onChange?.(localNodes, localEdges);
    }
  }

  function handleCanvasLeave() {
    if (dragRef.current?.moved) onChange?.(localNodes, localEdges);
    dragRef.current = null;
    connectRef.current = null;
    setConnecting(null);
    setDraftEnd(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">

      {/* Toolbar */}
      {!readOnly && <div className="flex flex-wrap items-center gap-1.5">
        {(["start", "end", "task", "decision", "input", "output", "note"] as PlanNodeType[]).map((type) => { const cfg = CONFIGS[type]; return (
          <button
            key={type}
            onClick={() => addNode(type)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}<Plus className="w-3 h-3 opacity-50" />
          </button>
        ); })}

        {selectedEdgeId && (
          <button
            onClick={() => deleteEdge(selectedEdgeId)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors ml-1"
          >
            <Trash2 className="w-3 h-3" />연결 삭제
          </button>
        )}

        <div className="flex-1" />
        <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
          <Link2 className="w-3 h-3" />포트(●)에서 드래그 → 연결
        </span>
      </div>}

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasLeave}
        onClick={() => setSelectedEdgeId(null)}
        className="relative w-full rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden select-none"
        style={{
          height: 480,
          cursor: connecting ? "crosshair" : "default",
          ...(readOnly
            ? { backgroundColor: "transparent" }
            : {
                backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                backgroundColor: "rgba(250,250,250,0.4)",
              }),
        }}
      >
        {/* Empty state */}
        {localNodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
            <p className="text-sm text-neutral-400 dark:text-neutral-500">노드를 추가하여 계획 흐름을 만들어보세요</p>
            <p className="text-xs text-neutral-300 dark:text-neutral-600">드래그로 배치 · 클릭으로 편집 · 포트●에서 드래그하여 연결</p>
          </div>
        )}

        {/* ── SVG: edges + draft ── */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <defs>
            <marker id="pb-arrow"     markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#6366f1" /></marker>
            <marker id="pb-arrow-sel" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#ef4444" /></marker>
            <marker id="pb-arrow-dft" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8" /></marker>
          </defs>

          {/* Existing edges */}
          {localEdges.map((edge) => {
            const fn = localNodes.find((n) => n.id === edge.fromId);
            const tn = localNodes.find((n) => n.id === edge.toId);
            if (!fn || !tn) return null;
            const fp = portPos(fn, edge.fromPort);
            const tp = portPos(tn, edge.toPort);
            const d  = makePath(fp, edge.fromPort, tp, edge.toPort);
            const sel = selectedEdgeId === edge.id;
            return (
              <g key={edge.id} style={{ pointerEvents: "all" }}>
                {/* Hit area */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={14}
                  style={{ cursor: readOnly ? "default" : "pointer" }}
                  onClick={(e) => { if (readOnly) return; e.stopPropagation(); setSelectedEdgeId(sel ? null : edge.id); }}
                />
                {/* Visible line */}
                <path d={d} fill="none"
                  stroke={sel ? "#ef4444" : "#6366f1"}
                  strokeWidth={sel ? 2.5 : 1.5}
                  strokeDasharray={sel ? "5 3" : undefined}
                  markerEnd={sel ? "url(#pb-arrow-sel)" : "url(#pb-arrow)"}
                  style={{ pointerEvents: "none" }}
                />
              </g>
            );
          })}

          {/* Draft line */}
          {connecting && draftEnd && (() => {
            const fn = localNodes.find((n) => n.id === connecting.nodeId);
            if (!fn) return null;
            const fp = portPos(fn, connecting.port);
            return (
              <path
                d={makePath(fp, connecting.port, draftEnd)}
                fill="none" stroke="#94a3b8" strokeWidth={1.5}
                strokeDasharray="6 4" markerEnd="url(#pb-arrow-dft)"
              />
            );
          })()}
        </svg>

        {/* ── Edge labels + delete button ── */}
        {localEdges.map((edge) => {
          const fn = localNodes.find((n) => n.id === edge.fromId);
          const tn = localNodes.find((n) => n.id === edge.toId);
          if (!fn || !tn) return null;
          const fp = portPos(fn, edge.fromPort);
          const tp = portPos(tn, edge.toPort);
          const mx = (fp.x + tp.x) / 2;
          const my = (fp.y + tp.y) / 2;
          const isSel = selectedEdgeId === edge.id;
          const isEditingLabel = editEdgeLabelId === edge.id;

          return (
            <div key={`elo-${edge.id}`} style={{ position: "absolute", left: mx, top: my, transform: "translate(-50%, -50%)", zIndex: 35 }}>
              {isEditingLabel ? (
                <div
                  className="flex items-center gap-1"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    value={editEdgeLabelDraft}
                    onChange={(e) => setEditEdgeLabelDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) saveEdgeLabel(); if (e.key === "Escape") setEditEdgeLabelId(null); }}
                    onBlur={saveEdgeLabel}
                    placeholder="레이블..."
                    className="w-24 text-[10px] px-1.5 py-0.5 rounded border border-indigo-400 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none shadow-md"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {/* Label pill — click to edit */}
                  <span
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!readOnly) {
                        setSelectedEdgeId(edge.id);
                        setEditEdgeLabelId(edge.id);
                        setEditEdgeLabelDraft(edge.label ?? "");
                      }
                    }}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shadow-sm cursor-pointer select-none
                      ${edge.label
                        ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-200"
                        : isSel ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200" : "hidden"
                      }`}
                  >
                    {edge.label ?? "레이블 추가"}
                  </span>
                  {/* Delete button — only when selected */}
                  {isSel && !readOnly && (
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => deleteEdge(edge.id)}
                      className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition-colors"
                      title="연결 삭제"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Nodes ── */}
        {localNodes.map((node) => {
          const cfg       = CONFIGS[node.type];
          const isEdit    = editId === node.id;
          const isHover   = hoveredNodeId === node.id;
          const { w, h }       = TYPE_SIZE[node.type];
          const isDiamond      = node.type === "decision";
          const isNote         = node.type === "note";
          const isInput        = node.type === "input";
          const isOutput       = node.type === "output";
          const isSvgShape     = isDiamond || isInput || isOutput;
          // parallelogram skew offset (px)
          const SK = 18;

          // Shape layer opacity: only the background fades, not the text
          const shapeOpacity = node.done ? 1 : 0.58;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              className={`absolute group flex items-center justify-center
                ${connecting ? "cursor-cell" : readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
                ${cfg.pill ? "rounded-full" : "rounded-lg"}
                transition-shadow ${isHover ? "shadow-md" : ""}`}
              style={{ left: node.x, top: node.y, width: w, height: h, zIndex: isEdit ? 20 : 10, ...(readOnly ? { opacity: shapeOpacity, transition: "opacity 0.3s" } : {}) }}
            >
              {/* Shape background layer (fades when not done) — non-SVG nodes */}
              {!isSvgShape && (
                <div
                  className={`absolute inset-0 ${cfg.bg} ${cfg.border} ${cfg.pill ? "rounded-full" : "rounded-lg"} transition-opacity duration-300`}
                  style={{ opacity: shapeOpacity, boxShadow: node.done ? `0 0 0 2px ${cfg.portColor}, 0 0 0 3.5px rgba(0,0,0,0.12), 0 2px 10px ${cfg.portColor}50` : "0 0 0 1.5px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.1)" }}
                />
              )}

              {/* Diamond SVG shape */}
              {isDiamond && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${w} ${h}`} style={{ opacity: shapeOpacity, transition: "opacity 0.3s" }}>
                  <polygon
                    fill="#fef3c7"
                    points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                  />
                  <polygon fill="none" points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} stroke="rgba(0,0,0,0.45)" strokeWidth="1" strokeDasharray="6 3" />
                  {node.done && <polygon fill="none" points={`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} stroke="#f59e0b" strokeWidth="3" />}
                </svg>
              )}

              {/* Input parallelogram: /  / (leans right) */}
              {isInput && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${w} ${h}`} style={{ opacity: shapeOpacity, transition: "opacity 0.3s" }}>
                  <polygon
                    fill="#ede9fe"
                    points={`${SK},1 ${w-1},1 ${w-SK},${h-1} 1,${h-1}`}
                    stroke="#8b5cf6"
                    strokeWidth="2"
                  />
                  <polygon fill="none" points={`${SK},1 ${w-1},1 ${w-SK},${h-1} 1,${h-1}`} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
                  {node.done && <polygon fill="none" points={`${SK},1 ${w-1},1 ${w-SK},${h-1} 1,${h-1}`} stroke="#8b5cf6" strokeWidth="3" />}
                </svg>
              )}

              {/* Output parallelogram: \  \ (leans left, mirrored) */}
              {isOutput && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${w} ${h}`} style={{ opacity: shapeOpacity, transition: "opacity 0.3s" }}>
                  <polygon
                    fill="#cffafe"
                    points={`1,1 ${w-SK},1 ${w-1},${h-1} ${SK},${h-1}`}
                    stroke="#06b6d4"
                    strokeWidth="2"
                  />
                  <polygon fill="none" points={`1,1 ${w-SK},1 ${w-1},${h-1} ${SK},${h-1}`} stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
                  {node.done && <polygon fill="none" points={`1,1 ${w-SK},1 ${w-1},${h-1} ${SK},${h-1}`} stroke="#06b6d4" strokeWidth="3" />}
                </svg>
              )}

              {/* Type badge */}
              <span className={`absolute -top-2.5 left-2 text-[9px] px-1.5 py-0.5 rounded-full text-white font-semibold z-10 ${cfg.badgeBg}`}>
                {cfg.label}
              </span>

              {/* Note icon */}
              {isNote && (
                <StickyNote className={`absolute top-1.5 left-1.5 w-3.5 h-3.5 ${cfg.text} opacity-50 pointer-events-none`} />
              )}

              {/* Delete button */}
              {!readOnly && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => deleteNode(node.id)}
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:bg-red-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-30"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}

              {/* Done toggle */}
              {!readOnly && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); toggleDone(node.id); }}
                  className={`absolute -bottom-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-30 border-2 border-white dark:border-neutral-800 transition-all
                    ${node.done
                      ? "bg-emerald-500 text-white opacity-100 scale-100"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 opacity-0 group-hover:opacity-100 scale-90"
                    }`}
                  title={node.done ? "완료 취소" : "완료로 표시"}
                >
                  <Check className="w-3 h-3" />
                </button>
              )}

              {/* Port dots — shown on hover or while connecting */}
              {!readOnly && (["right", "left", "top", "bottom"] as PortSide[]).map((side) => (
                <div
                  key={side}
                  onMouseDown={(e) => handlePortMouseDown(e, node.id, side)}
                  className={`absolute rounded-full border-2 border-white dark:border-neutral-800 z-20 transition-opacity
                    ${isHover || connecting ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
                  style={{
                    width: PORT_R * 2, height: PORT_R * 2,
                    backgroundColor: cfg.portColor,
                    cursor: "crosshair",
                    transition: "opacity .15s, transform .15s",
                    ...PORT_POS[side],
                  }}
                />
              ))}

              {/* Content */}
              <div className="w-full px-3 relative z-10" onMouseDown={(e) => isEdit && e.stopPropagation()}>
                {isEdit ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) saveEdit(); if (e.key === "Escape") setEditId(null); }}
                      className={`flex-1 min-w-0 text-xs bg-transparent border-b-2 border-current outline-none ${cfg.text} text-center`}
                    />
                    <button onClick={saveEdit} className={`shrink-0 ${cfg.text} hover:opacity-60`}>
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs font-semibold ${cfg.text} text-center leading-tight line-clamp-2 ${!readOnly ? "group-hover:underline group-hover:decoration-dotted cursor-text" : ""}`}>
                    {node.title}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
