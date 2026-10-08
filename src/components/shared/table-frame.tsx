"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

const MIN_HEIGHT = 380;

/**
 * Gives a table the rest of the screen: the frame is as tall as the space left below where it starts
 * (never shorter than MIN_HEIGHT), the rows scroll inside it with a sticky header, and `footer`
 * (pagination) stays pinned underneath. On short screens the page itself scrolls instead.
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
    <div ref={ref} style={{ height }} className={cn("flex min-h-[380px] flex-col gap-3", className)}>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto rounded-2xl border border-border/80 bg-card shadow-2xs",
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
