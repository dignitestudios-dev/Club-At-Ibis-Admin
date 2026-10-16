"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/utils/cn";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  debounceMs?: number;
}

/**
 * Search box with a leading icon, a clear (×) button, and a shared useDebounce hook.
 * Keeps typing responsive while preventing excessive query and filter recalculations.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  ariaLabel,
  debounceMs = 400,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value);
  const debouncedValue = useDebounce(internalValue, debounceMs);
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;
  const isFirstMount = useRef(true);
  // True only while the text differs because the user typed (not because the parent set `value`).
  const userTyped = useRef(false);

  useEffect(() => {
    // The parent changed the value (e.g. "Clear filters"): adopt it and drop any pending typed text,
    // otherwise the stale debounced text would be emitted back and undo the reset.
    userTyped.current = false;
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    // Only emit once the debounced value has caught up with what's typed. After
    // a clear, `debouncedValue` still holds the old text for a moment; emitting
    // it then would put the cleared search right back.
    if (!userTyped.current || debouncedValue !== internalValue) return;
    if (debouncedValue !== value) {
      latestOnChange.current(debouncedValue);
    }
    userTyped.current = false;
  }, [debouncedValue, internalValue, value]);

  const handleClear = () => {
    userTyped.current = false;
    setInternalValue("");
    latestOnChange.current("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        value={internalValue}
        onChange={(e) => {
          userTyped.current = true;
          setInternalValue(e.target.value);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        maxLength={100}
        className="bg-card pr-9 pl-9"
      />
      {internalValue && internalValue.trim().length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-1 text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Clear search"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
