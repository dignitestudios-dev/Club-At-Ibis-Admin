"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
 * Search box with a leading icon, a clear (×) button, and a built-in 1-second (1000ms) debounce.
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
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (internalValue === value) return;

    const timer = setTimeout(() => {
      latestOnChange.current(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, value, debounceMs]);

  const handleClear = () => {
    setInternalValue("");
    latestOnChange.current("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
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
