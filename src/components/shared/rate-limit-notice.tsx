"use client";

import { CheckCircle2, Timer } from "lucide-react";

function format(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Shown above a form while a rate limit is running, then briefly when it is over. */
export function RateLimitNotice({ remaining, restored }: { remaining: number; restored: boolean }) {
  if (remaining > 0) {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900 auth-field-enter dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
      >
        <Timer className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Too many attempts</p>
          <p className="mt-0.5 text-muted-foreground">
            For your security, sign-in is paused. You can try again in{" "}
            <span className="font-semibold tabular-nums text-foreground" aria-label={`${m} minutes ${s} seconds`}>
              {format(remaining)}
            </span>
            .
          </p>
        </div>
      </div>
    );
  }
  if (restored) {
    return (
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-900 auth-field-enter dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p className="font-medium">You can try signing in again now.</p>
      </div>
    );
  }
  return null;
}
