"use client";

import { useState } from "react";
import Link from "next/link";
import { Info, MailPlus, Plus, Route, UserCog, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewerFormSheet } from "@/features/reviewers/components/reviewer-form-sheet";
import { ReviewerRowMenu, ReviewerStatusChip } from "@/features/reviewers/components/reviewer-row-menu";
import { useReviewerActions } from "@/features/reviewers/components/use-reviewer-actions";
import { useReviewersPage } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { formatRelative } from "@/utils/format";

export default function ReviewersPage() {
  const [pageSize, setPageSize] = usePageSize();
  const [search, setSearch] = useUrlSearch("q");
  const { values, set } = useUrlParams({ page: "1" });
  const page = Math.max(1, Number(values.page) || 1);

  // Genuinely server-paginated and server-searched: page/limit/search go to
  // the API as-is, and `total` below is the backend's own count, not
  // something computed here from a separate fetch.
  const { data: pageResult, isLoading } = useReviewersPage({ page, limit: pageSize, search });
  const visible = pageResult?.reviewers ?? [];
  const total = pageResult?.pagination.total ?? 0;

  const actions = useReviewerActions();
  const [sheet, setSheet] = useState<{ open: boolean; reviewer: PublicReviewer | null }>({ open: false, reviewer: null });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Reviewer Accounts"
        description="Create and manage ARB reviewer accounts, control who receives new requests, and activate or deactivate access."
        actions={
          <Button onClick={() => setSheet({ open: true, reviewer: null })}>
            <Plus className="size-4" />
            Add reviewer
          </Button>
        }
      />

      {/*
        "Reviewers" is the backend's own paginated total — not computed here.
        The other three have no metrics endpoint yet, so they show N/A rather
        than a number worked out by filtering a fetched list on the frontend.
      */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Reviewers" value={total} icon={Users} accent="navy" hint="All accounts" />
        <StatCard label="Default reviewers" value="N/A" icon={Route} accent="gold" />
        <StatCard label="Pending invite" value="N/A" icon={MailPlus} accent="amber" />
        <StatCard label="Inactive" value="N/A" icon={UserX} accent="red" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, employee no…" className="sm:max-w-sm" />
        <p className="flex items-start gap-2 rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs text-foreground/90 sm:max-w-md">
          <Info className="mt-0.5 size-3.5 shrink-0 text-brand-gold" aria-hidden="true" />
          At least one Default Reviewer must remain. Turning off the last one asks you to pick a replacement.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={UserCog} title="No reviewers found" description="Try a different search, or add a new reviewer account." />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 max-w-[240px]">Reviewer</TableHead>
                  <TableHead className="max-w-[130px]">Employee no.</TableHead>
                  <TableHead className="max-w-[180px]">Designation</TableHead>
                  <TableHead className="max-w-[190px]">Receive new requests</TableHead>
                  <TableHead className="max-w-[150px]">Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((rev) => {
                  const receivePending = actions.pendingReceiveId === rev.id;
                  // A different reviewer's routing/login change is in flight — lock this
                  // row's own toggle until it settles, so two rows can't race the "at
                  // least one Default Reviewer" check against stale data.
                  const routingLocked = actions.routingLocked && !receivePending && actions.pendingLoginId !== rev.id;
                  return (
                    <TableRow key={rev.id} className={rev.loginEnabled ? "" : "opacity-70"}>
                      <TableCell className="pl-4 max-w-[240px]">
                        <Link href={`/reviewers/${rev.id}`} className="group flex items-center gap-3 min-w-0" title={`${rev.name} (${rev.email})`}>
                          <PersonAvatar name={rev.name} className="size-9 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground group-hover:underline">{rev.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{rev.email}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[130px] truncate" title={rev.employeeNumber}>{rev.employeeNumber}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate" title={rev.designation}>{rev.designation}</TableCell>
                      <TableCell className="max-w-[190px]">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={rev.receiveNewRequests}
                            disabled={!rev.loginEnabled || routingLocked || receivePending}
                            onCheckedChange={(checked) => actions.toggleReceive(rev, checked)}
                            aria-label={`Receive new requests for ${rev.name}`}
                            className={receivePending ? "opacity-60" : ""}
                          />
                          {receivePending ? (
                            <Spinner className="size-3.5 text-muted-foreground" />
                          ) : (
                            rev.receiveNewRequests && (
                              <span className="rounded-full bg-brand-gold/15 px-2 py-px text-[10px] font-bold tracking-wider text-brand-gold uppercase">Default</span>
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <ReviewerStatusChip reviewer={rev} />
                        {rev.lastLoginAt && <span className="mt-0.5 block text-[11px] text-muted-foreground truncate" title={`Seen ${formatRelative(rev.lastLoginAt)}`}>Seen {formatRelative(rev.lastLoginAt)}</span>}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <ReviewerRowMenu
                          reviewer={rev}
                          onEdit={() => setSheet({ open: true, reviewer: rev })}
                          onReset={() => actions.sendReset(rev)}
                          onChangePassword={() => actions.changePassword(rev)}
                          onResendInvite={() => actions.resendInvite(rev)}
                          onToggleLogin={() => actions.requestLoginChange(rev)}
                          resendPending={actions.pendingResendId === rev.id}
                          loginPending={actions.pendingLoginId === rev.id}
                          routingLocked={routingLocked}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => set({ page: String(p) })}
            onPageSizeChange={(n) => {
              setPageSize(n);
              set({ page: "1" });
            }}
          />
        </div>
      )}

      <ReviewerFormSheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))} reviewer={sheet.reviewer} />
      {actions.dialogs}
    </div>
  );
}
