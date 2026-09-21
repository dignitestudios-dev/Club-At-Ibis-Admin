"use client";

import { cn } from "@/utils/cn";

export interface PillTabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

/**
 * Filter pills — the same look as the resident portal's notification filters
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
 * Segmented switcher — same as the resident portal's "My Requests" tab
 * switcher (pill container, raised active tab).
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
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex w-fit max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-900/90", className)}
    >
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
              "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "bg-white text-primary shadow-xs dark:bg-slate-800 dark:text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden />}
            <span>{o.label}</span>
            {o.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] leading-none font-bold tabular-nums",
                  active ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-amber-300" : "bg-slate-200 text-muted-foreground dark:bg-slate-800"
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
