"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

const MIN_HEIGHT = 380;

/**
 * Sizes a table to its rows, up to the rest of the screen: a few rows make a short table, and once the rows
 * need more room than is left below where the table starts (never less than MIN_HEIGHT) they scroll inside it
 * with a sticky header, while `footer` (pagination) stays right underneath. On very short screens the page
 * itself scrolls instead.
 * Wrap any table-based list in this so they all behave the same.
 */
export function TableFrame({
  children,
  footer,
  className,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const main = document.getElementById("main-content");
      const bottomGap = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
      setHeight(Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - top - bottomGap)));
    };
    measure();
    window.addEventListener("resize", measure);
    // Content above the table (filters wrapping, banners) can change its top edge.
    const ro = new ResizeObserver(measure);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={ref} style={{ maxHeight: height }} className={cn("flex flex-col gap-3", className)}>
      <div
        className={cn(
          "min-h-0 overflow-auto rounded-2xl border border-border/80 bg-card shadow-2xs",
          "[&_[data-slot=table-container]]:overflow-visible",
          "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-muted"
        )}
      >
        {children}
      </div>
      {footer && <div className="shrink-0">{footer}</div>}
    </div>
  );
}
