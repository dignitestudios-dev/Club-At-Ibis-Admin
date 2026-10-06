import { Ban, CheckCircle2, CircleSlash, Clock } from "lucide-react";
import { cn } from "@/utils/cn";

export type WithdrawnRefund =
  | { state: "awaiting" }
  | { state: "refunded"; date?: string; amount?: string; by?: string | null }
  | { state: "no_refund"; explanation?: string | null; by?: string | null };

function prettyStage(stage?: string | null) {
  if (!stage) return null;
  const text = stage.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const REFUND_UI = {
  refunded: {
    label: "Deposit refunded",
    Icon: CheckCircle2,
    pill: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    value: "text-emerald-800 dark:text-emerald-300",
  },
  awaiting: {
    label: "Refund pending",
    Icon: Clock,
    pill: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    value: "text-amber-800 dark:text-amber-300",
  },
  no_refund: {
    label: "No refund",
    Icon: CircleSlash,
    pill: "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    value: "text-slate-700 dark:text-slate-300",
  },
} as const;

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground break-words [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/**
 * Status card for a withdrawn request: one card, no nesting. The title row carries the refund result as a
 * pill, the facts (when, at which stage, by whom, refund details) sit in a tidy row underneath.
 * Same card on the resident, reviewer and admin sides.
 */
export function WithdrawnNotice({
  withdrawnAt,
  withdrawnFrom,
  by,
  refund,
  audience,
  note,
}: {
  /** Already formatted, e.g. "Oct 5, 2026". */
  withdrawnAt?: string | null;
  withdrawnFrom?: string | null;
  by?: string | null;
  refund?: WithdrawnRefund;
  audience: "resident" | "staff";
  /** Extra sentence appended after the main line. */
  note?: string;
}) {
  const stage = prettyStage(withdrawnFrom);
  const ui = refund ? REFUND_UI[refund.state] : null;

  let refundValue: React.ReactNode = null;
  if (refund?.state === "refunded") {
    refundValue = (
      <>
        {[refund.amount, refund.date].filter(Boolean).join(" · ") || "Processed"}
        {audience === "staff" && refund.by && (
          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Recorded by {refund.by}</span>
        )}
      </>
    );
  } else if (refund?.state === "no_refund") {
    refundValue = (
      <>
        Deposit retained
        {refund.explanation && <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">{refund.explanation}</span>}
      </>
    );
  } else if (refund?.state === "awaiting") {
    refundValue = audience === "resident" ? "Awaiting processing" : "Outcome not recorded yet";
  }

  const facts = [
    withdrawnAt ? { label: "Withdrawn on", value: withdrawnAt } : null,
    stage ? { label: "While", value: stage } : null,
    by || audience === "resident" ? { label: "By", value: by || "You" } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <section
      role="status"
      aria-label="Request withdrawn"
      className="rounded-2xl border border-slate-300 bg-slate-100 p-4 sm:p-5 dark:border-slate-600/70 dark:bg-slate-800/60"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-2xs dark:bg-slate-700 dark:text-slate-200">
            <Ban className="size-4" aria-hidden="true" />
          </span>
          <h3 className="font-heading text-lg font-medium text-foreground">Request Withdrawn</h3>
        </div>
        {ui && (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", ui.pill)}>
            <ui.Icon className="size-3.5" aria-hidden="true" />
            {ui.label}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
        {audience === "resident"
          ? "Review and approval have stopped. No further action is needed from you."
          : "Review and completion processing has stopped."}{" "}
        Documents, earlier decisions and history are preserved.{note ? ` ${note}` : ""}
      </p>

      {(facts.length > 0 || refundValue) && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-300/80 pt-4 sm:grid-cols-4 dark:border-slate-600/60">
          {facts.map((f) => (
            <Fact key={f.label} label={f.label}>
              {f.value}
            </Fact>
          ))}
          {refundValue && (
            <Fact label="Refund" className="col-span-2 sm:col-span-1">
              <span className={ui?.value}>{refundValue}</span>
            </Fact>
          )}
        </dl>
      )}
    </section>
  );
}
