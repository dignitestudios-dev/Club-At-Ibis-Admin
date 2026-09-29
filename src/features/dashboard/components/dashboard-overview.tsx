"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileInput,
  FileText,
  FileX2,
  Inbox,
  LayoutTemplate,
  RefreshCcw,
  Repeat2,
  Undo2,
  UserCog,
  Ban,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, type StatAccent } from "@/components/shared/stat-card";
import { getActivityMeta, activityActorHref, activityTargetHref } from "@/features/activity/components/activity-page";
import { useAdminDashboard } from "@/features/dashboard/api/dashboard.queries";
import { useCurrentUser } from "@/hooks/use-current-user";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/domain";
import { formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

const STATUS_META: Record<RequestStatus, { icon: LucideIcon; accent: StatAccent }> = {
  submitted: { icon: FileInput, accent: "slate" },
  assigned: { icon: UserCog, accent: "blue" },
  under_review: { icon: Clock, accent: "blue" },
  changes_required: { icon: RefreshCcw, accent: "amber" },
  resubmitted: { icon: Repeat2, accent: "purple" },
  approved: { icon: CheckCircle2, accent: "emerald" },
  rejected: { icon: FileX2, accent: "red" },
  completed: { icon: FileCheck2, accent: "navy" },
  withdrawn: { icon: Ban, accent: "slate" },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

interface AttentionItem {
  key: string;
  label: string;
  count: number;
  icon: LucideIcon;
  hint: string;
  href: string;
  bar: string;
  tile: string;
}

export default function DashboardOverview() {
  const user = useCurrentUser();
  const { data, isLoading } = useAdminDashboard();

  const attentionData = data?.attention;
  const statusCounts = data?.requests.statusCounts ?? {};
  const total = data?.requests.total ?? 0;
  const recentActivity = data?.recentActivity ?? [];

  const attention: AttentionItem[] = [
    {
      key: "unassigned",
      label: "Waiting in intake",
      count: attentionData?.waitingInIntake ?? 0,
      icon: Inbox,
      hint: "Not yet taken or assigned by a default reviewer",
      href: "/assignments",
      bar: "bg-sky-500",
      tile: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
    },
    {
      key: "resubmitted",
      label: "Resubmitted",
      count: attentionData?.resubmitted ?? 0,
      icon: Repeat2,
      hint: "Corrections awaiting the assigned reviewer",
      href: "/requests?status=resubmitted",
      bar: "bg-purple-500",
      tile: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    },
    {
      key: "approved",
      label: "Approved, not completed",
      count: attentionData?.approvedNotCompleted ?? 0,
      icon: ClipboardCheck,
      hint: "Deposit or final letter still outstanding",
      href: "/requests?status=approved",
      bar: "bg-emerald-500",
      tile: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    },
    {
      key: "refunds",
      label: "Refunds awaiting action",
      count: attentionData?.refundsAwaitingAction ?? 0,
      icon: Undo2,
      hint: "Withdrawn with a received deposit",
      href: "/requests?refund=awaiting",
      bar: "bg-amber-500",
      tile: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    },
  ];

  const attentionTotal = attentionData?.total ?? attention.reduce((s, a) => s + a.count, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-in fade-in slide-in-from-top-3 duration-500">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-brand-gold uppercase">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="font-heading text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {greeting()}, {user?.firstName ?? "Administrator"}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A live view of every request across the Architectural Review Board.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/requests" />}>
            <FileText className="size-4" />
            All Requests &amp; Export
          </Button>
          <Button nativeButton={false} render={<Link href="/categories/new" />} className="shadow-xs">
            <LayoutTemplate className="size-4" />
            New Category
          </Button>
        </div>
      </div>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading" className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75 fill-mode-both">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="attention-heading" className="font-heading text-xl font-medium text-foreground">
              Needs Attention
            </h2>
            <p className="text-xs text-muted-foreground">Pending work stays here until the reviewer or resident resolves it.</p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
              attentionTotal > 0
                ? "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                : "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
            )}
          >
            {attentionTotal > 0 ? <AlertTriangle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
            {attentionTotal > 0 ? `${attentionTotal} open item${attentionTotal === 1 ? "" : "s"}` : "All clear"}
          </span>
        </div>

        <Card className="overflow-hidden shadow-2xs">
          <ul className="divide-y divide-border/70">
            {attention.map((a, i) => {
              const Icon = a.icon;
              const clear = !isLoading && a.count === 0;
              return (
                <li key={a.key} style={{ animationDelay: `${i * 60}ms` }} className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both">
                  <Link
                    href={a.href}
                    className="group relative flex items-center gap-4 px-4 py-4 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 sm:px-5"
                  >
                    <span aria-hidden="true" className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full", clear ? "bg-transparent" : a.bar)} />
                    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105", clear ? "border-border bg-muted text-muted-foreground" : a.tile)}>
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{a.label}</span>
                      <span className="block text-xs text-muted-foreground">{clear ? "Nothing waiting" : a.hint}</span>
                    </span>
                    <span
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-full px-3 font-heading text-lg font-semibold tabular-nums",
                        clear ? "bg-muted text-muted-foreground" : "bg-foreground/5 text-foreground"
                      )}
                    >
                      {isLoading ? "–" : a.count}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Status totals */}
      <section aria-labelledby="status-heading" className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 id="status-heading" className="font-heading text-xl font-medium text-foreground">
              Requests by Current Status
            </h2>
            <p className="text-xs text-muted-foreground">Select a status to open the filtered request list.</p>
          </div>
          <Link href="/requests" className="text-sm font-medium text-primary hover:underline dark:text-amber-300">
            View all {total}
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status];
              const count = statusCounts[status] ?? 0;
              return (
                <StatCard
                  key={status}
                  label={STATUS_LABEL[status]}
                  value={count}
                  icon={meta.icon}
                  accent={meta.accent}
                  href={`/requests?status=${status}`}
                  hint={total > 0 ? `${Math.round((count / total) * 100)}% of all requests` : undefined}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
                />
              );
            })}
          </div>
        )}
      </section>

      {/* System activity */}
      <section>
        <Card className="shadow-2xs">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Recent System Activity</CardTitle>
            <p className="text-xs text-muted-foreground">Account, category, routing and security changes</p>
            <CardAction>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/activity" />}>
                Full Log
                <ArrowRight className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-2">
            {!isLoading && recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent activity recorded.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {recentActivity.map((a) => {
                  const meta = getActivityMeta(a.category || a.type);
                  const Icon = meta.icon;
                  const href = activityTargetHref(a.target);
                  const actorHref = activityActorHref(a.actor);
                  return (
                    <li key={a.id} className="flex items-start gap-3 py-3">
                      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border", meta.tone)}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium text-foreground">{a.message}</p>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>
                            By{" "}
                            {actorHref ? (
                              <Link href={actorHref} className="font-semibold text-foreground hover:text-primary hover:underline dark:hover:text-amber-300">
                                {a.actor.name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-foreground">{a.actor.name}</span>
                            )}{" "}
                            · {formatRelative(a.createdAt)}
                          </span>
                          {href && a.target && (
                            <Link href={href} className="font-medium text-primary hover:underline dark:text-amber-300">
                              {a.target.label}
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
