"use client";

import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTodayDateString, validateDateRange } from "@/lib/date-range";

const LABEL = "block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase";

/** Submitted-date / Occurred-date filter: From / To dates, with an inline error for an invalid range. */
export function DateRangeFilter({
  from,
  to,
  onChange,
  idPrefix = "submitted",
  stacked = false,
  labelFrom = "Submitted from",
  labelTo = "Submitted to",
  allowFuture = false,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  idPrefix?: string;
  /** One field per row (for narrow sidebars). */
  stacked?: boolean;
  labelFrom?: string;
  labelTo?: string;
  allowFuture?: boolean;
}) {
  const error = validateDateRange(from, to, allowFuture);
  const today = getTodayDateString();
  const maxToDate = !allowFuture ? today : undefined;
  const maxFromDate = to || (!allowFuture ? today : undefined);

  return (
    <div className="space-y-1.5">
      <div className={stacked ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-from`} className={LABEL}>
            {labelFrom}
          </label>
          <Input id={`${idPrefix}-from`} type="date" value={from} max={maxFromDate} aria-invalid={!!error} onChange={(e) => onChange({ from: e.target.value, to })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-to`} className={LABEL}>
            {labelTo}
          </label>
          <Input id={`${idPrefix}-to`} type="date" value={to} min={from || undefined} max={maxToDate} aria-invalid={!!error} onChange={(e) => onChange({ from, to: e.target.value })} />
        </div>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
