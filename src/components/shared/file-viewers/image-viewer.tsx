"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { TransformComponent, TransformWrapper, useControls, useTransformEffect } from "react-zoom-pan-pinch";
import { ViewerToolbar } from "./viewer-toolbar";

const MAX_SCALE = 8;

/** Zoom buttons; lives inside <TransformWrapper> so it can follow the live zoom level. */
function Controls({ onScale }: { onScale: (scale: number) => void }) {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scale, setScale] = useState(1);

  useTransformEffect(({ state }) => {
    setScale(state.scale);
    onScale(state.scale);
  });

  return (
    <ViewerToolbar
      label={`${Math.round(scale * 100)}%`}
      onZoomIn={() => zoomIn(0.5)}
      onZoomOut={() => zoomOut(0.5)}
      onReset={() => resetTransform()}
      canZoomOut={scale > 1.001}
      canZoomIn={scale < MAX_SCALE - 0.01}
    />
  );
}

/**
 * Zoomable, pannable image: mouse wheel / pinch / double-click to zoom, drag to move in every direction,
 * zoom buttons and "fit" reset.
 */
export default function ImageViewer({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <ImageIcon className="mb-2 size-12 opacity-40" />
        <p className="text-sm font-medium text-slate-300">Unable to load image preview</p>
        <p className="mt-1 text-xs text-slate-500">The image file could not be displayed or the source is unavailable.</p>
      </div>
    );
  }

  return (
    <TransformWrapper
      minScale={1}
      maxScale={MAX_SCALE}
      initialScale={1}
      centerOnInit
      limitToBounds
      doubleClick={{ mode: "toggle", step: 1.2 }}
      wheel={{ step: 0.15 }}
    >
      <div className="relative h-full w-full">
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%", cursor: zoomed ? "grab" : "default" }}
          contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name}
            draggable={false}
            onError={() => setFailed(true)}
            className="max-h-full max-w-full select-none object-contain"
          />
        </TransformComponent>
        <Controls onScale={(s) => setZoomed(s > 1.001)} />
      </div>
    </TransformWrapper>
  );
}
