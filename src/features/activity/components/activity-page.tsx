"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Download,
  FileText,
  KeyRound,
  LayoutTemplate,
  Loader2,
  RefreshCw,
  Route,
  ScrollText,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterPills } from "@/components/shared/pill-tabs";
import { ClearFiltersLink } from "@/components/shared/filter-sidebar";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInfiniteActivities,
  useResidents,
  useReviewers,
} from "@/hooks/use-admin-data";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams } from "@/hooks/use-url-params";
import { getTodayDateString, usableRange, validateDateRange } from "@/lib/date-range";
import { residentFullName } from "@/lib/domain";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

export type ActivityType = "all" | "accounts" | "routing" | "requests" | "categories" | "security";

export const ACTIVITY_META: Record<
  "accounts" | "routing" | "requests" | "categories" | "security",
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
  requests: {
    label: "Requests",
    icon: FileText,
    tone: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-800/60 text-amber-700 dark:text-amber-300",
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
  if (norm === "requests" || norm === "request") return ACTIVITY_META.requests;
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
  { value: "requests", label: "Requests" },
  { value: "categories", label: "Categories" },
  { value: "security", label: "Security" },
];

export default function ActivityPage() {
  const toast = useToast();
  const { values, set, resetAll } = useUrlParams({
    type: "all",
    from: "",
    to: "",
    reviewer: "all",
    resident: "all",
  });

  const categoryParam = values.type as ActivityType;
  const category: ActivityType =
    categoryParam === "accounts" ||
    categoryParam === "routing" ||
    categoryParam === "requests" ||
    categoryParam === "categories" ||
    categoryParam === "security"
      ? categoryParam
      : "all";

  const { data: reviewers } = useReviewers();
  const { data: residents } = useResidents();

  const reviewerById = useMemo(() => new Map((reviewers ?? []).map((r) => [r.id, r])), [reviewers]);
  const residentById = useMemo(() => new Map((residents ?? []).map((r) => [r.id, r])), [residents]);

  const from = values.from || "";
  const to = values.to || "";
  const reviewerId = values.reviewer || "all";
  const residentId = values.resident || "all";

  const today = getTodayDateString();
  const maxToDate = today;
  const maxFromDate = to || today;

  const dateError = validateDateRange(from, to);
  const range = usableRange(from, to);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteActivities({
    type: category !== "all" ? category : undefined,
    occurredFrom: range.from,
    occurredTo: range.to,
    reviewerId: reviewerId !== "all" ? reviewerId : undefined,
    residentId: residentId !== "all" ? residentId : undefined,
    limit: 20,
  });

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const rawActivities = useMemo(() => {
    const list = data?.pages.flatMap((p) => p.activities) ?? [];
    const seen = new Set<string>();
    return list.filter((a) => {
      if (!a?.id || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [data]);

  const total = data?.pages[0]?.pagination.total ?? rawActivities.length;

  const reviewerOptions = useMemo(
    () => [
      { label: "All Reviewers", value: "all" },
      ...(reviewers ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => ({ label: r.name, value: r.id })),
    ],
    [reviewers]
  );

  const residentOptions = useMemo(
    () => [
      { label: "All Residents", value: "all" },
      ...(residents ?? [])
        .slice()
        .sort((a, b) => residentFullName(a).localeCompare(residentFullName(b)))
        .map((r) => {
          const name = residentFullName(r);
          const label = r.residentIdNumber ? `${name} (${r.residentIdNumber})` : name;
          return { label, value: r.id };
        }),
    ],
    [residents]
  );

  const hasFilterValues = Boolean(from || to || reviewerId !== "all" || residentId !== "all");
  const hasAnyFilter = hasFilterValues || category !== "all";

  function clearAllFilters() {
    resetAll({
      type: "all",
      from: "",
      to: "",
      reviewer: "all",
      resident: "all",
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="System Activity"
        description="A complete record of administrative activity in the system. Each entry shows the change that was made, when it happened, and the Super Admin who made changes."
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
            <RefreshCw className={cn("size-3.5", isFetching && !isFetchingNextPage && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Sticky Bar for Tabs & Filters at Top of Page */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/95 backdrop-blur-md border-b border-border/80 shadow-2xs space-y-3">
        {/* Activity Category Tabs */}
        <FilterPills
          label="Activity type"
          value={category}
          onChange={(v) => set({ type: v })}
          options={TYPE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            count: category === opt.value ? total : undefined,
          }))}
          className="border-b-0 pb-0"
        />

        {/* Top Filter Controls */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Date Range: Occurred From / To */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-input bg-white dark:bg-card px-2.5 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Calendar className="size-3.5 shrink-0 text-muted-foreground mr-1.5" aria-hidden="true" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">From:</span>
                <Input
                  type="date"
                  value={from}
                  max={maxFromDate}
                  onChange={(e) => set({ from: e.target.value })}
                  aria-label="Occurred from date"
                  aria-invalid={!!dateError}
                  className="h-9 w-32 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
              <span className="text-muted-foreground/60 px-1">—</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">To:</span>
                <Input
                  type="date"
                  value={to}
                  min={from || undefined}
                  max={maxToDate}
                  onChange={(e) => set({ to: e.target.value })}
                  aria-label="Occurred to date"
                  aria-invalid={!!dateError}
                  className="h-9 w-32 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {/* Reviewer Dropdown */}
          <div className="w-full sm:w-52">
            <FilterCombobox
              label="Reviewer"
              hideLabel
              value={reviewerId}
              onChange={(nextReviewerId) => set({ reviewer: nextReviewerId })}
              options={reviewerOptions}
              placeholder="All Reviewers"
              className="space-y-0"
            />
          </div>

          {/* Resident Dropdown */}
          <div className="w-full sm:w-56">
            <FilterCombobox
              label="Resident"
              hideLabel
              value={residentId}
              onChange={(nextResidentId) => set({ resident: nextResidentId })}
              options={residentOptions}
              placeholder="All Residents"
              className="space-y-0"
            />
          </div>

          {/* Clear Filters Link */}
          {hasAnyFilter && (
            <div className="flex items-center pl-1">
              <ClearFiltersLink onClick={clearAllFilters} />
            </div>
          )}
        </div>

        {dateError && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive pt-0.5">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {dateError}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="We couldn't load the activity log" onRetry={() => void refetch()} retrying={isFetching} />
      ) : rawActivities.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No activity found"
          description={
            hasAnyFilter
              ? "No activity matches the current filters. Try resetting or adjusting your filter criteria."
              : "No activity recorded for this category yet."
          }
          action={
            hasAnyFilter ? (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          <ActivityList entries={rawActivities} />

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />

          {isFetchingNextPage && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground" aria-live="polite">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Loading more activity...</span>
            </div>
          )}

          {!hasNextPage && rawActivities.length > 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              You have reached the end of the activity log.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
