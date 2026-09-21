import { CheckCircle2, Clock, Minus } from "lucide-react";
import { DEPOSIT_LABEL, REFUND_LABEL } from "@/lib/domain";
import { cn } from "@/utils/cn";

export function DepositChip({ deposit }: { deposit: DepositRecord }) {
  if (deposit.status === "not_required") {
    return <span className="text-xs text-muted-foreground">Not required</span>;
  }
  const received = deposit.status === "received";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        received
          ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      )}
    >
      {received ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
      {DEPOSIT_LABEL[deposit.status]}
      {deposit.amount !== undefined && <span className="opacity-80">· ${deposit.amount.toLocaleString()}</span>}
    </span>
  );
}

export function RefundChip({ refund }: { refund?: RefundRecord }) {
  if (!refund) return <span className="text-xs text-muted-foreground">—</span>;
  if (refund.outcome === "no_refund") {
    // A dash represents a *recorded* No Refund decision — always labelled.
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
        title="A reviewer recorded that no refund applies to this deposit."
      >
        <Minus className="size-3.5" aria-hidden="true" />
        <span aria-hidden="true">-</span>
        <span>No Refund</span>
      </span>
    );
  }
  const refunded = refund.outcome === "refunded";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        refunded
          ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      )}
    >
      {refunded ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
      {refunded ? REFUND_LABEL.refunded : "Awaiting refund"}
    </span>
  );
}
