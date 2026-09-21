"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FilePlus2, FileText, GitCommitVertical, History, Minus, Pencil, Plus, RotateCcw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { RequiredMark } from "@/components/shared/required-mark";
import { FIELD_TYPE_BY_ID, describeAccept, isChoiceType } from "@/features/categories/components/field-types";
import { useCategories, useRequests, useRestoreCategoryVersion } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams } from "@/hooks/use-url-params";
import { fieldDiffStates } from "@/lib/category-diff";
import { baseProjectFields } from "@/lib/mock/categories";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

function changeTone(text: string) {
  if (text.startsWith("Added")) return { icon: Plus, cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" };
  if (text.startsWith("Removed")) return { icon: Minus, cls: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" };
  if (text.startsWith("Restored")) return { icon: RotateCcw, cls: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" };
  if (text === "Initial form") return { icon: FilePlus2, cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" };
  return { icon: Pencil, cls: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" };
}

export default function CategoryVersionsPage({ id }: { id: string }) {
  const toast = useToast();
  const { data: categories, isLoading } = useCategories();
  const { data: requests } = useRequests();
  const restore = useRestoreCategoryVersion();
  const { values, set } = useUrlParams({ v: "" });
  const [confirming, setConfirming] = useState<number | null>(null);

  const category = categories?.find((c) => c.id === id);
  const versions = useMemo(() => [...(category?.versions ?? [])].sort((a, b) => b.version - a.version), [category]);
  const counts = useMemo(() => {
    const map = new Map<number, number>();
    (requests ?? []).filter((r) => r.categoryId === id).forEach((r) => map.set(r.formVersion, (map.get(r.formVersion) ?? 0) + 1));
    return map;
  }, [requests, id]);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-2xl" />;
  if (!category) {
    return (
      <EmptyState
        icon={History}
        title="Category not found"
        action={
          <Button nativeButton={false} render={<Link href="/categories" />}>
            Back to categories
          </Button>
        }
      />
    );
  }

  const selectedNumber = Number(values.v) || category.version;
  const selected = versions.find((v) => v.version === selectedNumber) ?? versions[0];
  const previous = versions.find((v) => v.version === selected.version - 1);
  const isCurrent = selected.version === category.version;
  const diff = fieldDiffStates(previous?.fields, selected.fields);
  const removed = previous ? previous.fields.filter((f) => !selected.fields.some((x) => x.id === f.id)) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Categories &amp; forms
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider text-brand-gold uppercase">Version history</p>
            <h1 className="font-heading text-2xl font-medium text-foreground sm:text-3xl">{category.name}</h1>
            <p className="text-sm text-muted-foreground">
              {versions.length} version{versions.length === 1 ? "" : "s"} · current is <span className="font-semibold text-foreground">v{category.version}</span>
            </p>
          </div>
        </div>
        <Button nativeButton={false} render={<Link href={`/categories/${category.id}/edit`} />}>
          <Pencil className="size-4" />
          Edit form (creates v{category.version + 1})
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Version list */}
        <Card className="shadow-2xs lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">All versions</CardTitle>
            <p className="text-xs text-muted-foreground">Every saved edit creates a new version. Earlier versions are never changed.</p>
          </CardHeader>
          <CardContent className="p-0">
            <ol className="max-h-[36rem] divide-y divide-border/60 overflow-y-auto custom-scrollbar">
              {versions.map((v) => {
                const active = v.version === selected.version;
                const used = counts.get(v.version) ?? 0;
                return (
                  <li key={v.version}>
                    <button
                      type="button"
                      onClick={() => set({ v: String(v.version) })}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative flex w-full items-start gap-3 px-5 py-4 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50",
                        active && "bg-primary/5 dark:bg-amber-400/5"
                      )}
                    >
                      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary dark:bg-amber-400" />}
                      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-bold", v.version === category.version ? "border-primary bg-primary text-primary-foreground dark:border-amber-400 dark:bg-amber-400 dark:text-[#0d1522]" : "border-border bg-muted text-muted-foreground")}>
                        v{v.version}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{v.version === 1 ? "Initial version" : `Version ${v.version}`}</span>
                          {v.version === category.version && (
                            <span className="rounded-full bg-emerald-50 px-2 py-px text-[10px] font-bold tracking-wider text-emerald-800 uppercase dark:bg-emerald-950/50 dark:text-emerald-300">Current</span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground" title={formatDateTime(v.createdAt)}>
                          {formatRelative(v.createdAt)} · {v.createdBy}
                        </span>
                        <span className="mt-1 block truncate text-xs text-foreground/80">{v.changes[0]}{v.changes.length > 1 ? ` +${v.changes.length - 1} more` : ""}</span>
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <FileText className="size-3" aria-hidden="true" />
                          {used} request{used === 1 ? "" : "s"} submitted on this version
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Selected version */}
        <div className="space-y-5 lg:col-span-3">
          <Card className="shadow-2xs">
            <CardHeader className="border-b border-border/70 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-lg font-medium">
                    Version {selected.version} {isCurrent && <span className="ml-1 text-sm font-normal text-emerald-700 dark:text-emerald-300">· current</span>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Saved {formatDateTime(selected.createdAt)} by {selected.createdBy}
                  </p>
                </div>
                {!isCurrent && (
                  <Button variant="outline" size="sm" onClick={() => setConfirming(selected.version)}>
                    <RotateCcw />
                    Restore as v{category.version + 1}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {selected.note && (
                <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground">
                  <Tag className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {selected.note}
                </p>
              )}

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <GitCommitVertical className="size-3.5" aria-hidden="true" />
                  {previous ? `Changes from v${previous.version}` : "What this version contains"}
                </p>
                <ul className="space-y-1.5">
                  {selected.changes.map((c, i) => {
                    const tone = changeTone(c);
                    const CI = tone.icon;
                    return (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border", tone.cls)}>
                          <CI className="size-3" aria-hidden="true" />
                        </span>
                        {c}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="font-heading text-lg font-medium">Form as residents saw it</CardTitle>
              <p className="text-xs text-muted-foreground">
                Standard project information first, then the {selected.fields.length} configured field{selected.fields.length === 1 ? "" : "s"}.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-3">
                {baseProjectFields.map((f) => (
                  <span key={f.id} className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs">
                    {f.label}
                    {f.required && <span className="ml-0.5 font-bold text-red-600 dark:text-red-400">*</span>}
                  </span>
                ))}
              </div>

              {selected.fields.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No additional fields in this version.</p>}
              <ol className="space-y-2.5">
                {selected.fields.map((f, i) => {
                  const meta = FIELD_TYPE_BY_ID.get(f.type)!;
                  const TI = meta.icon;
                  const state = diff.get(f.id);
                  return (
                    <li
                      key={f.id}
                      className={cn(
                        "flex gap-3 rounded-xl border bg-card p-3.5",
                        state === "added" ? "border-emerald-300/80 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20" : state === "changed" ? "border-amber-300/80 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20" : "border-border"
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{f.label}</span>
                          {f.required && <RequiredMark />}
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:text-amber-300">
                            <TI className="size-3" aria-hidden="true" />
                            {meta.label}
                          </span>
                          {state === "added" && <span className="rounded-full bg-emerald-100 px-2 py-px text-[10px] font-bold tracking-wider text-emerald-800 uppercase dark:bg-emerald-950 dark:text-emerald-300">New</span>}
                          {state === "changed" && <span className="rounded-full bg-amber-100 px-2 py-px text-[10px] font-bold tracking-wider text-amber-900 uppercase dark:bg-amber-950 dark:text-amber-300">Changed</span>}
                        </div>
                        {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                        {isChoiceType(f.type) && <p className="text-xs text-muted-foreground">Options: {(f.options ?? []).join(" · ")}</p>}
                        {f.type === "file" && (
                          <p className="text-xs text-muted-foreground">
                            {describeAccept(f.accept)}
                            {f.multiple ? " · multiple files" : ""}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {removed.length > 0 && (
                <div className="rounded-xl border border-rose-300/70 bg-rose-50/60 p-3.5 dark:border-rose-900/70 dark:bg-rose-950/20">
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-rose-800 uppercase dark:text-rose-300">Removed since v{previous?.version}</p>
                  <ul className="space-y-1 text-sm text-foreground/80">
                    {removed.map((f) => (
                      <li key={f.id} className="line-through decoration-rose-400/70">
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Restore v${confirming} as a new version?`}
        description={`This creates v${category.version + 1} with the form exactly as it was in v${confirming}. Version history is never overwritten, existing requests keep the version they were submitted on, and only new requests use the restored form.`}
        confirmLabel="Restore as new version"
        loading={restore.isPending}
        onConfirm={() => {
          if (confirming === null) return;
          const from = confirming;
          restore.mutate(
            { id: category.id, version: from },
            {
              onSuccess: (updated) => {
                toast.success("Version restored", `v${from} is now the current form as v${updated.version}.`);
                setConfirming(null);
                set({ v: String(updated.version) });
              },
              onError: (e: Error) => toast.error("Could not restore", e.message),
            }
          );
        }}
      />
    </div>
  );
}
