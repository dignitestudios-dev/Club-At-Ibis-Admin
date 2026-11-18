"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ViewerToolbar } from "./viewer-toolbar";
import { useDragScroll } from "./use-drag-scroll";

const MAX_CHARS = 500_000;

/** Plain text, logs, JSON, Markdown and XML shown as monospaced text. */
export default function TextViewer({ url, name }: { url: string; name: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState(13);
  useDragScroll(scroller);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => {
        if (cancelled) return;
        // Pretty-print JSON when it parses.
        if (name.toLowerCase().endsWith(".json")) {
          try {
            t = JSON.stringify(JSON.parse(t), null, 2);
          } catch {
            // show as-is
          }
        }
        setText(t);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [url, name]);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <FileText className="mb-2 size-12 opacity-40" />
        <p className="text-sm font-medium text-slate-300">Unable to display this file</p>
      </div>
    );
  }
  if (text === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <Loader2 className="mb-2 size-8 animate-spin" />
        <p className="text-sm font-medium text-slate-300">Loading file…</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={scroller} className="h-full w-full overflow-auto overscroll-contain bg-white p-4 dark:bg-slate-900">
        <pre className="font-mono whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100" style={{ fontSize: size }}>
          {text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n\n… (file truncated — download it to see everything)" : text}
        </pre>
      </div>
      <ViewerToolbar
        label={`${size}px`}
        onZoomIn={() => setSize((s) => Math.min(28, s + 2))}
        onZoomOut={() => setSize((s) => Math.max(9, s - 2))}
        onReset={() => setSize(13)}
        canZoomIn={size < 28}
        canZoomOut={size > 9}
      />
    </div>
  );
}
