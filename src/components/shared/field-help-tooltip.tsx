"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FieldHelpTooltipProps {
  content?: string | null;
  className?: string;
}

export function FieldHelpTooltip({ content, className }: FieldHelpTooltipProps) {
  if (!content || !content.trim()) return null;

  return (
    <TooltipProvider delay={100}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          tabIndex={-1}
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/70 hover:text-foreground focus:outline-none transition-colors ml-1 align-middle"
          aria-label="Help information"
        >
          <Info className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs text-xs font-normal shadow-lg leading-relaxed z-50"
        >
          {content.trim()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
