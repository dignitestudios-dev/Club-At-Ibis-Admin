"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { FilterOption } from "@/components/shared/filter-select";
import { cn } from "@/utils/cn";

/**
 * Searchable dropdown. Shows the selected option on a Select-style trigger;
 * opening it reveals a search box and the full option list, filtered as you type.
 */
export function FilterCombobox<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(Math.max(0, options.findIndex((o) => o.value === value)));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(o?: FilterOption<T>) {
    if (!o) return;
    onChange(o.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[active]);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={label}
              aria-haspopup="listbox"
              className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-white px-3 text-sm shadow-xs transition-colors outline-none select-none hover:border-foreground/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-card"
            />
          }
        >
          <span className={cn("truncate", !selected && "text-muted-foreground/70")}>{selected?.label ?? placeholder ?? label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-56 gap-0 p-0">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label}`}
              className="h-10 w-full bg-transparent pr-3 pl-8 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} role="listbox" aria-label={label} className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches found.</li>}
            {filtered.map((o, i) => (
              <li key={o.value} role="option" aria-selected={o.value === value} data-index={i}>
                <button
                  type="button"
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    i === active ? "bg-accent text-accent-foreground" : "text-foreground"
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="size-3.5 shrink-0 text-primary dark:text-amber-300" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
