import { Banknote, CheckCircle2, CircleSlash, Clock, ReceiptText } from "lucide-react";
import { cn } from "@/utils/cn";

interface ProcessingSubject {
  status: string;
  deposit?: { status?: string | null; required?: boolean | null } | null;
  depositRequired?: boolean | null;
  depositReceived?: boolean | null;
  refund?: { outcome?: string | null } | null;
  refundStatus?: string | null;
}

type ProcessingState = "deposit_required" | "deposit_submitted" | "refund_pending" | "refunded" | "no_refund";

/**
 * The money side of a request, in one place:
 *  - approved + deposit required  -> "Deposit required" until the receipt is in, then "Deposit submitted"
 *  - completed                    -> nothing (the status says it all)
 *  - withdrawn + deposit received -> "Refund pending", then "Refunded" / "No refund"
 */
function processingState(req: ProcessingSubject): ProcessingState | null {
  const depositReceived = req.deposit?.status === "received" || req.depositReceived === true;

  if (req.status === "approved") {
    const required = req.deposit?.required ?? req.depositRequired;
    if (required !== true) return null;
    return depositReceived ? "deposit_submitted" : "deposit_required";
  }

  if (req.status === "withdrawn") {
    if (!depositReceived) return null;
    const outcome = req.refund?.outcome ?? req.refundStatus ?? null;
    if (outcome === "refunded") return "refunded";
    if (outcome === "no_refund") return "no_refund";
    return "refund_pending";
  }

  return null;
}

/** A withdrawn request whose received deposit still has no recorded refund outcome. */
export function isRefundPending(req: ProcessingSubject): boolean {
  return processingState(req) === "refund_pending";
}

const UI = {
  deposit_required: {
    label: "Deposit required",
    Icon: Banknote,
    cls: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200",
    title: "A security deposit is required for this approved request.",
  },
  deposit_submitted: {
    label: "Deposit submitted",
    Icon: ReceiptText,
    cls: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    title: "The deposit receipt has been recorded.",
  },
  refund_pending: {
    label: "Refund pending",
    Icon: Clock,
    cls: "border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-950/70 dark:text-amber-200",
    title: "The deposit was received before withdrawal. A refund outcome still has to be recorded.",
  },
  refunded: {
    label: "Refunded",
    Icon: CheckCircle2,
    cls: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    title: "The deposit was refunded.",
  },
  no_refund: {
    label: "No refund",
    Icon: CircleSlash,
    cls: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    title: "No refund: the deposit was retained or is non-refundable.",
  },
} as const;

/**
 * Deposit / refund marker for request lists. `chip` (default) is a compact pill for table cells;
 * `strip` is a full-width line for cards, so it never competes with the reference and status badge.
 */
export function ProcessingChip({
  request,
  variant = "chip",
  className,
}: {
  request: ProcessingSubject;
  variant?: "chip" | "strip";
  className?: string;
}) {
  const state = processingState(request);
  if (!state) return null;
  const { label, Icon, cls, title } = UI[state];

  if (variant === "strip") {
    return (
      <div
        className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold", cls, className)}
        title={title}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-px text-[11px] font-semibold whitespace-nowrap",
        cls,
        className
      )}
      title={title}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
