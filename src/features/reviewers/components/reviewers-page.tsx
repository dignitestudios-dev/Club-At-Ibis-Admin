"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, MailPlus, Plus, RotateCcw, Route, UserCog, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
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
import { useReviewers, useReviewersPage } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { formatRelative } from "@/utils/format";

export default function ReviewersPage() {
  const [pageSize, setPageSize] = usePageSize();
  const [search, setSearch] = useUrlSearch("q");
  const { values, set } = useUrlParams({ page: "1", status: "all", defaultReviewer: "all" });
  const page = Math.max(1, Number(values.page) || 1);
  const status = values.status || "all";
  const defaultReviewer = values.defaultReviewer || "all";

  // Server-paginated and server-searched/filtered
  const { data: pageResult, isLoading } = useReviewersPage({
    page,
    limit: pageSize,
    search,
    status: status !== "all" ? status : undefined,
  });

  const { data: allReviewers } = useReviewers();

  const serverReviewers = pageResult?.reviewers ?? [];
  const visible = useMemo(() => {
    return serverReviewers.filter((rev) => {
      if (defaultReviewer === "true") return rev.receiveNewRequests;
      if (defaultReviewer === "false") return !rev.receiveNewRequests;
      return true;
    });
  }, [serverReviewers, defaultReviewer]);

  const total = pageResult?.pagination.total ?? 0;

  // Stat counts computed from the full roster query
  const totalCount = allReviewers?.length ?? total;
  const defaultCount = allReviewers ? allReviewers.filter((r) => r.receiveNewRequests).length : "—";
  const pendingInviteCount = allReviewers ? allReviewers.filter((r) => r.inviteStatus === "invited").length : "—";
  const inactiveCount = allReviewers ? allReviewers.filter((r) => !r.loginEnabled).length : "—";

  const actions = useReviewerActions();
  const [sheet, setSheet] = useState<{ open: boolean; reviewer: PublicReviewer | null }>({ open: false, reviewer: null });
  const hasFilters = status !== "all" || defaultReviewer !== "all" || search.trim() !== "";

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
        <StatCard label="Reviewers" value={totalCount} icon={Users} accent="navy" hint="All accounts" />
        <StatCard label="Default reviewers" value={defaultCount} icon={Route} accent="gold" />
        <StatCard label="Pending invite" value={pendingInviteCount} icon={MailPlus} accent="amber" />
        <StatCard label="Inactive" value={inactiveCount} icon={UserX} accent="red" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              set({ page: "1" });
            }}
            placeholder="Search name, email, employee no…"
            className="w-full sm:max-w-xs"
          />
          <FilterSelect
            label="Account Status"
            hideLabel
            value={status}
            onChange={(s) => set({ status: s, page: "1" })}
            options={[
              { label: "All statuses", value: "all" },
              { label: "Active", value: "ACTIVE" },
              { label: "Pending invite", value: "INVITED" },
              { label: "Inactive", value: "DISABLED" },
            ]}
            className="w-full sm:w-44"
          />
          <FilterSelect
            label="Routing"
            hideLabel
            value={defaultReviewer}
            onChange={(dr) => set({ defaultReviewer: dr, page: "1" })}
            options={[
              { label: "All routing", value: "all" },
              { label: "Default reviewers", value: "true" },
              { label: "Regular reviewers", value: "false" },
            ]}
            className="w-full sm:w-44"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                set({ status: "all", defaultReviewer: "all", page: "1" });
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Reset filters
            </Button>
          )}
        </div>
        <p className="flex items-start gap-2 rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-xs text-foreground/90 lg:max-w-xs">
          <Info className="mt-0.5 size-3.5 shrink-0 text-brand-gold" aria-hidden="true" />
          At least one Default Reviewer must remain active.
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
