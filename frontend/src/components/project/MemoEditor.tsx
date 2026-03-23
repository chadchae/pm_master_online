"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { DecorationSet } from "@codemirror/view";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { indentUnit } from "@codemirror/language";

interface MemoEditorProps {
  value: string;
  onChange: (v: string) => void;
  showLineNumbers: boolean;
  placeholder?: string;
}

// Plugin: indent wrapped lines to match leading whitespace
function indentWrappedLines() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view);
        }
      }
      build(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
          for (let pos = from; pos <= to; ) {
            const line = view.state.doc.lineAt(pos);
            const match = line.text.match(/^(\s+)/);
            if (match) {
              const indent = match[1].length;
              const deco = Decoration.line({
                attributes: {
                  style: `padding-left: ${indent}ch; text-indent: -${indent}ch;`,
                },
              });
              builder.add(line.from, line.from, deco);
            }
            pos = line.to + 1;
          }
        }
        return builder.finish();
      }
    },
    { decorations: (v) => v.decorations }
  );
}

const lightTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", height: "100%", fontSize: "13px" },
  ".cm-content": { padding: "0.75rem 0.75rem 0.75rem 0.5rem", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace" },
  ".cm-gutters": { backgroundColor: "rgba(250,250,250,0.5)", borderRight: "1px solid #e5e5e5", color: "#a3a3a3", fontSize: "11px", minWidth: "2.25rem" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(229,231,235,0.5)" },
  ".cm-activeLine": { backgroundColor: "rgba(229,231,235,0.3)" },
  ".cm-scroller": { overflow: "auto" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#1a1a1a" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "rgba(99,102,241,0.2)" },
  ".cm-line": { lineHeight: "1.4" },
});

const darkTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", height: "100%", fontSize: "13px" },
  ".cm-content": { padding: "0.75rem 0.75rem 0.75rem 0.5rem", fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace" },
  ".cm-gutters": { backgroundColor: "rgba(38,38,38,0.5)", borderRight: "1px solid #404040", color: "#6b7280", fontSize: "11px", minWidth: "2.25rem" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(55,55,55,0.5)" },
  ".cm-activeLine": { backgroundColor: "rgba(55,55,55,0.3)" },
  ".cm-scroller": { overflow: "auto" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#e5e5e5" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "rgba(99,102,241,0.3)" },
  ".cm-line": { lineHeight: "1.4" },
});

export function MemoEditor({ value, onChange, showLineNumbers, placeholder }: MemoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isExternalUpdate = useRef(false);

  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");

  const createView = useCallback(() => {
    if (!containerRef.current) return;
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const smartTab = keymap.of([{
      key: "Tab",
      run(view) {
        const { state } = view;
        const { from } = state.selection.main;
        const line = state.doc.lineAt(from);
        const colOffset = from - line.from;
        const beforeCursor = line.text.slice(0, colOffset);
        // At line start (only whitespace before cursor) → 5 spaces (paragraph indent)
        // Mid-text → 4 spaces
        const insert = /^\s*$/.test(beforeCursor) ? "     " : "    ";
        view.dispatch({ changes: { from, to: state.selection.main.to, insert }, selection: { anchor: from + insert.length } });
        return true;
      },
    }, {
      key: "Enter",
      run(view) {
        const { state } = view;
        const { from } = state.selection.main;
        const line = state.doc.lineAt(from);
        const leading = line.text.match(/^(\s*)/)?.[1] || "";
        if (!leading) return false; // no indent → default Enter
        // Empty line (only whitespace) → clear indent and insert plain newline
        if (line.text.trim() === "") {
          view.dispatch({
            changes: { from: line.from, to: line.to, insert: "\n" },
            selection: { anchor: line.from + 1 },
          });
          return true;
        }
        // Has content → carry indent to next line
        const insert = "\n" + leading;
        view.dispatch({
          changes: { from, to: state.selection.main.to, insert },
          selection: { anchor: from + insert.length },
        });
        return true;
      },
    }, {
      key: "Shift-Tab",
      run(view) {
        const { state } = view;
        const { from } = state.selection.main;
        const line = state.doc.lineAt(from);
        const leading = line.text.match(/^(\s*)/)?.[1] || "";
        if (!leading) return true;
        // Remove up to 5 spaces from line start
        const remove = Math.min(leading.length, 5);
        view.dispatch({
          changes: { from: line.from, to: line.from + remove, insert: "" },
          selection: { anchor: Math.max(line.from, from - remove) },
        });
        return true;
      },
    }]);

    const extensions = [
      smartTab,
      indentUnit.of("     "),
      EditorView.lineWrapping,
      indentWrappedLines(),
      drawSelection(),
      highlightActiveLine(),
      isDark ? darkTheme : lightTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isExternalUpdate.current) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ];

    if (showLineNumbers) {
      extensions.push(lineNumbers());
    }

    if (!value && placeholder) {
      extensions.push(EditorView.contentAttributes.of({ "data-placeholder": placeholder }));
      extensions.push(EditorView.theme({
        ".cm-content[data-placeholder]:empty::before": {
          content: `attr(data-placeholder)`,
          color: "#a3a3a3",
          fontStyle: "italic",
        },
      }));
    }

    viewRef.current = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: containerRef.current,
    });
  }, [isDark, showLineNumbers]);

  useEffect(() => {
    createView();
    return () => { viewRef.current?.destroy(); viewRef.current = null; };
  }, [createView]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== value) {
      isExternalUpdate.current = true;
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
      isExternalUpdate.current = false;
    }
  }, [value]);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor.cm-focused]:outline-none" />
  );
}
