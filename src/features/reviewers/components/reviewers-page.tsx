"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, Info, Plus, Route, UserCog, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReviewerFormSheet } from "@/features/reviewers/components/reviewer-form-sheet";
import { ReviewerRowMenu, ReviewerStatusChip } from "@/features/reviewers/components/reviewer-row-menu";
import { useReviewerActions } from "@/features/reviewers/components/use-reviewer-actions";
import { useRequests, useReviewers } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { IN_FLIGHT } from "@/lib/domain";
import { formatRelative } from "@/utils/format";

export default function ReviewersPage() {
  const { data: reviewers, isLoading } = useReviewers();
  const { data: requests } = useRequests();
  const actions = useReviewerActions();

  const [search, setSearch] = useUrlSearch("q");
  const { values, set } = useUrlParams({ page: "1" });
  const [pageSize, setPageSize] = usePageSize();
  const [sheet, setSheet] = useState<{ open: boolean; reviewer: PublicReviewer | null }>({ open: false, reviewer: null });

  const workload = useMemo(() => {
    const map = new Map<string, number>();
    (requests ?? []).forEach((r) => {
      if (r.assignedReviewerId && IN_FLIGHT.includes(r.status)) {
        map.set(r.assignedReviewerId, (map.get(r.assignedReviewerId) ?? 0) + 1);
      }
    });
    return map;
  }, [requests]);

  const list = reviewers ?? [];
  const q = search.trim().toLowerCase();
  const filtered = list.filter((r) => !q || `${r.name} ${r.email} ${r.employeeNumber} ${r.designation}`.toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number(values.page) || 1), pages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const defaults = list.filter((r) => r.receiveNewRequests && r.loginEnabled).length;
  const intake = (requests ?? []).filter((r) => r.status === "submitted" && !r.assignedReviewerId).length;

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Reviewers" value={list.length} icon={Users} accent="navy" hint="All accounts" />
        <StatCard label="Default reviewers" value={defaults} icon={Route} accent="gold" hint="Receive new requests" />
        <StatCard label="In intake" value={intake} icon={Inbox} accent="blue" hint="Awaiting assignment" href="/requests?status=submitted&reviewer=unassigned" />
        <StatCard label="Inactive" value={list.filter((r) => !r.loginEnabled).length} icon={UserX} accent="red" hint="Cannot sign in" />
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
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCog} title="No reviewers found" description="Try a different search, or add a new reviewer account." />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Reviewer</TableHead>
                  <TableHead>Employee no.</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Receive new requests</TableHead>
                  <TableHead>Active requests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((rev) => (
                  <TableRow key={rev.id} className={rev.loginEnabled ? "" : "opacity-70"}>
                    <TableCell className="pl-4">
                      <Link href={`/reviewers/${rev.id}`} className="group flex items-center gap-3">
                        <PersonAvatar name={rev.name} className="size-9" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground group-hover:underline">{rev.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{rev.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{rev.employeeNumber}</TableCell>
                    <TableCell className="text-sm">{rev.designation}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={rev.receiveNewRequests}
                          disabled={!rev.loginEnabled || actions.pendingReceiveId === rev.id}
                          onCheckedChange={(checked) => actions.toggleReceive(rev, checked)}
                          aria-label={`Receive new requests for ${rev.name}`}
                        />
                        {rev.receiveNewRequests && (
                          <span className="rounded-full bg-brand-gold/15 px-2 py-px text-[10px] font-bold tracking-wider text-brand-gold uppercase">Default</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold tabular-nums">{workload.get(rev.id) ?? 0}</span>
                      {rev.lastLoginAt && <span className="block text-[11px] text-muted-foreground">Seen {formatRelative(rev.lastLoginAt)}</span>}
                    </TableCell>
                    <TableCell>
                      <ReviewerStatusChip reviewer={rev} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ReviewerRowMenu
                        reviewer={rev}
                        onEdit={() => setSheet({ open: true, reviewer: rev })}
                        onReset={() => actions.sendReset(rev)}
                        onChangePassword={() => actions.changePassword(rev)}
                        onResendInvite={() => actions.resendInvite(rev)}
                        onToggleLogin={() => actions.requestLoginChange(rev)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
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
