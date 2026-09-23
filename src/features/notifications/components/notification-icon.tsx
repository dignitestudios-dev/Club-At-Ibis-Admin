import { AlertTriangle, CheckCircle2, FilePlus2, Repeat2, UserX, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

const CONFIG: Record<AdminNotificationType, { icon: LucideIcon; className: string; label: string }> = {
  new_submission: {
    icon: FilePlus2,
    className: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/70 dark:border-sky-800/60 text-sky-700 dark:text-sky-300",
    label: "New submission",
  },
  resubmission: {
    icon: Repeat2,
    className: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-800/60 text-purple-700 dark:text-purple-300",
    label: "Resubmission",
  },
  request_update: {
    icon: CheckCircle2,
    className: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300",
    label: "Request update",
  },
  withdrawal: {
    icon: UserX,
    className: "bg-slate-100 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300",
    label: "Withdrawal",
  },
  action_required: {
    icon: AlertTriangle,
    className: "bg-amber-50 dark:bg-amber-950/40 border-amber-300/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-300",
    label: "Needs attention",
  },
};

export const NOTIFICATION_LABEL: Record<AdminNotificationType, string> = Object.fromEntries(
  Object.entries(CONFIG).map(([k, v]) => [k, v.label])
) as Record<AdminNotificationType, string>;

const FALLBACK_CONFIG = CONFIG.action_required;

export function NotificationIcon({ type, className }: { type: AdminNotificationType | string; className?: string }) {
  const conf = (CONFIG as Record<string, { icon: LucideIcon; className: string; label: string }>)[type] ?? FALLBACK_CONFIG;
  const { icon: Icon, className: tone } = conf;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", tone, className)}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}
