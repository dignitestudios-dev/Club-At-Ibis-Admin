import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3.5 rounded-xl border border-dashed border-border/80 bg-white/70 dark:bg-card/70 px-6 py-12 text-center shadow-2xs",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
        <Icon className="size-6 text-primary/70" />
      </div>
      <div className="space-y-1">
        <p className="font-heading text-lg font-medium text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
