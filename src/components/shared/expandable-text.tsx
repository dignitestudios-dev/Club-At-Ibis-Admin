"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Long text clamped to `limit` characters with an inline "…show more" / "show less" toggle.
 * Short text renders as-is, with no toggle.
 */
export function ExpandableText({
  text,
  limit = 150,
  className,
  buttonClassName,
}: {
  text: string;
  limit?: number;
  className?: string;
  buttonClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const value = text ?? "";
  const needsToggle = value.length > limit;
  const shown = needsToggle && !expanded ? `${value.slice(0, limit).trimEnd()}…` : value;

  return (
    <span className={cn("break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap", className)}>
      {shown}
      {needsToggle && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            className={cn(
              "inline cursor-pointer rounded-sm font-semibold text-primary underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-amber-300",
              buttonClassName
            )}
          >
            {expanded ? "show less" : "show more"}
          </button>
        </>
      )}
    </span>
  );
}
