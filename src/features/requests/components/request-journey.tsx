import { Check, Minus, X } from "lucide-react";
import { cn } from "@/utils/cn";

type StepState = "done" | "current" | "todo" | "skipped" | "stopped";

interface Step {
  key: string;
  label: string;
  state: StepState;
  detail?: string;
}

function journey(req: RequestRecord): Step[] {
  const reviewed = req.status !== "submitted";
  const decided = ["approved", "completed", "rejected"].includes(req.status) || !!req.decidedAt;
  const rejected = req.status === "rejected";
  const withdrawnEarly = req.status === "withdrawn" && !req.decidedAt;
  const hasDeposit = req.deposit.required;

  const steps: Step[] = [
    { key: "submitted", label: "Submitted", state: "done" },
    {
      key: "assigned",
      label: "Assigned",
      state: req.assignedReviewerId ? "done" : withdrawnEarly ? "stopped" : "current",
    },
    {
      key: "review",
      label: "Review",
      state: decided
        ? "done"
        : req.status === "withdrawn"
          ? "stopped"
          : reviewed || req.assignedReviewerId
            ? "current"
            : "todo",
      detail: req.status === "changes_required" ? "Changes required" : req.status === "resubmitted" ? "Resubmitted" : undefined,
    },
    {
      key: "decision",
      label: rejected ? "Rejected" : "Decision",
      state: rejected ? "stopped" : decided ? "done" : req.status === "withdrawn" ? "stopped" : "todo",
      detail: rejected ? "Closed" : undefined,
    },
    {
      key: "deposit",
      label: "Deposit",
      state: rejected
        ? "skipped"
        : !decided
          ? req.status === "withdrawn"
            ? "stopped"
            : "todo"
          : !hasDeposit
            ? "skipped"
            : req.deposit.status === "received"
              ? "done"
              : "current",
      detail: !hasDeposit && decided ? "Not required" : undefined,
    },
    {
      key: "letter",
      label: "Final letter",
      state: rejected ? "skipped" : req.approvalLetter ? "done" : decided && req.status !== "withdrawn" ? "current" : req.status === "withdrawn" ? "stopped" : "todo",
    },
    {
      key: "completed",
      label: "Completed",
      state: rejected ? "skipped" : req.completedAt ? "done" : req.status === "withdrawn" ? "stopped" : "todo",
    },
  ];

  // A withdrawn-after-completion request keeps its completed record.
  if (req.status === "withdrawn" && req.completedAt) {
    steps.forEach((s) => {
      if (s.state === "stopped") s.state = "done";
    });
  }
  return steps;
}

export function RequestJourney({ request }: { request: RequestRecord }) {
  const steps = journey(request);
  const withdrawn = request.status === "withdrawn";

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Request journey</p>
        {withdrawn && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Withdrawn — processing stopped
          </span>
        )}
      </div>
      <ol className="grid grid-cols-2 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
        {steps.map((step, i) => (
          <li key={step.key} className="relative flex flex-col items-center gap-1.5 text-center">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-4 left-1/2 hidden h-0.5 w-full lg:block",
                  step.state === "done" ? "bg-emerald-500" : "bg-border"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                step.state === "done" && "border-emerald-500 bg-emerald-500 text-white",
                step.state === "current" && "border-primary bg-card text-primary ring-4 ring-primary/15 dark:border-amber-400 dark:text-amber-300 dark:ring-amber-400/20",
                step.state === "todo" && "border-border bg-card text-muted-foreground",
                step.state === "skipped" && "border-dashed border-border bg-muted text-muted-foreground",
                step.state === "stopped" && "border-rose-400 bg-rose-50 text-rose-600 dark:bg-rose-950/50"
              )}
            >
              {step.state === "done" ? (
                <Check className="size-4" aria-hidden="true" />
              ) : step.state === "skipped" ? (
                <Minus className="size-4" aria-hidden="true" />
              ) : step.state === "stopped" ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                i + 1
              )}
            </span>
            <span className={cn("text-xs font-semibold", step.state === "todo" || step.state === "skipped" ? "text-muted-foreground" : "text-foreground")}>
              {step.label}
            </span>
            {step.detail && <span className="-mt-1 text-[10px] text-muted-foreground">{step.detail}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
