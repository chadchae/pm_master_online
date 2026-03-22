"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  select,
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceRadial,
  scaleLinear, max, drag,
  type SimulationNodeDatum, type SimulationLinkDatum, type Selection,
} from "d3";
import { apiFetch } from "@/lib/api";

interface NetworkNode extends SimulationNodeDatum {
  id: string;
  name: string;
  fullName: string;
  photo: string;
  importance: number;
  closeness: number;
  degree: number;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
}

interface NetworkLink extends SimulationLinkDatum<NetworkNode> {
  weight: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selfId: string;
  totalPeople: number;
  totalEdges: number;
}

const IMPORTANCE_COLORS: Record<number, string> = {
  0: "#9ca3af", 1: "#60a5fa", 2: "#34d399", 3: "#fbbf24", 4: "#f97316", 5: "#ef4444",
};

type LayoutMode = "spring" | "pathfinder" | "radial";

// Pathfinder Network Scaling (PFNET) algorithm
function pathfinderFilter(edges: NetworkEdge[], nodeIds: Set<string>): NetworkEdge[] {
  // Build distance matrix (inverse of weight = distance)
  const ids = [...nodeIds];
  const n = ids.length;
  const idxMap = new Map(ids.map((id, i) => [id, i]));

  // Initialize distance matrix with infinity
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) dist[i][i] = 0;

  // Fill direct distances (lower weight = longer distance for pathfinder)
  const maxWeight = Math.max(...edges.map((e) => e.weight), 1);
  for (const e of edges) {
    const i = idxMap.get(e.source);
    const j = idxMap.get(e.target);
    if (i !== undefined && j !== undefined) {
      const d = maxWeight - e.weight + 1; // invert: high weight = short distance
      dist[i][j] = Math.min(dist[i][j], d);
      dist[j][i] = Math.min(dist[j][i], d);
    }
  }

  // Floyd-Warshall shortest paths
  const shortest: number[][] = dist.map((row) => [...row]);
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (shortest[i][k] + shortest[k][j] < shortest[i][j]) {
          shortest[i][j] = shortest[i][k] + shortest[k][j];
        }
      }
    }
  }

  // Keep edge only if direct distance <= shortest path (triangle inequality)
  return edges.filter((e) => {
    const i = idxMap.get(e.source);
    const j = idxMap.get(e.target);
    if (i === undefined || j === undefined) return false;
    return dist[i][j] <= shortest[i][j];
  });
}

interface PeopleNetworkProps {
  width?: number;
  height?: number;
  filterNodeIds?: string[] | null;
}

export function PeopleNetwork({ width = 800, height = 400, filterNodeIds = null }: PeopleNetworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutMode>("spring");
  const [edgeSource, setEdgeSource] = useState<"both" | "connections" | "coproject">("both");

  useEffect(() => {
    setLoading(true);
    apiFetch<NetworkData>(`/api/people/network?exclude_self=true&edge_source=${edgeSource}`)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [edgeSource]);

  // Filter nodes by filterNodeIds (client-side)
  const visibleNodes = useMemo(() => {
    if (!data) return [];
    if (!filterNodeIds || filterNodeIds.length === 0) return data.nodes;
    const idSet = new Set(filterNodeIds);
    return data.nodes.filter((n) => idSet.has(n.id));
  }, [data, filterNodeIds]);

  // Apply pathfinder filter on edges (only between visible nodes)
  const filteredEdges = useMemo(() => {
    if (!data) return [];
    const nodeIds = new Set(visibleNodes.map((n) => n.id));
    const edges = data.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    if (layout === "pathfinder") {
      return pathfinderFilter(edges, nodeIds);
    }
    return edges;
  }, [data, visibleNodes, layout]);

  // Render D3 network
  useEffect(() => {
    if (!data || !svgRef.current || visibleNodes.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll("*").remove();

    // Spread initial positions randomly across the canvas
    const nodes: NetworkNode[] = visibleNodes.map((n) => ({
      ...n,
      x: width * 0.2 + Math.random() * width * 0.6,
      y: height * 0.2 + Math.random() * height * 0.6,
    }));
    const nodeIdSet = new Set(nodes.map((n) => n.id));

    const links: NetworkLink[] = filteredEdges
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, weight: e.weight }));

    // Recalculate degree based on filtered edges
    const degreeMap = new Map<string, number>();
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : (l.source as NetworkNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as NetworkNode).id;
      degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
      degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    }
    nodes.forEach((n) => { n.degree = degreeMap.get(n.id) || 0; });

    // Scales
    const maxDegree = max(nodes, (n) => n.degree) || 1;
    const radiusScale = scaleLinear().domain([0, maxDegree]).range([12, 24]);
    const maxWeight = max(links, (l) => l.weight) || 1;
    const strokeWidthScale = scaleLinear().domain([0, maxWeight]).range([0.5, 4]);

    // Defs for clip paths
    const defs = svg.append("defs");
    nodes.forEach((node) => {
      defs.append("clipPath").attr("id", `clip-${node.id}`).append("circle").attr("r", radiusScale(node.degree));
    });

    // Force simulation
    const isRadial = layout === "radial";
    const simulation = forceSimulation<NetworkNode>(nodes)
      .force("link", forceLink<NetworkNode, NetworkLink>(links).id((d) => d.id).distance(isRadial ? 80 : 180).strength(0.5))
      .force("charge", forceManyBody().strength(isRadial ? -60 : -200))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collision", forceCollide<NetworkNode>().radius((d) => radiusScale(d.degree) + 30));

    // Pre-compute layout (warmup: run simulation without rendering)
    simulation.alpha(1).alphaDecay(0.02);
    for (let i = 0; i < 500; i++) simulation.tick();

    if (isRadial) {
      simulation.force("radial", forceRadial(Math.min(width, height) * 0.35, width / 2, height / 2).strength(0.3));
    }

    // Links (curved for pathfinder, straight for others)
    const useCurved = layout === "pathfinder";

    const linkElements = svg.append("g").selectAll(useCurved ? "path" : "line").data(links).join(useCurved ? "path" : "line")
      .attr("stroke", "#6b7280").attr("stroke-opacity", 0.35).attr("fill", "none")
      .attr("stroke-width", (d) => strokeWidthScale(d.weight));

    // Build adjacency map for highlight
    const neighbors = new Map<string, Set<string>>();
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : (l.source as NetworkNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as NetworkNode).id;
      if (!neighbors.has(s)) neighbors.set(s, new Set());
      if (!neighbors.has(t)) neighbors.set(t, new Set());
      neighbors.get(s)!.add(t);
      neighbors.get(t)!.add(s);
    }

    // Highlight functions
    const highlight = (hoveredId: string) => {
      const connected = neighbors.get(hoveredId) || new Set();
      nodeGroup.attr("opacity", (d) => d.id === hoveredId || connected.has(d.id) ? 1 : 0.15);
      linkElements.attr("stroke-opacity", (d) => {
        const s = typeof d.source === "string" ? d.source : (d.source as NetworkNode).id;
        const t = typeof d.target === "string" ? d.target : (d.target as NetworkNode).id;
        return s === hoveredId || t === hoveredId ? 0.7 : 0.05;
      });
    };
    const unhighlight = () => {
      nodeGroup.attr("opacity", 1);
      linkElements.attr("stroke-opacity", 0.35);
    };

    // Node groups
    const nodeGroup = svg.append("g").selectAll("g").data(nodes).join("g")
      .on("mouseenter", (_, d) => highlight(d.id))
      .on("mouseleave", () => unhighlight())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(drag<any, NetworkNode>()
        .on("start", (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Node border
    nodeGroup.append("circle")
      .attr("r", (d) => radiusScale(d.degree) + Math.max(d.closeness, 1))
      .attr("fill", "none")
      .attr("stroke", (d) => IMPORTANCE_COLORS[d.importance] || IMPORTANCE_COLORS[0])
      .attr("stroke-width", (d) => Math.max(d.closeness * 0.8, 1));

    // Node photo or placeholder
    nodeGroup.each(function (d) {
      const g = select(this);
      const r = radiusScale(d.degree);
      if (d.photo) {
        g.append("image")
          .attr("href", `/api/people/photos/${encodeURIComponent(d.photo)}`)
          .attr("width", r * 2).attr("height", r * 2).attr("x", -r).attr("y", -r)
          .attr("clip-path", `url(#clip-${d.id})`).attr("preserveAspectRatio", "xMidYMid slice");
      } else {
        g.append("circle").attr("r", r).attr("fill", "#374151");
        g.append("text").attr("text-anchor", "middle").attr("dominant-baseline", "central")
          .attr("fill", "#9ca3af").attr("font-size", Math.max(r * 0.6, 10)).text(d.name.charAt(0));
      }
    });

    // Labels
    nodeGroup.append("text").attr("text-anchor", "middle")
      .attr("dy", (d) => radiusScale(d.degree) + 12)
      .attr("fill", "#d1d5db").attr("font-size", 9).attr("font-weight", 500).text((d) => d.name);

    // Tick
    simulation.on("tick", () => {
      nodes.forEach((d) => {
        const r = radiusScale(d.degree) + 20;
        d.x = Math.max(r, Math.min(width - r, d.x || 0));
        d.y = Math.max(r, Math.min(height - r, d.y || 0));
      });

      if (useCurved) {
        (linkElements as Selection<SVGPathElement, NetworkLink, SVGGElement, unknown>)
          .attr("d", (d) => {
            const sx = (d.source as NetworkNode).x || 0, sy = (d.source as NetworkNode).y || 0;
            const tx = (d.target as NetworkNode).x || 0, ty = (d.target as NetworkNode).y || 0;
            const dx = tx - sx, dy = ty - sy;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
            return `M${sx},${sy}A${dr},${dr} 0 0,1 ${tx},${ty}`;
          });
      } else {
        (linkElements as Selection<SVGLineElement, NetworkLink, SVGGElement, unknown>)
          .attr("x1", (d) => (d.source as NetworkNode).x || 0)
          .attr("y1", (d) => (d.source as NetworkNode).y || 0)
          .attr("x2", (d) => (d.target as NetworkNode).x || 0)
          .attr("y2", (d) => (d.target as NetworkNode).y || 0);
      }
      nodeGroup.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => { simulation.stop(); };
  }, [data, visibleNodes, filteredEdges, layout, width, height]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-neutral-500 text-sm">Loading...</div>;
  }
  if (!data || visibleNodes.length < 2) {
    return <div className="flex items-center justify-center h-full text-neutral-500 text-sm">Not enough connections</div>;
  }

  return (
    <div>
      {/* Layout + Edge source selectors */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        {(["spring", "pathfinder", "radial"] as LayoutMode[]).map((mode) => {
          const labels: Record<LayoutMode, string> = { spring: "Spring", pathfinder: "Pathfinder", radial: "Radial" };
          return (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${
                layout === mode
                  ? "bg-amber-500 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {labels[mode]}
            </button>
          );
        })}
        <span className="text-neutral-300 dark:text-neutral-600 mx-0.5">|</span>
        {(["both", "connections", "coproject"] as const).map((src) => {
          const labels = { both: "Both", connections: "연관인물", coproject: "프로젝트" };
          return (
            <button
              key={src}
              onClick={() => setEdgeSource(src)}
              className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${
                edgeSource === src
                  ? "bg-indigo-500 text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {labels[src]}
            </button>
          );
        })}
      </div>
      <svg ref={svgRef} width={width} height={height} className="rounded-lg" />
      <p className="text-[10px] text-neutral-500 mt-1">
        {visibleNodes.length} nodes · {filteredEdges.length} edges
        {layout === "pathfinder" && ` (${data.edges.length - filteredEdges.length} pruned)`}
      </p>
    </div>
  );
}
