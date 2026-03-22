"use client";

import { useEffect, useRef, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

interface EmbeddedTerminalProps {
  projectPath: string;
  command?: string;
  visible?: boolean;
  onClose: () => void;
  onSessionEnd?: () => void;
}

export function EmbeddedTerminal({
  projectPath,
  command = "",
  visible = true,
  onClose,
  onSessionEnd,
}: EmbeddedTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<any>(null);
  const fitRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [dynamicHeight, setDynamicHeight] = useState(300);
  const sessionEndFired = useRef(false);

  // Calculate height: from container top to bottom of viewport - 5px
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    const updateHeight = () => {
      if (containerRef.current && !expanded) {
        const rect = containerRef.current.getBoundingClientRect();
        const h = window.innerHeight - rect.top - 5;
        setDynamicHeight(Math.max(200, h));
        clearTimeout(timerId);
        timerId = setTimeout(() => fitRef.current?.fit(), 50);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      clearTimeout(timerId);
    };
  }, [expanded]);

  // Prevent parent scroll when terminal tab is active
  useEffect(() => {
    if (!visible || expanded) return;
    let target: HTMLElement | null = null;
    let originalOverflow = "";
    let el = containerRef.current?.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (style.overflow === "auto" || style.overflowY === "auto") {
        target = el;
        originalOverflow = style.overflow;
        el.style.overflow = "hidden";
        break;
      }
      el = el.parentElement;
    }
    return () => {
      if (target) target.style.overflow = originalOverflow;
    };
  }, [visible, expanded]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      // Dynamic import to avoid SSR issues
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (disposed || !termRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Geist Mono', 'SF Mono', Menlo, monospace",
        theme: {
          background: "#0a0a0a",
          foreground: "#e5e5e5",
          cursor: "#e5e5e5",
          selectionBackground: "#3b3b3b",
          black: "#0a0a0a",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#06b6d4",
          white: "#e5e5e5",
        },
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(termRef.current);
      fitAddon.fit();

      terminalRef.current = term;
      fitRef.current = fitAddon;

      // Connect WebSocket
      const backendPort =
        process.env.NEXT_PUBLIC_BACKEND_PORT || "8000";
      const token = localStorage.getItem("pm_token") || "";
      const ws = new WebSocket(`ws://localhost:${backendPort}/ws/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Send config
        ws.send(
          JSON.stringify({
            project_path: projectPath,
            command: command,
            token: token,
          })
        );

        // Send resize
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          ws.send(
            JSON.stringify({
              type: "resize",
              rows: dims.rows,
              cols: dims.cols,
            })
          );
        }
      };

      // Buffer to detect [DONE] marker from Claude Code output
      let outputBuffer = "";

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          event.data.text().then((text: string) => {
            term.write(text);
            outputBuffer += text;
            // Detect completion markers (fire once)
            if (!sessionEndFired.current && (outputBuffer.includes("[DONE]") || outputBuffer.includes("<moai>DONE</moai>"))) {
              sessionEndFired.current = true;
              onSessionEnd?.();
              outputBuffer = "";
            }
            // Keep buffer manageable
            if (outputBuffer.length > 2000) {
              outputBuffer = outputBuffer.slice(-1000);
            }
          });
        } else {
          term.write(event.data);
          outputBuffer += event.data;
          if (!sessionEndFired.current && (outputBuffer.includes("[DONE]") || outputBuffer.includes("<moai>DONE</moai>"))) {
            sessionEndFired.current = true;
            onSessionEnd?.();
            outputBuffer = "";
          }
          if (outputBuffer.length > 2000) {
            outputBuffer = outputBuffer.slice(-1000);
          }
        }
      };

      ws.onclose = () => {
        setConnected(false);
        term.write("\r\n\x1b[90m[Session ended]\x1b[0m\r\n");
        // Only fire if not already fired by [DONE] marker
        if (!sessionEndFired.current) {
          sessionEndFired.current = true;
          onSessionEnd?.();
        }
      };

      ws.onerror = () => {
        setConnected(false);
        term.write("\r\n\x1b[31m[Connection error]\x1b[0m\r\n");
      };

      // Terminal input → WebSocket
      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Handle resize
      const observer = new ResizeObserver(() => {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "resize",
              rows: dims.rows,
              cols: dims.cols,
            })
          );
        }
      });
      observer.observe(termRef.current);

      return () => {
        observer.disconnect();
      };
    }

    init();

    return () => {
      disposed = true;
      wsRef.current?.close();
      terminalRef.current?.dispose();
    };
  }, [projectPath, command]);

  return (
    <div
      ref={containerRef}
      className={`border border-neutral-700 rounded-lg overflow-hidden bg-[#0a0a0a] ${
        expanded ? "fixed inset-4 z-50" : ""
      }`}
      style={expanded ? undefined : { height: dynamicHeight }}
    >
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-neutral-400 font-mono truncate">
            {command ? "claude" : "shell"} — {projectPath.split("/").pop()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-neutral-700 text-neutral-400 transition-colors"
          >
            {expanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => {
              wsRef.current?.close();
              onClose();
            }}
            className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={termRef}
        className="h-[calc(100%-32px)]"
      />
    </div>
  );
}
