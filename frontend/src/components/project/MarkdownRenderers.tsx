"use client";

import React, { useEffect, useRef } from "react";

export function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "default" });
      const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
      m.default.render(id, code).then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      }).catch(() => {
        if (!cancelled && ref.current) ref.current.textContent = code;
      });
    });
    return () => { cancelled = true; };
  }, [code]);
  return <div ref={ref} className="flex justify-center p-4 overflow-auto" />;
}

export function KaTeXBlock({ math, display }: { math: string; display?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    import("katex").then((k) => {
      // katex CSS loaded via CDN in layout
      if (ref.current) {
        ref.current.innerHTML = k.default.renderToString(math, { displayMode: !!display, throwOnError: false });
      }
    });
  }, [math, display]);
  return <span ref={ref} />;
}

export const mdComponents = {
  code: ({ children, className, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
    const lang = className?.replace("language-", "") || "";
    const text = String(children).replace(/\n$/, "");
    if (lang === "mermaid") return <MermaidBlock code={text} />;
    if (lang === "math" || lang === "katex" || lang === "latex") return <KaTeXBlock math={text} display />;
    return <code className={className} {...props}>{children}</code>;
  },
};
