"use client";

import { Printer, FileText, Download } from "lucide-react";

interface ListExportBarProps {
  onPrint: () => void;
  onExportMD: () => void;
  onExportCSV: () => void;
}

export function ListExportBar({ onPrint, onExportMD, onExportCSV }: ListExportBarProps) {
  return (
    <div className="flex items-center gap-1 mb-2 justify-end">
      <button
        onClick={onPrint}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
        title="Print list"
      >
        <Printer className="w-3.5 h-3.5" />
        Print
      </button>
      <button
        onClick={onExportMD}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
        title="Export as Markdown"
      >
        <FileText className="w-3.5 h-3.5" />
        MD
      </button>
      <button
        onClick={onExportCSV}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
        title="Export as CSV"
      >
        <Download className="w-3.5 h-3.5" />
        CSV
      </button>
    </div>
  );
}

export function generateMD(title: string, rows: Record<string, string>[]): string {
  if (rows.length === 0) return `# ${title}\n\nNo data.\n`;
  const keys = Object.keys(rows[0]);
  let md = `# ${title}\n\nExported: ${new Date().toISOString().split("T")[0]}\n\n`;
  rows.forEach((row, i) => {
    md += `## ${i + 1}. ${row[keys[0]] || "Untitled"}\n\n`;
    keys.slice(1).forEach((key) => {
      if (row[key] && row[key] !== "-") {
        md += `- **${key}**: ${row[key]}\n`;
      }
    });
    md += "\n";
  });
  return md;
}

export function generateCSV(rows: Record<string, string>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
  const header = keys.map(escape).join(",");
  const body = rows.map((row) => keys.map((k) => escape(row[k] || "")).join(",")).join("\n");
  return header + "\n" + body;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printList(title: string, rows: Record<string, string>[]): void {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const printWin = window.open("", "_blank");
  if (!printWin) return;
  const tableHTML = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
    <thead><tr>${keys.map((k) => `<th style="background:#f5f5f5;text-align:left;padding:8px;">${k}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${keys.map((k) => `<td style="padding:6px;">${row[k] || "-"}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
  printWin.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:20px;}h1{font-size:18px;margin-bottom:10px;}@media print{body{margin:0;}}</style></head><body><h1>${title}</h1><p style="color:#888;font-size:11px;">Exported: ${new Date().toISOString().split("T")[0]}</p>${tableHTML}</body></html>`);
  printWin.document.close();
  setTimeout(() => printWin.print(), 300);
}
