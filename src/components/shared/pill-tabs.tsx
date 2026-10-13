"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

export interface PillTabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

/**
 * Filter pills: matching the look of notification filters
 * (rounded pills over a bottom rule, count chip inside).
 */
export function FilterPills<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: PillTabOption<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap items-center gap-2 border-b border-border/80 pb-3", className)}>
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "bg-primary text-white shadow-xs dark:text-primary-foreground"
                : "border border-border/80 bg-white text-slate-700 hover:bg-slate-50 hover:text-foreground dark:bg-card dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden />}
            {o.label}
            {o.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold tabular-nums",
                  active ? "bg-white/20 text-white dark:bg-black/15 dark:text-primary-foreground" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Page-level tab switcher (with optional icons and count badges): a clean underline row where a line slides
 * to the selected tab. Same look as the detail-page tabs.
 */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: PillTabOption<T>[];
  label: string;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active) return;
    setLine({ left: active.offsetLeft, width: active.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, value, options.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn("relative flex w-fit max-w-full items-center gap-1 overflow-x-auto border-b border-border/70", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -bottom-px h-0.5 rounded-full bg-primary transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none dark:bg-amber-300",
          line ? "opacity-100" : "opacity-0"
        )}
        style={line ? { left: line.left, width: line.width } : undefined}
      />
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex shrink-0 cursor-pointer items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "font-semibold text-primary dark:text-amber-300" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            <span>{o.label}</span>
            {o.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] leading-none font-semibold tabular-nums transition-colors duration-200",
                  active ? "bg-primary/10 text-primary dark:bg-amber-300/15 dark:text-amber-300" : "bg-muted text-muted-foreground"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
