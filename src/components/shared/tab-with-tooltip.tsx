"use client";

import { Info } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A tab with a small info icon. Hovering (or focusing) the icon explains what the tab contains, so the
 * tooltip is discoverable and never pops up just because the pointer crossed the tab.
 */
export function TabWithTooltip({ value, tip, children }: { value: string; tip: string; children: React.ReactNode }) {
  return (
    <TabsTrigger value={value}>
      {children}
      <TooltipProvider delay={150}>
        <Tooltip>
          <TooltipTrigger
            render={<span role="img" aria-label={tip} tabIndex={-1} />}
            className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground"
          >
            <Info className="size-3.5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-64 text-center leading-relaxed">
            {tip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TabsTrigger>
  );
}
