"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
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
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InView } from "@/components/shared/in-view";
import { StatCard, type StatAccent } from "@/components/shared/stat-card";
import type { DashboardChartData } from "@/features/dashboard/components/dashboard-charts";
import { useActivity, useNotifications, useRequests, useReviewers } from "@/hooks/use-admin-data";
import { useCurrentUser } from "@/hooks/use-current-user";
import { IN_FLIGHT, STATUS_LABEL, STATUS_ORDER, attentionBuckets } from "@/lib/domain";
import { formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

// Charts are code-split and only fetched/rendered when they scroll into view.
const DashboardCharts = dynamic(
  () => import("@/features/dashboard/components/dashboard-charts").then((m) => m.DashboardCharts),
  { ssr: false, loading: () => <ChartsSkeleton /> }
);
const DashboardInsights = dynamic(
  () => import("@/features/dashboard/components/dashboard-charts").then((m) => m.DashboardInsights),
  { ssr: false, loading: () => <InsightsSkeleton /> }
);

function ChartsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
    </div>
  );
}
function InsightsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

const STATUS_META: Record<RequestStatus, { icon: LucideIcon; accent: StatAccent }> = {
  submitted: { icon: FileInput, accent: "slate" },
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
  /** Solid accent used for the edge bar and icon tile. */
  bar: string;
  tile: string;
}

export default function DashboardOverview() {
  const user = useCurrentUser();
  const { data: requests, isLoading } = useRequests();
  const { data: reviewers } = useReviewers();
  const { data: activity } = useActivity();
  const { data: notifications } = useNotifications();

  const stats = useMemo(() => {
    const all = requests ?? [];
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<RequestStatus, number>;
    all.forEach((r) => (counts[r.status] += 1));

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(now, 5 - i)));
    const monthBars = months.map((start, i) => {
      const end = i === months.length - 1 ? new Date(8.64e15) : months[i + 1];
      const inMonth = all.filter((r) => {
        const d = new Date(r.submittedAt);
        return d >= start && d < end;
      });
      const closed = inMonth.filter((r) => r.status === "completed" || r.status === "approved").length;
      const stopped = inMonth.filter((r) => r.status === "rejected" || r.status === "withdrawn").length;
      return {
        label: format(start, "MMM"),
        parts: [
          { key: "closed", label: "Approved / completed", value: closed, color: "#059669" },
          { key: "active", label: "In progress", value: inMonth.length - closed - stopped, color: "#0284c7" },
          { key: "stopped", label: "Rejected / withdrawn", value: stopped, color: "#94a3b8" },
        ],
      };
    });

    const byCategory = new Map<string, number>();
    all.forEach((r) => byCategory.set(r.categoryName, (byCategory.get(r.categoryName) ?? 0) + 1));
    const topCategories = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ key: label, label, value }));

    const workload = (reviewers ?? [])
      .filter((r) => r.loginEnabled)
      .map((rev) => ({
        reviewer: rev,
        active: all.filter((r) => r.assignedReviewerId === rev.id && IN_FLIGHT.includes(r.status)).length,
        total: all.filter((r) => r.assignedReviewerId === rev.id).length,
      }))
      .sort((a, b) => b.active - a.active);

    const inProgress = STATUS_ORDER.filter((s) => IN_FLIGHT.includes(s)).reduce((sum, k) => sum + counts[k], 0);
    const chartData: DashboardChartData = { total: all.length, inProgress, counts, monthBars, topCategories, workload };
    return { total: all.length, counts, chartData, buckets: attentionBuckets(all) };
  }, [requests, reviewers]);

  const attention: AttentionItem[] = [
    {
      key: "unassigned",
      label: "Waiting in intake",
      count: stats.buckets.unassigned.length,
      icon: Inbox,
      hint: "Not yet taken or assigned by a default reviewer",
      href: "/assignments",
      bar: "bg-sky-500",
      tile: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
    },
    {
      key: "resubmitted",
      label: "Resubmitted",
      count: stats.buckets.resubmitted.length,
      icon: Repeat2,
      hint: "Corrections awaiting the assigned reviewer",
      href: "/requests?status=resubmitted",
      bar: "bg-purple-500",
      tile: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
    },
    {
      key: "approved",
      label: "Approved, not completed",
      count: stats.buckets.approvedPending.length,
      icon: ClipboardCheck,
      hint: "Deposit or final letter still outstanding",
      href: "/requests?status=approved",
      bar: "bg-emerald-500",
      tile: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    },
    {
      key: "refunds",
      label: "Refunds awaiting action",
      count: stats.buckets.refundsAwaiting.length,
      icon: Undo2,
      hint: "Withdrawn with a received deposit",
      href: "/requests?refund=awaiting",
      bar: "bg-amber-500",
      tile: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    },
  ];

  const attentionTotal = attention.reduce((s, a) => s + a.count, 0);

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
            A live view of every request, reviewer and category across the Architectural Review Board.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/requests" />}>
            <FileText className="size-4" />
            All requests &amp; export
          </Button>
          <Button nativeButton={false} render={<Link href="/categories/new" />} className="shadow-xs">
            <LayoutTemplate className="size-4" />
            New category
          </Button>
        </div>
      </div>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading" className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75 fill-mode-both">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="attention-heading" className="font-heading text-xl font-medium text-foreground">
              Needs attention
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
              Requests by current status
            </h2>
            <p className="text-xs text-muted-foreground">Select a status to open the filtered request list.</p>
          </div>
          <Link href="/requests" className="text-sm font-medium text-primary hover:underline dark:text-amber-300">
            View all {stats.total}
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATUS_ORDER.map((status) => {
              const meta = STATUS_META[status];
              return (
                <StatCard
                  key={status}
                  label={STATUS_LABEL[status]}
                  value={stats.counts[status]}
                  icon={meta.icon}
                  accent={meta.accent}
                  href={`/requests?status=${status}`}
                  hint={stats.total > 0 ? `${Math.round((stats.counts[status] / stats.total) * 100)}% of all requests` : undefined}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Charts — fetched and animated when they scroll into view */}
      <InView fallback={<ChartsSkeleton />}>
        <DashboardCharts data={stats.chartData} />
      </InView>

      <InView fallback={<InsightsSkeleton />}>
        <DashboardInsights data={stats.chartData} notifications={notifications ?? []} />
      </InView>

      {/* System activity */}
      <section>
        <Card className="shadow-2xs">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Recent system activity</CardTitle>
            <p className="text-xs text-muted-foreground">Account, category, routing and security changes</p>
            <CardAction>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/activity" />}>
                Full log
                <ArrowRight className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-2">
            <ul className="divide-y divide-border/70">
              {(activity ?? []).slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UserCog className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{a.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor.name} · {formatRelative(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
