"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ViewerToolbar } from "./viewer-toolbar";
import { useDragScroll } from "./use-drag-scroll";

/** Word (.docx) documents, rendered in the page with docx-preview. */
export default function DocxViewer({ url }: { url: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(1);
  useDragScroll(scroller);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ renderAsync }, blob] = await Promise.all([import("docx-preview"), fetch(url).then((r) => r.blob())]);
        if (cancelled || !body.current) return;
        body.current.innerHTML = "";
        await renderAsync(blob, body.current, undefined, { inWrapper: true, ignoreWidth: false, breakPages: true });
        if (!cancelled) setState("ready");
      } catch (err) {
        console.error("DOCX preview failed:", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <FileText className="mb-2 size-12 opacity-40" />
        <p className="text-sm font-medium text-slate-300">Unable to display this document</p>
        <p className="mt-1 text-xs text-slate-500">Use Download to open it in Word.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={scroller} className="h-full w-full overflow-auto overscroll-contain" style={{ cursor: zoom > 1 ? "grab" : undefined }}>
        {state === "loading" && (
          <div className="flex h-full flex-col items-center justify-center text-slate-400">
            <Loader2 className="mb-2 size-8 animate-spin" />
            <p className="text-sm font-medium text-slate-300">Loading document…</p>
          </div>
        )}
        {/* CSS zoom reflows the layout, so scrollbars and dragging stay correct at every zoom level. */}
        <div ref={body} style={{ zoom }} className="docx-viewer [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-3 [&_.docx-wrapper>section.docx]:mx-auto [&_.docx-wrapper>section.docx]:shadow-lg" />
      </div>
      <ViewerToolbar
        label={`${Math.round(zoom * 100)}%`}
        onZoomIn={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
        onReset={() => setZoom(1)}
        canZoomIn={zoom < 3}
        canZoomOut={zoom > 0.5}
      />
    </div>
  );
}
