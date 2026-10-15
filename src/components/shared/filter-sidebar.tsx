"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** The "Filters" button that opens the filter sidebar, with the number of filters in use. */
export function FiltersButton({ count, onClick, expanded }: { count: number; onClick: () => void; expanded?: boolean }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} aria-expanded={expanded} className="shrink-0">
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      Filters
      {count > 0 && (
        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground tabular-nums">{count}</span>
      )}
    </Button>
  );
}

/** Link-style button shown whenever any filter is applied. */
export function ClearFiltersLink({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="link" size="sm" onClick={onClick} className="h-auto shrink-0 p-0 text-xs font-medium">
      Clear all filters
    </Button>
  );
}

/** A right-hand sidebar that holds the extra filters. `footer` replaces the default Clear / Done row. */
export function FilterSidebar({
  open,
  onOpenChange,
  title = "Filters",
  description = "Narrow the list. Filters combine: each result must match every one you pick.",
  children,
  footer,
  onClear,
  clearDisabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClear?: () => void;
  clearDisabled?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="font-heading text-lg font-medium">{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
        <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-3">
          {footer ?? (
            <>
              {onClear ? (
                <Button type="button" variant="link" size="sm" onClick={onClear} disabled={clearDisabled} className="h-auto p-0 text-xs">
                  Clear all filters
                </Button>
              ) : (
                <span />
              )}
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
