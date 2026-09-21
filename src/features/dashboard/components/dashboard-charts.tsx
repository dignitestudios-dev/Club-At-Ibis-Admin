"use client";

import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { DonutChart, GrowBar, HBarList, StackedMonthBars, type MonthBar } from "@/features/dashboard/components/charts";
import { NotificationIcon } from "@/features/notifications/components/notification-icon";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/domain";
import { formatRelative } from "@/utils/format";

export interface WorkloadRow {
  reviewer: PublicReviewer;
  active: number;
  total: number;
}

export interface DashboardChartData {
  total: number;
  inProgress: number;
  counts: Record<RequestStatus, number>;
  monthBars: MonthBar[];
  topCategories: { key: string; label: string; value: number }[];
  workload: WorkloadRow[];
}

/** Pipeline donut + six-month trend. Loaded lazily when scrolled into view. */
export function DashboardCharts({ data }: { data: DashboardChartData }) {
  return (
    <section className="grid gap-5 lg:grid-cols-5">
      <Card className="shadow-2xs lg:col-span-2">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Pipeline health</CardTitle>
          <p className="text-xs text-muted-foreground">
            {data.inProgress} in progress · {data.total} all-time
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 pt-5 sm:flex-row lg:flex-col xl:flex-row">
          <DonutChart
            centerLabel="Requests"
            centerValue={data.total}
            segments={STATUS_ORDER.map((s) => ({
              key: s,
              label: STATUS_LABEL[s],
              value: data.counts[s],
              color: STATUS_COLOR[s],
            }))}
          />
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: STATUS_COLOR[s] }} />
                <span className="flex-1 truncate text-muted-foreground">{STATUS_LABEL[s]}</span>
                <span className="font-semibold tabular-nums text-foreground">{data.counts[s]}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-2xs lg:col-span-3">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Submissions · last 6 months</CardTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {[
              ["#059669", "Approved / completed"],
              ["#0284c7", "In progress"],
              ["#94a3b8", "Rejected / withdrawn"],
            ].map(([color, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <StackedMonthBars months={data.monthBars} />
        </CardContent>
      </Card>
    </section>
  );
}

/** Reviewer workload, popular categories and alerts. */
export function DashboardInsights({
  data,
  notifications,
}: {
  data: DashboardChartData;
  notifications: AdminNotification[];
}) {
  const maxActive = Math.max(1, ...data.workload.map((w) => w.active));
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      <Card className="shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Reviewer workload</CardTitle>
          <p className="text-xs text-muted-foreground">Active requests per assigned reviewer</p>
          <CardAction>
            <Link href="/reviewers" className="text-xs font-medium text-primary hover:underline dark:text-amber-300">
              Manage
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {data.workload.length === 0 && <p className="text-sm text-muted-foreground">No active reviewers.</p>}
          {data.workload.map(({ reviewer, active, total }, i) => (
            <Link key={reviewer.id} href={`/reviewers/${reviewer.id}`} className="group flex items-center gap-3">
              <PersonAvatar name={reviewer.name} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground group-hover:underline">{reviewer.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">{active}</span> active · {total} total
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <GrowBar fraction={active / maxActive} index={i} trackClassName="flex-1" />
                  {reviewer.receiveNewRequests && (
                    <span className="rounded-full bg-brand-gold/15 px-1.5 py-px text-[9px] font-bold tracking-wider text-brand-gold uppercase">
                      Default
                    </span>
                  )}
                </span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Popular categories</CardTitle>
          <p className="text-xs text-muted-foreground">Requests submitted, all time</p>
          <CardAction>
            <Link href="/categories" className="text-xs font-medium text-primary hover:underline dark:text-amber-300">
              Configure
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4">
          <HBarList rows={data.topCategories} />
        </CardContent>
      </Card>

      <Card className="shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Oversight alerts</CardTitle>
          <p className="text-xs text-muted-foreground">Latest activity that reached you</p>
          <CardAction>
            <Link href="/notifications" className="text-xs font-medium text-primary hover:underline dark:text-amber-300">
              View all
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {notifications.slice(0, 5).map((n) => (
            <Link key={n.id} href={n.requestId ? `/requests/${n.requestId}` : "/notifications"} className="group flex items-start gap-3">
              <NotificationIcon type={n.type} className="size-8 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground group-hover:underline">{n.title}</span>
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-brand-gold" />}
                </span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[10px] text-muted-foreground/80">{formatRelative(n.createdAt)}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
