import { memo } from "react";
import { STATUS_LABEL } from "@/lib/domain";
import { cn } from "@/utils/cn";

const STATUS_STYLE: Record<RequestStatus, { className: string; dotClass: string; pulse?: boolean }> = {
  submitted: {
    className: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-600 dark:bg-slate-400",
  },
  under_review: {
    className: "bg-sky-50 dark:bg-sky-950/50 text-sky-950 dark:text-sky-200 border-sky-200 dark:border-sky-800 font-medium",
    dotClass: "bg-sky-600 dark:bg-sky-400",
    pulse: true,
  },
  changes_required: {
    className: "bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border-amber-300/80 dark:border-amber-700 font-medium",
    dotClass: "bg-amber-600 dark:bg-amber-400",
    pulse: true,
  },
  resubmitted: {
    className: "bg-purple-50 dark:bg-purple-950/50 text-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800 font-medium",
    dotClass: "bg-purple-600 dark:bg-purple-400",
    pulse: true,
  },
  approved: {
    className: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 border-emerald-300/80 dark:border-emerald-800 font-medium",
    dotClass: "bg-emerald-600 dark:bg-emerald-400",
  },
  rejected: {
    className: "bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-600 dark:bg-rose-400",
  },
  completed: {
    className: "bg-teal-50 dark:bg-teal-950/50 text-teal-950 dark:text-teal-200 border-teal-300/80 dark:border-teal-800 font-medium",
    dotClass: "bg-teal-600 dark:bg-teal-400",
  },
  withdrawn: {
    className: "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    dotClass: "bg-slate-400 dark:bg-slate-400",
  },
};

export const StatusBadge = memo(function StatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const config = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shadow-2xs transition-all",
        config.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dotClass, config.pulse && "animate-pulse")} />
      {STATUS_LABEL[status]}
    </span>
  );
});
