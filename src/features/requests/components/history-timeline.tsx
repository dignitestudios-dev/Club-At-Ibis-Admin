import {
  Ban,
  Banknote,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileEdit,
  Flag,
  Mail,
  MailWarning,
  Minus,
  PlayCircle,
  ReceiptText,
  Repeat2,
  Send,
  UserCheck,
  UserCog,
  XCircle,
  Lock,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { formatDateTime, formatRelative } from "@/utils/format";

const EVENT_CONFIG: Record<HistoryEventType, { icon: LucideIcon; label: string; node: string }> = {
  submitted: { icon: Send, label: "Submitted", node: "bg-primary text-primary-foreground" },
  assigned: { icon: UserCheck, label: "Assigned", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  reassigned: { icon: UserCog, label: "Reassigned", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  review_started: { icon: PlayCircle, label: "Review started", node: "bg-sky-600 text-white" },
  item_accepted: { icon: CheckCheck, label: "Item accepted", node: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" },
  item_flagged: { icon: Flag, label: "Flagged", node: "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300" },
  revision_requested: { icon: FileEdit, label: "Revision requested", node: "bg-amber-500 text-white" },
  resubmitted: { icon: Repeat2, label: "Resubmitted", node: "bg-purple-600 text-white" },
  approved: { icon: CheckCircle2, label: "Approved", node: "bg-emerald-600 text-white" },
  rejected: { icon: XCircle, label: "Rejected", node: "bg-rose-600 text-white" },
  deposit_required: { icon: Banknote, label: "Deposit required", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  receipt_recorded: { icon: ReceiptText, label: "Receipt recorded", node: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" },
  letter_uploaded: { icon: FileCheck2, label: "Final letter uploaded", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  completed: { icon: ClipboardCheck, label: "Completed", node: "bg-teal-600 text-white" },
  letter_email: { icon: Mail, label: "Letter email", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  withdrawn: { icon: Ban, label: "Withdrawn", node: "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100" },
  refunded: { icon: Banknote, label: "Refunded", node: "bg-emerald-600 text-white" },
  no_refund: { icon: Minus, label: "No Refund", node: "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100" },
};

const ROLE_LABEL: Record<ActorRole, string> = {
  resident: "Resident",
  reviewer: "ARB Reviewer",
  super_admin: "Super Admin",
  system: "System",
};

/** Events are shown oldest → newest, per the request-history spec. */
export function HistoryTimeline({ events }: { events: HistoryEvent[] }) {
  const sorted = [...events].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return (
    <ol className="space-y-0">
      {sorted.map((event, index) => {
        const cfg = EVENT_CONFIG[event.type];
        const failed = event.type === "letter_email" && event.message.toLowerCase().includes("failed");
        const Icon = failed ? MailWarning : cfg.icon;
        const isLast = index === sorted.length - 1;

        return (
          <li key={event.id} className="group relative flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-card shadow-2xs transition-transform duration-200 group-hover:scale-110",
                  failed ? "bg-rose-600 text-white" : cfg.node,
                  isLast && "ring-4 ring-primary/20"
                )}
              >
                <Icon className="size-4" />
              </span>
              {!isLast && <span className="my-1.5 w-[2px] flex-1 bg-border" aria-hidden="true" />}
            </div>

            <div className={cn("min-w-0 flex-1 space-y-1.5", isLast ? "pb-1" : "pb-6")}>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{failed ? "Letter email failed" : cfg.label}</span>
                  {event.staffOnly && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-px text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
                      title="Staff-only record — not shown to the resident."
                    >
                      <Lock className="size-2.5" aria-hidden="true" />
                      Staff only
                    </span>
                  )}
                  {isLast && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase dark:bg-primary/20 dark:text-amber-300">
                      Latest
                    </span>
                  )}
                </div>
                <time
                  dateTime={event.createdAt}
                  title={formatDateTime(event.createdAt)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
                  {formatRelative(event.createdAt)}
                </time>
              </div>

              <p className="text-sm leading-relaxed text-foreground/85">{event.message}</p>
              {event.detail && (
                <p className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  {event.detail}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  By <span className="font-semibold text-foreground">{event.actor.name}</span>
                  <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium">{ROLE_LABEL[event.actor.role]}</span>
                </span>
                <span>{formatDateTime(event.createdAt)}</span>
              </div>
            </div>
          </li>
        );
      })}
      {sorted.length === 0 && <p className="text-sm text-muted-foreground">No history recorded.</p>}
    </ol>
  );
}
