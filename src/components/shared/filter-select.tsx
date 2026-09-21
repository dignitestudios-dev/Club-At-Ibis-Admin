"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";

export interface FilterOption<T extends string = string> {
  label: string;
  value: T;
}

export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  triggerClassName,
  hideLabel = false,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
  className?: string;
  triggerClassName?: string;
  hideLabel?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span
        className={cn(
          "block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase",
          hideLabel && "sr-only"
        )}
      >
        {label}
      </span>
      <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v as T)}>
        <SelectTrigger className={cn("w-full bg-card dark:bg-card border-border", triggerClassName)} aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
