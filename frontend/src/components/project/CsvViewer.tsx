"use client";

import React from "react";

interface CsvViewerProps {
  content: string;
}

export function CsvViewer({ content }: CsvViewerProps) {
  const lines = content.split("\n").filter((l) => l.trim());
  const parse = (line: string) => {
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  };
  const headers = lines.length > 0 ? parse(lines[0]) : [];
  const rows = lines.slice(1).map(parse);
  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-800">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-medium text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="bg-transparent">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-neutral-700 dark:text-neutral-300 border-b border-neutral-100 dark:border-neutral-800 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
