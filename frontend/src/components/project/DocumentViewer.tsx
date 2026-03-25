"use client";

import React, { Suspense, lazy, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { ExternalLink, Loader2 } from "lucide-react";
import { CsvViewer } from "./CsvViewer";
import { mdComponents } from "./MarkdownRenderers";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const MarkdownPreview = lazy(() => import("@uiw/react-markdown-preview"));

function LineNumberedContent({ content, mono = true }: { content: string; mono?: boolean }) {
  const lines = content.split("\n");
  const gutterWidth = String(lines.length).length;
  return (
    <div className="flex h-full overflow-auto">
      <div className="flex-shrink-0 select-none text-right pr-3 border-r border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 sticky left-0">
        {lines.map((_, i) => (
          <div key={i} className="text-xs leading-5 text-neutral-400 px-2" style={{ minWidth: `${gutterWidth + 1.5}ch` }}>
            {i + 1}
          </div>
        ))}
      </div>
      <pre className={`flex-1 pl-3 text-sm ${mono ? "font-mono" : "font-sans"} text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words`}>
        {lines.map((line, i) => (
          <div key={i} className="leading-5">{line || "\u00A0"}</div>
        ))}
      </pre>
    </div>
  );
}

interface DocumentViewerProps {
  selectedDoc: string;
  docContent: string;
  docBlobUrl: string | null;
  docHtml: string | null;
  showLineNumbers?: boolean;
}

export function DocumentViewer({ selectedDoc, docContent, docBlobUrl, docHtml, showLineNumbers }: DocumentViewerProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (docBlobUrl) {
    const ext = selectedDoc?.split(".").pop()?.toLowerCase() || "";
    const videoExts = ["mp4","webm","mov","avi","mkv","m4v","flv","wmv","3gp","ogv","ts"];
    const audioExts = ["mp3","wav","ogg","m4a","aac","flac","wma","opus","aiff","mid","midi","weba"];
    const imageExts = ["png","jpg","jpeg","gif","webp","bmp","ico","tiff"];
    if (videoExts.includes(ext)) {
      return <div className="flex items-center justify-center h-full bg-black"><video src={docBlobUrl} controls className="max-w-full max-h-full" /></div>;
    }
    if (audioExts.includes(ext)) {
      return <div className="flex items-center justify-center h-full p-8"><audio src={docBlobUrl} controls className="w-full max-w-lg" /></div>;
    }
    if (imageExts.includes(ext)) {
      return <div className="flex items-center justify-center h-full p-4 overflow-auto"><img src={docBlobUrl} alt={selectedDoc || ""} className="max-w-full max-h-full object-contain" /></div>;
    }
    const isHtml = ["html", "htm"].includes(ext);
    return (
      <div className="relative w-full h-full">
        <iframe src={docBlobUrl} className="w-full h-full border-0" title={selectedDoc || ""} />
        {isHtml && (
          <button
            onClick={() => window.open(docBlobUrl, "_blank")}
            title="Open in browser"
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg bg-neutral-800/80 hover:bg-neutral-700/90 text-neutral-200 backdrop-blur-sm shadow transition-colors"
          >
            <ExternalLink size={12} />
            Open in browser
          </button>
        )}
      </div>
    );
  }

  if (docHtml) {
    return (
      <div
        className="p-6 prose prose-sm dark:prose-invert max-w-none overflow-auto h-full"
        dangerouslySetInnerHTML={{ __html: docHtml }}
      />
    );
  }

  if (selectedDoc?.endsWith(".csv")) {
    return <CsvViewer content={docContent} />;
  }

  if (selectedDoc?.endsWith(".hwp") || selectedDoc?.endsWith(".hwpx")) {
    return (
      <div className="p-6 h-full overflow-auto">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
            HWP Preview
          </span>
          <span className="text-xs text-neutral-400">Text extracted from {selectedDoc}</span>
        </div>
        {showLineNumbers ? (
          <LineNumberedContent content={docContent} mono={false} />
        ) : (
          <pre className="text-sm font-sans text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed">
            {docContent}
          </pre>
        )}
      </div>
    );
  }

  if (selectedDoc?.endsWith(".md") || selectedDoc?.endsWith(".rmd") || selectedDoc?.endsWith(".qmd")) {
    if (showLineNumbers) {
      return (
        <div className="p-4 h-full overflow-auto">
          <LineNumberedContent content={docContent} />
        </div>
      );
    }
    const fixedContent = docContent.replace(/\\text\{([^}]*)}/g, (match, inner) =>
      "\\text{" + inner.replace(/(?<!\\)%/g, "\\%") + "}"
    );
    return (
      <div data-color-mode={mounted && resolvedTheme === "dark" ? "dark" : "light"}>
        <Suspense fallback={<div className="p-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
          <MarkdownPreview
            source={fixedContent}
            style={{ padding: "1rem", backgroundColor: "transparent" }}
            components={mdComponents}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: "ignore", throwOnError: false, output: "html" }]]}
          />
        </Suspense>
      </div>
    );
  }

  if (showLineNumbers) {
    return (
      <div className="p-4 h-full overflow-auto">
        <LineNumberedContent content={docContent} />
      </div>
    );
  }

  return (
    <pre className="p-4 text-sm font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">{docContent}</pre>
  );
}
