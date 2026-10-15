"use client";

import { BadgeCheck, CalendarClock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatDate, formatDateTime } from "@/utils/format";

const STATUS_META: Record<PermitStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  in_use: {
    label: "In use",
    className: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  expired: {
    label: "Expired",
    className: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

const TOTAL_REMINDERS = 3;

function actorName(actor: RequestPermit["usedBy"]): string | null {
  if (!actor) return null;
  if (typeof actor === "string") return actor;
  return actor.displayName || actor.name || null;
}

/** "Expires in 120 days" / "Expired 4 days ago", counted in whole days. */
function describeExpiry(expiresAt: string, status: PermitStatus): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return "";
  if (status === "expired" || days < 0) {
    const ago = Math.abs(days);
    return ago === 0 ? "Expired today" : `Expired ${ago} day${ago === 1 ? "" : "s"} ago`;
  }
  if (days === 0) return "Expires today";
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

interface PermitCardProps {
  permit: RequestPermit;
  /** Shown only to the assigned reviewer while the permit is active. */
  onMarkInUse?: () => void;
}

export function PermitCard({ permit, onMarkInUse }: PermitCardProps) {
  const meta = STATUS_META[permit.status] ?? STATUS_META.active;
  const reminders = Math.min(permit.reminderCount ?? 0, TOTAL_REMINDERS);
  const usedBy = actorName(permit.usedBy);

  return (
    <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
      <CardHeader className="border-b border-border/70 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium">
              <ShieldCheck className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              Permit
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              The final approval letter is valid for one year from completion.
            </p>
          </div>
          <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", meta.className)}>
            {meta.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        <Row label="Issued">{formatDate(permit.issuedAt)}</Row>
        <Row label="Expires">
          {formatDate(permit.expiresAt)}
          <span className="block text-xs font-normal text-muted-foreground">{describeExpiry(permit.expiresAt, permit.status)}</span>
        </Row>
        {permit.reminderCount !== undefined && (
          <Row label="Reminders sent">
            {reminders} of {TOTAL_REMINDERS}
            {permit.nextReminderAt && permit.status !== "expired" && reminders < TOTAL_REMINDERS && (
              <span className="block text-xs font-normal text-muted-foreground">Next on {formatDate(permit.nextReminderAt)}</span>
            )}
          </Row>
        )}
        {permit.status === "in_use" && (
          <Row label="Marked in use">
            {permit.usedAt ? formatDateTime(permit.usedAt) : "—"}
            {usedBy && <span className="block text-xs font-normal text-muted-foreground">by {usedBy}</span>}
          </Row>
        )}

        {onMarkInUse && permit.status === "active" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              Reminders go to the assigned reviewer at 3, 6 and 9 months.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onMarkInUse} className="gap-1.5">
              <BadgeCheck className="size-4" aria-hidden="true" />
              Mark as in use
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
