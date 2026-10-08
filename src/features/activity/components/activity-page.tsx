"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { Download, KeyRound, LayoutTemplate, RefreshCw, Route, ScrollText, UserCog, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/pill-tabs";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivitiesPage } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams } from "@/hooks/use-url-params";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

export type ActivityType = "all" | "accounts" | "routing" | "categories" | "security";

export const ACTIVITY_META: Record<
  "accounts" | "routing" | "categories" | "security",
  { label: string; icon: LucideIcon; tone: string }
> = {
  accounts: {
    label: "Accounts",
    icon: UserCog,
    tone: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/70 dark:border-sky-800/60 text-sky-700 dark:text-sky-300",
  },
  routing: {
    label: "Routing",
    icon: Route,
    tone: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-800/60 text-purple-700 dark:text-purple-300",
  },
  categories: {
    label: "Categories",
    icon: LayoutTemplate,
    tone: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300",
  },
  security: {
    label: "Security",
    icon: KeyRound,
    tone: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/60 text-rose-700 dark:text-rose-300",
  },
};

export function getActivityMeta(typeOrCategory?: string) {
  const norm = (typeOrCategory || "").toLowerCase();
  if (norm === "accounts" || norm === "account") return ACTIVITY_META.accounts;
  if (norm === "routing") return ACTIVITY_META.routing;
  if (norm === "categories" || norm === "category") return ACTIVITY_META.categories;
  if (norm === "security") return ACTIVITY_META.security;
  if (norm === "export" || norm === "exports") {
    return {
      label: "Exports",
      icon: Download,
      tone: "bg-slate-100 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300",
    };
  }
  return ACTIVITY_META.accounts;
}

/** Links the actor who performed an activity to their own account page — never for the Super Admin, who has no account detail page in this app. */
export function activityActorHref(actor?: ActivityLogEntry["actor"]) {
  if (!actor?.id) return null;
  const role = (actor.role || "").toUpperCase();
  if (role === "REVIEWER") return `/reviewers/${actor.id}`;
  if (role === "RESIDENT") return `/residents/${actor.id}`;
  return null;
}

export function activityTargetHref(t?: ActivityLogEntry["target"]) {
  if (!t || !t.id) return null;
  const kind = (t.kind || "").toLowerCase();
  const role = (t.role || "").toUpperCase();

  if (kind === "reviewer" || (kind === "account" && role === "REVIEWER")) {
    return `/reviewers/${t.id}`;
  }
  if (kind === "resident" || (kind === "account" && role === "RESIDENT")) {
    return `/residents/${t.id}`;
  }
  if (kind === "category") {
    return `/categories/${t.id}/edit`;
  }
  if (kind === "request") {
    return `/requests/${t.id}`;
  }
  return null;
}

export function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d, yyyy");
}

/** Day-grouped list of activity entries (shared with the profile Activity tab). */
export function ActivityList({ entries, limit = entries.length }: { entries: ActivityLogEntry[]; limit?: number }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLogEntry[]>();
    entries.slice(0, limit).forEach((a) => {
      const timeStr = a.createdAt || a.occurredAt || new Date().toISOString();
      const key = format(new Date(timeStr), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), a]);
    });
    return [...map.entries()];
  }, [entries, limit]);

  return (
    <div className="space-y-8">
      {grouped.map(([day, list]) => (
        <section key={day} aria-label={dayLabel(new Date(`${day}T12:00:00`))}>
          <h2 className="mb-3 flex items-center gap-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {dayLabel(new Date(`${day}T12:00:00`))}
            <span className="h-px flex-1 bg-border" />
          </h2>
          <ul className="space-y-2.5">
            {list.map((a) => {
              const meta = getActivityMeta(a.category || a.type);
              const Icon = meta.icon;
              const href = activityTargetHref(a.target);
              const actorHref = activityActorHref(a.actor);
              const timeStr = a.createdAt || a.occurredAt || "";
              return (
                <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", meta.tone)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm leading-relaxed text-foreground">{a.message}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        By{" "}
                        {actorHref ? (
                          <Link href={actorHref} className="font-semibold text-foreground hover:text-primary hover:underline dark:hover:text-amber-300">
                            {a.actor.name}
                          </Link>
                        ) : (
                          <span className="font-semibold text-foreground">{a.actor.name}</span>
                        )}
                      </span>
                      {href && a.target && (
                        <Link href={href} className="font-medium text-primary hover:underline dark:text-amber-300">
                          {a.target.label}
                        </Link>
                      )}
                    </div>
                  </div>
                  {timeStr && (
                    <time dateTime={timeStr} className="shrink-0 text-xs whitespace-nowrap text-muted-foreground" title={formatDateTime(timeStr)}>
                      {format(new Date(timeStr), "h:mm a")}
                    </time>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "accounts", label: "Accounts" },
  { value: "routing", label: "Routing" },
  { value: "categories", label: "Categories" },
  { value: "security", label: "Security" },
];

export default function ActivityPage() {
  const toast = useToast();
  const { values, set } = useUrlParams({ type: "all", page: "1", limit: "50" });

  const categoryParam = values.type as ActivityType;
  const category: ActivityType =
    categoryParam === "accounts" ||
    categoryParam === "routing" ||
    categoryParam === "categories" ||
    categoryParam === "security"
      ? categoryParam
      : "all";

  const page = Math.max(1, Number(values.page) || 1);
  const [pageSize, setPageSize] = useState(() => Math.max(10, Number(values.limit) || 50));

  const { data: pageResult, isLoading, isFetching, refetch } = useActivitiesPage({
    type: category !== "all" ? category : undefined,
    page,
    limit: pageSize,
  });

  const rawActivities = pageResult?.activities ?? [];
  const total = pageResult?.pagination.total ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="System Activity"
        description="An audit trail of administrative changes. Every entry records the actual Super Admin who performed it."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await refetch();
                toast.success("Activity log refreshed");
              } catch {
                toast.error("Failed to refresh activity log");
              }
            }}
            disabled={isFetching}
            className="h-8 gap-1.5"
            aria-label="Refresh activity log"
            title="Refresh activity log"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        }
      />

      <FilterPills
        label="Activity type"
        value={category}
        onChange={(v) => set({ type: v, page: "1" })}
        options={TYPE_OPTIONS.map((opt) => ({
          value: opt.value,
          label: opt.label,
          count: category === opt.value ? total : undefined,
        }))}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : rawActivities.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity found" description="No activity recorded for this category yet." />
      ) : (
        <div className="space-y-8">
          <ActivityList entries={rawActivities} />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => set({ page: String(p) })}
            onPageSizeChange={(n) => {
              setPageSize(n);
              set({ page: "1", limit: String(n) });
            }}
          />
        </div>
      )}
    </div>
  );
}
