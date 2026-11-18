"use client";

import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

const btn =
  "flex size-9 items-center justify-center rounded-lg text-slate-100 transition-colors hover:bg-white/15 active:bg-white/25 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

/** Floating zoom controls shared by every viewer. */
export function ViewerToolbar({
  label,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn = true,
  canZoomOut = true,
}: {
  /** e.g. "125%" */
  label?: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-white/10 bg-slate-900/85 p-1 shadow-xl backdrop-blur-md">
      <button type="button" className={btn} onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" title="Zoom out">
        <ZoomOut className="size-4" />
      </button>
      {label && <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-slate-200">{label}</span>}
      <button type="button" className={btn} onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in" title="Zoom in">
        <ZoomIn className="size-4" />
      </button>
      <button type="button" className={btn} onClick={onReset} aria-label="Fit to screen" title="Fit to screen">
        <Maximize2 className="size-4" />
      </button>
    </div>
  );
}
