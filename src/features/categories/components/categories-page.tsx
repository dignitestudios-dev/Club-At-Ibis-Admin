"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  History,
  FileUp,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Type,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/pill-tabs";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchiveCategory, useCategories, useRequests, useRestoreCategory } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { IN_FLIGHT } from "@/lib/domain";
import { formatDate, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function CategoriesPage() {
  const toast = useToast();
  const { data: categories, isLoading } = useCategories();
  const { data: requests } = useRequests();
  const archive = useArchiveCategory();
  const restore = useRestoreCategory();

  const { values, set } = useUrlParams({ tab: "active" });
  const tab: "active" | "archived" = values.tab === "archived" ? "archived" : "active";
  const setTab = (t: "active" | "archived") => set({ tab: t });
  const [search, setSearch] = useUrlSearch("q");
  const [archiving, setArchiving] = useState<Category | null>(null);
  const [restoring, setRestoring] = useState<Category | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    (requests ?? []).forEach((r) => {
      const u = map.get(r.categoryId) ?? { total: 0, active: 0 };
      u.total += 1;
      if (IN_FLIGHT.includes(r.status)) u.active += 1;
      map.set(r.categoryId, u);
    });
    return map;
  }, [requests]);

  const all = categories ?? [];
  const activeCount = all.filter((c) => c.status === "active").length;
  const archivedCount = all.filter((c) => c.status === "archived").length;
  const q = search.trim().toLowerCase();
  const shown = all
    .filter((c) => c.status === tab)
    .filter((c) => !q || `${c.name} ${c.description}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Categories & Forms"
        description="Define the categories residents can request and the form each one collects. Changes apply to new requests only — existing submissions keep their original form."
        actions={
          <Button nativeButton={false} render={<Link href="/categories/new" />}>
            <Plus className="size-4" />
            Add category
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs
          label="Category status"
          value={tab}
          onChange={setTab}
          options={[
            { value: "active", label: "Active", count: activeCount },
            { value: "archived", label: "Archived", count: archivedCount },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" className="sm:max-w-xs" />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={tab === "archived" ? Archive : LayoutTemplate}
          title={tab === "archived" ? "No archived categories" : "No categories found"}
          description={
            tab === "archived"
              ? "Archived categories appear here. Their historical requests stay searchable and can be restored at any time."
              : "Try a different search or add a new category."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((cat, i) => {
            const u = usage.get(cat.id) ?? { total: 0, active: 0 };
            const docs = cat.fields.filter((f) => f.type === "file");
            const info = cat.fields.filter((f) => f.type !== "file");
            const archived = cat.status === "archived";
            return (
              <article
                key={cat.id}
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
                  "hover:-translate-y-1 hover:shadow-md",
                  archived && "bg-muted/30"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100",
                    archived ? "from-slate-300 to-slate-400" : "from-brand-gold to-amber-600"
                  )}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex w-full items-center justify-between gap-1.5">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                        archived
                          ? "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          : "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      )}
                    >
                      {archived ? "Archived" : "Active"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${cat.name}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem render={<Link href={`/categories/${cat.id}/edit`} />}>
                          <Pencil />
                          Edit form
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link href={`/categories/${cat.id}/versions`} />}>
                          <History />
                          Version history ({cat.versions.length})
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link href={`/requests?category=${cat.id}`} />}>
                          <LayoutTemplate />
                          View its requests
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {archived ? (
                          <DropdownMenuItem onClick={() => setRestoring(cat)}>
                            <ArchiveRestore />
                            Restore category
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem variant="destructive" onClick={() => setArchiving(cat)}>
                            <Archive />
                            Archive category
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-4 flex-1 space-y-1.5">
                  <h3 className="font-heading text-lg font-medium text-foreground">{cat.name}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{cat.description || "No description."}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    <Type className="size-3" /> {info.length} info field{info.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    <FileUp className="size-3" /> {docs.length} document{docs.length === 1 ? "" : "s"}
                  </span>
                  <Link href={`/categories/${cat.id}/versions`} title="View version history" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                    <History className="size-3" aria-hidden="true" />v{cat.version}
                  </Link>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground tabular-nums">{u.total}</span> request{u.total === 1 ? "" : "s"}
                    {u.active > 0 && <> · <span className="text-sky-700 dark:text-sky-300">{u.active} in progress</span></>}
                  </span>
                  <span title={formatDate(archived && cat.archivedAt ? cat.archivedAt : cat.updatedAt)}>
                    {archived && cat.archivedAt ? "Archived" : "Updated"} {formatRelative(archived && cat.archivedAt ? cat.archivedAt : cat.updatedAt)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Archive confirmation */}
      <ConfirmDialog
        open={!!archiving}
        onOpenChange={(o) => !o && setArchiving(null)}
        title={`Archive “${archiving?.name}”?`}
        description={`It will be removed from new-request selection. Existing requests (${usage.get(archiving?.id ?? "")?.total ?? 0}) continue their normal processing, the original name and history are preserved, and the category stays available in search and filters. You can restore it at any time.`}
        confirmLabel="Archive category"
        destructive
        loading={archive.isPending}
        onConfirm={() => {
          if (!archiving) return;
          const target = archiving;
          archive.mutate(target.id, {
            onSuccess: () => {
              toast.success("Category archived", `“${target.name}” is no longer available for new requests.`);
              setArchiving(null);
            },
            onError: (e: Error) => toast.error("Could not archive", e.message),
          });
        }}
      />

      {/* Restore confirmation */}
      <ConfirmDialog
        open={!!restoring}
        onOpenChange={(o) => !o && setRestoring(null)}
        title={`Restore “${restoring?.name}”?`}
        description="The category becomes Active and available for new requests again. Its saved form configuration is retained, and all existing requests, documents and history are preserved. The restoration is recorded in system activity."
        confirmLabel="Restore category"
        loading={restore.isPending}
        onConfirm={() => {
          if (!restoring) return;
          const target = restoring;
          restore.mutate(target.id, {
            onSuccess: () => {
              toast.success("Category restored", `“${target.name}” is Active again.`);
              setRestoring(null);
              setTab("active");
            },
            onError: (e: Error) => toast.error("Could not restore", e.message),
          });
        }}
      />

    </div>
  );
}
