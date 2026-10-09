import {
  Ban,
  Banknote,
  Eye,
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
  HandCoins,
  MailCheck,
  PenLine,
  RefreshCw,
} from "lucide-react";
import { ExpandableText } from "@/components/shared/expandable-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatDateTime, formatRelative } from "@/utils/format";
import { describeEvent, titleCase, type EventFile } from "@/lib/history-event-info";

const EVENT_CONFIG: Record<HistoryEventType, { icon: LucideIcon; label: string; node: string }> = {
  submitted: { icon: Send, label: "Submitted", node: "bg-primary text-primary-foreground" },
  assigned: { icon: UserCheck, label: "Assigned", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  reassigned: { icon: UserCog, label: "Reassigned", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  review_started: { icon: PlayCircle, label: "Review Started", node: "bg-sky-600 text-white" },
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
  refund_awaiting: { icon: Clock, label: "Awaiting refund", node: "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300" },
  refunded: { icon: Banknote, label: "Refunded", node: "bg-emerald-600 text-white" },
  no_refund: { icon: Minus, label: "No Refund", node: "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100" },
  deposit_configured: { icon: Banknote, label: "Deposit set", node: "bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300" },
  deposit_received: { icon: Banknote, label: "Deposit received", node: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" },
  deposit_receipt_recorded: { icon: ReceiptText, label: "Deposit receipt recorded", node: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300" },
  final_letter_uploaded: { icon: FileCheck2, label: "Final letter added", node: "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300" },
  completion_email_sent: { icon: MailCheck, label: "Completion email sent", node: "bg-emerald-600 text-white" },
  completion_email_failed: { icon: MailWarning, label: "Completion email failed", node: "bg-rose-600 text-white" },
  completion_email_retry_requested: { icon: RefreshCw, label: "Email retry requested", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" },
  refund_outcome_recorded: { icon: HandCoins, label: "Refund outcome recorded", node: "bg-emerald-600 text-white" },
  refund_outcome_corrected: { icon: PenLine, label: "Refund outcome corrected", node: "bg-amber-500 text-white" },
};

const ROLE_LABEL: Record<ActorRole, string> = {
  resident: "Resident",
  reviewer: "ARB Reviewer",
  super_admin: "Super Admin",
  system: "System",
};

export function HistoryTimeline({
  events,
  onViewFile,
}: {
  events: HistoryEvent[];
  /** Opens the file a receipt / letter event refers to. Omit to hide the button. */
  onViewFile?: (file: EventFile) => void;
}) {
  const list = events ?? [];

  return (
    <ol className="space-y-0">
      {list.map((event, index) => {
        const cfg = EVENT_CONFIG[event.type] || { icon: Send, label: event.type?.replace(/_/g, " ") || "Update", node: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200" };
        const failed = event.type === "letter_email" && event.message.toLowerCase().includes("failed");
        const Icon = failed ? MailWarning : cfg.icon;
        const info = describeEvent(event.type, event.details, "staff");
        const isLatest = index === 0;
        const isLast = index === list.length - 1;
        const roleLabel = ROLE_LABEL[event.actor?.role] || event.actor?.role || "User";
        const actorName = event.actor?.name || "User";

        return (
          <li key={event.id} className="group relative flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-card shadow-2xs transition-transform duration-200 group-hover:scale-110",
                  failed ? "bg-rose-600 text-white" : cfg.node,
                  isLatest && "ring-4 ring-primary/20"
                )}
              >
                <Icon className="size-4" />
              </span>
              {!isLast && <span className="my-1.5 w-[2px] flex-1 bg-border" aria-hidden="true" />}
            </div>

            <div className={cn("min-w-0 flex-1 space-y-1.5", isLast ? "pb-1" : "pb-6")}>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{titleCase(failed ? "Letter email failed" : (info.title ?? cfg.label))}</span>
                  {event.staffOnly && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-50 px-2 py-px text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
                      title="Staff-only record. Not visible to residents."
                    >
                      <Lock className="size-2.5" aria-hidden="true" />
                      Staff only
                    </span>
                  )}
                  {isLatest && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-primary uppercase dark:bg-primary/20 dark:text-amber-300">
                      LATEST
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

              <p className="text-sm leading-relaxed text-foreground/85 break-words">{event.message}</p>
              {info.lines.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs leading-relaxed">
                  {info.lines.map((line, i) => (
                    <li
                      key={i}
                      className={cn(
                        "break-words [overflow-wrap:anywhere]",
                        line.tone === "good" && "font-medium text-emerald-800 dark:text-emerald-300",
                        line.tone === "warn" && "font-semibold text-amber-900 dark:text-amber-300",
                        line.tone === "bad" && "font-medium text-rose-700 dark:text-rose-300",
                        (!line.tone || line.tone === "neutral") && "text-muted-foreground"
                      )}
                    >
                      {line.text}
                    </li>
                  ))}
                </ul>
              )}
              {info.file && onViewFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="gap-1.5"
                  onClick={() => onViewFile(info.file!)}
                  aria-label={`View ${info.file.kind === "receipt" ? "receipt" : "letter"} ${info.file.name}`}
                >
                  <Eye className="size-3.5" aria-hidden="true" />
                  {info.file.kind === "receipt" ? "View receipt" : "View letter"}
                </Button>
              )}
              {event.detail && (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs leading-relaxed break-words [overflow-wrap:anywhere]",
                    event.type === "item_flagged"
                      ? "border-amber-300/80 bg-amber-50/90 text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200"
                      : event.type === "rejected"
                        ? "border-rose-300/70 bg-rose-50 text-rose-900/90 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300/90"
                        : "border-border/70 bg-muted/40 text-muted-foreground"
                  )}
                >
                  {event.type === "item_flagged" && (
                    <span className="font-semibold block mb-0.5 text-amber-800 dark:text-amber-300">Correction Note:</span>
                  )}
                  {event.type === "rejected" && (
                    <span className="mb-0.5 flex items-center gap-1.5 font-semibold text-rose-950 dark:text-rose-200">
                      <XCircle className="size-3.5 shrink-0" aria-hidden="true" />
                      Rejection reason
                    </span>
                  )}
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"><ExpandableText text={event.detail} limit={160} /></p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  By <span className="font-semibold text-foreground">{actorName}</span>
                  <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium">{roleLabel}</span>
                </span>
                <span>{formatDateTime(event.createdAt)}</span>
              </div>
            </div>
          </li>
        );
      })}
      {list.length === 0 && <p className="text-sm text-muted-foreground">No history recorded.</p>}
    </ol>
  );
}
