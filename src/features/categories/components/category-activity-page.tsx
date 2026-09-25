"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Clock,
  Eye,
  GitCommitVertical,
  History,
  Layers,
  Pencil,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useCategory } from "@/hooks/use-admin-data";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

function formatRole(role?: string): string {
  if (!role) return "";
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  if (role === "STAFF") return "Staff";
  if (role === "SYSTEM") return "System";
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActivityTypeMeta(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("created") || normalized.includes("seeded")) {
    return {
      label: "Created",
      icon: Sparkles,
      containerCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  if (normalized.includes("archived")) {
    return {
      label: "Archived",
      icon: Archive,
      containerCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    };
  }
  if (normalized.includes("restored")) {
    return {
      label: "Restored",
      icon: RotateCcw,
      containerCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    };
  }
  return {
    label: "Version Published",
    icon: GitCommitVertical,
    containerCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  };
}

export function CategoryActivitySkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-4 w-36 rounded" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <Card className="shadow-2xs overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-3 space-y-1.5">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3.5 w-72 rounded" />
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4.5">
              <Skeleton className="size-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4.5 w-3/4 rounded" />
                <Skeleton className="h-3.5 w-1/3 rounded" />
              </div>
              <Skeleton className="h-8 w-28 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CategoryActivityPage({ id }: { id: string }) {
  const { data: category, isLoading } = useCategory(id);

  const activities = useMemo(() => {
    const list = category?.activityHistory ?? [];
    return [...list].sort((a, b) => {
      const timeA = new Date(a.occurredAt).getTime();
      const timeB = new Date(b.occurredAt).getTime();
      return timeB - timeA;
    });
  }, [category?.activityHistory]);

  if (isLoading) {
    return <CategoryActivitySkeleton />;
  }

  if (!category) {
    return (
      <EmptyState
        icon={History}
        title="Category not found"
        description="The category you requested could not be found or may have been removed."
        action={
          <Button nativeButton={false} render={<Link href="/categories" />}>
            Back to categories
          </Button>
        }
      />
    );
  }

  const currentVer = category.currentVersion ?? category.version ?? 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back Link */}
      <Link
        href={`/categories/${category.id}/edit`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to edit {category.name}
      </Link>

      {/* Header action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate font-heading text-xl sm:text-2xl font-medium text-foreground">
              {category.name}
            </h1>
            <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground uppercase">
              Form v{currentVer}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {activities.length} recorded event{activities.length === 1 ? "" : "s"} in this category&apos;s history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/categories/${category.id}/versions`} />}
          >
            <Layers className="size-4" />
            Form Versions
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/categories/${category.id}`} />}
          >
            <Eye className="size-4" />
            Preview Form
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/categories/${category.id}/edit`} />}
          >
            <Pencil className="size-4" />
            Edit Category
          </Button>
        </div>
      </div>

      {/* Activities Card */}
      <Card className="shadow-2xs overflow-hidden">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Activity History</CardTitle>
          <p className="text-xs text-muted-foreground">
            Complete chronological audit log of all publications, updates, and lifecycle events for this category.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={History}
                title="No activity recorded yet"
                description="Activity log entries will appear here whenever forms are published, updated, or archived."
              />
            </div>
          ) : (
            <ol className="divide-y divide-border/60">
              {activities.map((entry, index) => {
                const meta = getActivityTypeMeta(entry.type);
                const Icon = meta.icon;
                const roleLabel = formatRole(entry.actor?.role);
                const actorName = entry.actor?.displayName || "System";
                const isLatest = index === 0;

                return (
                  <li
                    key={entry.id || index}
                    className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                  >
                    {/* Event Icon */}
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs transition-transform group-hover:scale-105",
                        meta.containerCls
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>

                    {/* Event Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium leading-relaxed text-foreground break-words">
                        {entry.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <User className="size-3 text-muted-foreground" />
                          {actorName}
                        </span>
                        {roleLabel && (
                          <span className="rounded border border-border/70 bg-muted/60 px-1.5 py-px text-[10px] font-semibold text-muted-foreground uppercase">
                            {roleLabel}
                          </span>
                        )}
                        <span aria-hidden="true" className="text-muted-foreground/40">·</span>
                        <span className="capitalize">{meta.label}</span>
                        {isLatest && (
                          <span className="rounded-full bg-primary/10 px-2 py-px text-[10px] font-bold tracking-wider text-primary uppercase dark:text-amber-300">
                            Latest
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <time
                      className="shrink-0 text-right text-xs text-muted-foreground"
                      dateTime={entry.occurredAt}
                      title={formatDateTime(entry.occurredAt)}
                    >
                      <span className="block font-medium text-foreground">
                        {formatRelative(entry.occurredAt)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground/80">
                        {formatDateTime(entry.occurredAt)}
                      </span>
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
