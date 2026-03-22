"use client";

import React, { Suspense, lazy, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import { CsvViewer } from "./CsvViewer";
import { mdComponents } from "./MarkdownRenderers";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const MarkdownPreview = lazy(() => import("@uiw/react-markdown-preview"));

interface DocumentViewerProps {
  selectedDoc: string;
  docContent: string;
  docBlobUrl: string | null;
  docHtml: string | null;
}

export function DocumentViewer({ selectedDoc, docContent, docBlobUrl, docHtml }: DocumentViewerProps) {
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
    return <iframe src={docBlobUrl} className="w-full h-full border-0" title={selectedDoc || ""} />;
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

  if (selectedDoc?.endsWith(".md") || selectedDoc?.endsWith(".rmd") || selectedDoc?.endsWith(".qmd")) {
    // Escape unescaped % inside \text{} to prevent KaTeX parse errors
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

  return (
    <pre className="p-4 text-sm font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">{docContent}</pre>
  );
}
