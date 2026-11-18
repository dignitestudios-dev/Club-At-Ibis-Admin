"use client";

import { useEffect, type RefObject } from "react";

/**
 * Click-and-drag panning for a scrollable element (mouse only; touch already scrolls natively).
 * Works in every direction, including back up and to the left.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let left = 0;
    let top = 0;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      left = el.scrollLeft;
      top = el.scrollTop;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      el.scrollLeft = left - (e.clientX - startX);
      el.scrollTop = top - (e.clientY - startY);
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = "";
      el.style.userSelect = "";
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [ref]);
}
