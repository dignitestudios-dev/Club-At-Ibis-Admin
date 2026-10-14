"use client";

import { TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** A tab with a hover / focus tooltip that explains what the tab contains. */
export function TabWithTooltip({ value, tip, children }: { value: string; tip: string; children: React.ReactNode }) {
  return (
    <TooltipProvider delay={250}>
      <Tooltip>
        <TooltipTrigger render={<TabsTrigger value={value} />}>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64 text-center leading-relaxed">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
