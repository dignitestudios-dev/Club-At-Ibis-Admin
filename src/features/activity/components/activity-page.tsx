"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { Download, KeyRound, LayoutTemplate, RefreshCw, Route, ScrollText, UserCog, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/pill-tabs";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivity } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

export const ACTIVITY_META: Record<ActivityCategory, { label: string; icon: LucideIcon; tone: string }> = {
  account: { label: "Accounts", icon: UserCog, tone: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/70 dark:border-sky-800/60 text-sky-700 dark:text-sky-300" },
  routing: { label: "Routing", icon: Route, tone: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-800/60 text-purple-700 dark:text-purple-300" },
  category: { label: "Categories", icon: LayoutTemplate, tone: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300" },
  security: { label: "Security", icon: KeyRound, tone: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/60 text-rose-700 dark:text-rose-300" },
  export: { label: "Exports", icon: Download, tone: "bg-slate-100 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300" },
};

export function activityTargetHref(t?: ActivityLogEntry["target"]) {
  if (!t) return null;
  if (t.kind === "reviewer") return `/reviewers/${t.id}`;
  if (t.kind === "resident") return `/residents/${t.id}`;
  if (t.kind === "category") return `/categories/${t.id}/edit`;
  if (t.kind === "request") return `/requests/${t.id}`;
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
      const key = format(new Date(a.createdAt), "yyyy-MM-dd");
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
              const meta = ACTIVITY_META[a.category];
              const Icon = meta.icon;
              const href = activityTargetHref(a.target);
              return (
                <li key={a.id} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border", meta.tone)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm leading-relaxed text-foreground">{a.message}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        By <span className="font-semibold text-foreground">{a.actor.name}</span>
                      </span>
                      {href && a.target && (
                        <Link href={href} className="font-medium text-primary hover:underline dark:text-amber-300">
                          {a.target.label}
                        </Link>
                      )}
                    </div>
                  </div>
                  <time dateTime={a.createdAt} className="shrink-0 text-xs whitespace-nowrap text-muted-foreground" title={formatDateTime(a.createdAt)}>
                    {format(new Date(a.createdAt), "h:mm a")}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function ActivityPage() {
  const toast = useToast();
  const { data, isLoading, isFetching, refetch } = useActivity();
  const [search, setSearch] = useUrlSearch("q");
  const { values, set } = useUrlParams({ type: "all", limit: "25" });
  const category: ActivityCategory | "all" = values.type in ACTIVITY_META ? (values.type as ActivityCategory) : "all";
  const limit = Math.max(25, Number(values.limit) || 25);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (a) =>
        (category === "all" || a.category === category) &&
        (!q || `${a.message} ${a.actor.name} ${a.target?.label ?? ""}`.toLowerCase().includes(q))
    );
  }, [data, category, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    (data ?? []).forEach((a) => (c[a.category] = (c[a.category] ?? 0) + 1));
    return c;
  }, [data]);

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
        onChange={(v) => set({ type: v, limit: "25" })}
        options={[
          { value: "all", label: "All activity", count: counts.all },
          ...(Object.entries(ACTIVITY_META) as [ActivityCategory, (typeof ACTIVITY_META)[ActivityCategory]][]).map(([value, m]) => ({
            value,
            label: m.label,
            count: counts[value] ?? 0,
          })),
        ]}
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search activity, people or targets…" className="sm:max-w-md" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity found" description="Try a different filter or search term." />
      ) : (
        <div className="space-y-8">
          <ActivityList entries={filtered} limit={limit} />
          {filtered.length > limit && (
            <div className="text-center">
              <Button variant="outline" onClick={() => set({ limit: String(limit + 25) })}>
                Load more ({filtered.length - limit} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
