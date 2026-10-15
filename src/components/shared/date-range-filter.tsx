"use client";

import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateDateRange, yearOfRange, yearOptions, yearToRange } from "@/lib/date-range";

const LABEL = "block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase";

/** Submitted-date filter: a year shortcut plus From / To dates, with an inline error for an invalid range. */
export function DateRangeFilter({
  from,
  to,
  onChange,
  idPrefix = "submitted",
  stacked = false,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  idPrefix?: string;
  /** One field per row (for narrow sidebars). */
  stacked?: boolean;
}) {
  const error = validateDateRange(from, to);
  const year = yearOfRange(from, to);
  const custom = !year && (from || to);
  const items = [
    { label: "All dates", value: "all" },
    ...yearOptions().map((y) => ({ label: y, value: y })),
    ...(custom ? [{ label: "Custom range", value: "custom" }] : []),
  ];

  return (
    <div className="space-y-1.5">
      <div className={stacked ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-3 sm:grid-cols-3"}>
        <div className="space-y-1.5">
          <span className={LABEL}>Submitted year</span>
          <Select
            items={items}
            value={year || (custom ? "custom" : "all")}
            onValueChange={(v) => {
              if (!v || v === "custom") return;
              onChange(v === "all" ? { from: "", to: "" } : yearToRange(v));
            }}
          >
            <SelectTrigger className="w-full border-border bg-card dark:bg-card" aria-label="Submitted year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-from`} className={LABEL}>
            Submitted from
          </label>
          <Input id={`${idPrefix}-from`} type="date" value={from} max={to || undefined} aria-invalid={!!error} onChange={(e) => onChange({ from: e.target.value, to })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-to`} className={LABEL}>
            Submitted to
          </label>
          <Input id={`${idPrefix}-to`} type="date" value={to} min={from || undefined} aria-invalid={!!error} onChange={(e) => onChange({ from, to: e.target.value })} />
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
