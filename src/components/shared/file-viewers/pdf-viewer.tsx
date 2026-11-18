"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { ViewerToolbar } from "./viewer-toolbar";
import { useDragScroll } from "./use-drag-scroll";

// Must be set in the module that renders the pages (loaded client-side only).
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const MIN = 0.5;
const MAX = 4;
const STEP = 0.25;

/** Renders a page only when it is near the screen, so long PDFs stay light. */
function LazyPage({ pageNumber, width, ratio, root }: { pageNumber: number; width: number; ratio: number; root: HTMLElement | null }) {
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);

  useEffect(() => {
    const el = holder.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root, rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  return (
    <div ref={holder} className="mx-auto bg-white shadow-lg" style={{ width, minHeight: Math.round(width * ratio) }}>
      {visible && <Page pageNumber={pageNumber} width={width} loading={null} />}
    </div>
  );
}

export default function PdfViewer({ url }: { url: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [pages, setPages] = useState(0);
  const [ratio, setRatio] = useState(1.414);
  const [boxWidth, setBoxWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  const setScroller = useCallback((node: HTMLDivElement | null) => {
    scroller.current = node;
    setRoot(node);
  }, []);
  useDragScroll(scroller);

  // Fit to the pane's width, and re-fit when it resizes.
  useEffect(() => {
    if (!root) return;
    const ro = new ResizeObserver(([entry]) => setBoxWidth(entry.contentRect.width));
    ro.observe(root);
    return () => ro.disconnect();
  }, [root]);

  // Ctrl/⌘ + wheel zooms the document instead of the whole browser page.
  useEffect(() => {
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => Math.min(MAX, Math.max(MIN, z + (e.deltaY < 0 ? STEP : -STEP))));
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [root]);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <FileText className="mb-2 size-12 opacity-40" />
        <p className="text-sm font-medium text-slate-300">Unable to display this PDF</p>
        <p className="mt-1 text-xs text-slate-500">Use Download to open it in another app.</p>
      </div>
    );
  }

  const fit = Math.max(200, boxWidth - 24);
  const pageWidth = Math.round(fit * zoom);

  return (
    <div className="relative h-full w-full">
      <div ref={setScroller} className="h-full w-full overflow-auto overscroll-contain p-3" style={{ cursor: zoom > 1 ? "grab" : undefined }}>
        <Document
          file={url}
          onLoadSuccess={async (pdf) => {
            setPages(pdf.numPages);
            try {
              const first = await pdf.getPage(1);
              const v = first.getViewport({ scale: 1 });
              setRatio(v.height / v.width);
            } catch {
              // keep the default A4 ratio
            }
          }}
          onLoadError={() => setFailed(true)}
          loading={
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 className="mb-2 size-8 animate-spin" />
              <p className="text-sm font-medium text-slate-300">Loading document…</p>
            </div>
          }
        >
          <div className="flex flex-col gap-3" style={{ width: pageWidth, margin: "0 auto" }}>
            {boxWidth > 0 && Array.from({ length: pages }, (_, i) => <LazyPage key={i} pageNumber={i + 1} width={pageWidth} ratio={ratio} root={root} />)}
          </div>
        </Document>
      </div>
      <ViewerToolbar
        label={`${Math.round(zoom * 100)}%`}
        onZoomIn={() => setZoom((z) => Math.min(MAX, z + STEP))}
        onZoomOut={() => setZoom((z) => Math.max(MIN, z - STEP))}
        onReset={() => setZoom(1)}
        canZoomIn={zoom < MAX}
        canZoomOut={zoom > MIN}
      />
    </div>
  );
}
