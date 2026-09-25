"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Download, FileSearch, Filter, RefreshCw, RotateCcw, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { FilterPills } from "@/components/shared/pill-tabs";
import { Pagination } from "@/components/shared/pagination";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepositChip, RefundChip } from "@/features/requests/components/request-chips";
import { ExportDialog } from "@/features/requests/components/export-dialog";
import { useCategories, useRequests, useRequestsPage, useResidents, useReviewers } from "@/hooks/use-admin-data";
import type { RequestsQueryParams } from "@/features/requests/api/requests.service";
import { usePageSize } from "@/hooks/use-page-size";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { cn } from "@/utils/cn";
import {
  DEFAULT_FILTERS,
  STATUS_LABEL,
  STATUS_ORDER,
  countActiveFilters,
  filterRequests,
  residentFullName,
  type RequestFilters,
} from "@/lib/domain";

/** URL query keys → filter fields. Everything here survives a refresh. */
const URL_DEFAULTS = {
  status: "all",
  category: "all",
  categoryStatus: "all",
  reviewer: "all",
  deposit: "all",
  refund: "all",
  from: "",
  to: "",
  page: "1",
};

export default function RequestsListPage() {
  const router = useRouter();
  const toast = useToast();
  const { values: url, set: setUrl } = useUrlParams(URL_DEFAULTS);
  const [search, setSearch] = useUrlSearch("q");
  const [pageSize, setPageSize] = usePageSize();

  const page = Math.max(1, Number(url.page) || 1);

  const queryParams = useMemo<RequestsQueryParams>(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: url.status !== "all" && STATUS_ORDER.includes(url.status as RequestStatus) ? url.status : undefined,
      categoryId: url.category !== "all" ? url.category : undefined,
      categoryStatus: url.categoryStatus === "active" || url.categoryStatus === "archived" ? url.categoryStatus : undefined,
      assignedReviewerId: url.reviewer !== "all" ? url.reviewer : undefined,
      depositStatus: ["not_required", "required", "received", "partially_refunded", "fully_refunded", "retained"].includes(url.deposit)
        ? url.deposit
        : undefined,
      refundOutcome: ["refunded", "no_refund"].includes(url.refund) ? url.refund : undefined,
      submittedFrom: url.from || undefined,
      submittedTo: url.to || undefined,
    }),
    [page, pageSize, search, url]
  );

  const { data: pageData, isLoading, isFetching, refetch } = useRequestsPage(queryParams);
  const { data: allRequests } = useRequests({ limit: 100 });
  const { data: residents } = useResidents();
  const { data: categories } = useCategories();
  const { data: reviewers } = useReviewers();

  const requests = pageData?.requests ?? [];
  const totalCount = pageData?.pagination?.total ?? 0;

  const applied = useMemo<RequestFilters>(
    () => ({
      search,
      status: STATUS_ORDER.includes(url.status as RequestStatus) ? (url.status as RequestStatus) : "all",
      categoryId: url.category,
      categoryStatus: url.categoryStatus === "active" || url.categoryStatus === "archived" ? url.categoryStatus : "all",
      reviewerId: url.reviewer,
      depositStatus: ["not_required", "required", "received", "partially_refunded", "fully_refunded", "retained"].includes(url.deposit)
        ? (url.deposit as RequestFilters["depositStatus"])
        : "all",
      refund: ["refunded", "no_refund"].includes(url.refund) ? (url.refund as RequestFilters["refund"]) : "all",
      from: url.from,
      to: url.to,
    }),
    [search, url]
  );

  // Filters are staged in the panel and applied with the Apply button.
  const [draft, setDraft] = useState<RequestFilters>(applied);
  const [showFilters, setShowFilters] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const appliedKey = JSON.stringify(applied);
  useEffect(() => {
    setDraft(applied);
    if (countActiveFilters(applied) > 0) setShowFilters(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedKey]);

  function writeFilters(f: RequestFilters) {
    setUrl({
      status: f.status,
      category: f.categoryId,
      categoryStatus: f.categoryStatus,
      reviewer: f.reviewerId,
      deposit: f.depositStatus,
      refund: f.refund,
      from: f.from,
      to: f.to,
      page: "1",
    });
  }

  function clearAll() {
    setSearch("");
    setDraft(DEFAULT_FILTERS);
    setUrl({ ...URL_DEFAULTS });
  }

  const residentById = useMemo(() => new Map((residents ?? []).map((r) => [r.id, r])), [residents]);
  const reviewerById = useMemo(() => new Map((reviewers ?? []).map((r) => [r.id, r])), [reviewers]);
  const categoryById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories]);

  // Counts for the status pills respect every filter except status.
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<RequestStatus, number>;
    (allRequests ?? []).forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    return { counts, total: (allRequests ?? []).length };
  }, [allRequests]);

  const activeFilterCount = countActiveFilters(applied);
  const hasAnyFilter = activeFilterCount > 0 || applied.search.trim() !== "";

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (applied.search.trim()) parts.push(`search “${applied.search.trim()}”`);
    if (applied.status !== "all") parts.push(`status ${STATUS_LABEL[applied.status]}`);
    if (applied.categoryId !== "all") parts.push(`category ${categoryById.get(applied.categoryId)?.name ?? applied.categoryId}`);
    if (applied.categoryStatus !== "all") parts.push(`${applied.categoryStatus} categories`);
    if (applied.reviewerId !== "all") parts.push(`reviewer ${reviewerById.get(applied.reviewerId)?.name ?? ""}`);
    if (applied.depositStatus !== "all") parts.push(`deposit ${applied.depositStatus.replace("_", " ")}`);
    if (applied.refund !== "all") parts.push(`refund ${applied.refund.replace("_", " ")}`);
    if (applied.from || applied.to) parts.push(`submitted ${applied.from || "…"} → ${applied.to || "…"}`);
    return parts.join(", ");
  }, [applied, categoryById, reviewerById]);

  const categoryOptions = [
    { label: "All categories", value: "all" },
    ...[...(categories ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ label: c.status === "archived" ? `${c.name} (archived)` : c.name, value: c.id })),
  ];
  const reviewerOptions = [
    { label: "All reviewers", value: "all" },
    ...(reviewers ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({ label: r.name, value: r.id })),
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="All Requests"
        description="Search, filter and track every architectural request across all categories."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await refetch();
                  toast.success("Requests refreshed");
                } catch {
                  toast.error("Failed to refresh requests");
                }
              }}
              disabled={isFetching}
              className="h-9 gap-1.5"
              aria-label="Refresh requests"
              title="Refresh requests"
            >
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              <span>Refresh</span>
            </Button>
            <Button onClick={() => setExportOpen(true)} disabled={isLoading || totalCount === 0}>
              <Download className="size-4" />
              Export CSV
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-[10px] font-semibold tabular-nums dark:bg-black/15">
                {totalCount}
              </span>
            </Button>
          </div>
        }
      />

      <FilterPills
        label="Filter by status"
        value={applied.status}
        onChange={(status) => writeFilters({ ...applied, status })}
        options={[
          { value: "all", label: "All", count: statusCounts.total },
          ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s], count: statusCounts.counts[s] })),
        ]}
      />

      <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs sm:p-4" role="search" aria-label="Request search and filters">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search reference, resident name / ID, property address or lot no."
          />
          <Button variant="outline" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} className="shrink-0">
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4 border-t border-border/70 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label htmlFor="f-from" className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Submitted from
                </label>
                <Input id="f-from" type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="f-to" className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Submitted to
                </label>
                <Input id="f-to" type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
              </div>
              <FilterSelect
                label="Request status"
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                options={[{ label: "All statuses", value: "all" }, ...STATUS_ORDER.map((s) => ({ label: STATUS_LABEL[s], value: s }))]}
              />
              <FilterCombobox label="Category" value={draft.categoryId} onChange={(categoryId) => setDraft({ ...draft, categoryId })} options={categoryOptions} />
              <FilterSelect
                label="Category status"
                value={draft.categoryStatus}
                onChange={(categoryStatus) => setDraft({ ...draft, categoryStatus })}
                options={[
                  { label: "All", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Archived", value: "archived" },
                ]}
              />
              <FilterCombobox label="Assigned reviewer" value={draft.reviewerId} onChange={(reviewerId) => setDraft({ ...draft, reviewerId })} options={reviewerOptions} />
              <FilterSelect
                label="Deposit status"
                value={draft.depositStatus}
                onChange={(depositStatus) => setDraft({ ...draft, depositStatus })}
                options={[
                  { label: "Any deposit status", value: "all" },
                  { label: "Not required", value: "not_required" },
                  { label: "Required", value: "required" },
                  { label: "Received", value: "received" },
                  { label: "Partially refunded", value: "partially_refunded" },
                  { label: "Fully refunded", value: "fully_refunded" },
                  { label: "Retained", value: "retained" },
                ]}
              />
              <FilterSelect
                label="Refund outcome"
                value={draft.refund}
                onChange={(refund) => setDraft({ ...draft, refund })}
                options={[
                  { label: "Any refund outcome", value: "all" },
                  { label: "Refunded", value: "refunded" },
                  { label: "No refund (-)", value: "no_refund" },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => writeFilters(draft)}>
                <Filter className="size-4" />
                Apply filters
              </Button>
              <Button variant="ghost" onClick={clearAll}>
                <RotateCcw className="size-4" />
                Clear filters
              </Button>
              <p className="text-xs text-muted-foreground sm:ml-auto">Filters are kept in the page address, so they survive a refresh.</p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No requests match"
          description="Try adjusting the search or clearing filters. Archived categories remain searchable."
          action={
            hasAnyFilter ? (
              <Button variant="outline" onClick={clearAll}>
                <RotateCcw className="size-4" />
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 w-[160px] min-w-[160px] whitespace-nowrap">Reference</TableHead>
                  <TableHead className="max-w-[200px]">Category</TableHead>
                  <TableHead className="max-w-[180px]">Resident</TableHead>
                  <TableHead className="max-w-[200px]">Property</TableHead>
                  <TableHead className="max-w-[130px]">Submitted</TableHead>
                  <TableHead className="max-w-[140px]">Status</TableHead>
                  <TableHead className="max-w-[160px]">Reviewer</TableHead>
                  <TableHead className="max-w-[140px]">Deposit / refund</TableHead>
                  <TableHead className="w-10 pr-4">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const resident = req.resident
                    ? {
                        id: req.resident.id,
                        residentIdNumber: req.resident.residentId || req.resident.residentIdNumber || "",
                        firstName: req.resident.firstName || "",
                        lastName: req.resident.lastName || "",
                        displayName: req.resident.displayName || "",
                        email: req.resident.email || "",
                        phone: req.resident.phone || "",
                        active: true,
                        address: req.property?.address || req.fieldValues?.propertyAddress || "",
                        lotNo: req.property?.lotNo || req.fieldValues?.lotNo || "",
                        createdAt: "",
                      }
                    : residentById.get(req.residentId);
                  const reviewer = req.assignedReviewerId ? reviewerById.get(req.assignedReviewerId) : undefined;
                  const category = categoryById.get(req.categoryId);
                  const propAddress = req.property?.address || req.fieldValues?.propertyAddress || "—";
                  const propLot = req.property?.lotNo || req.fieldValues?.lotNo || "—";
                  return (
                    <TableRow key={req.id} onClick={() => router.push(`/requests/${req.id}`)} className="group cursor-pointer">
                      <TableCell className="pl-4 w-[160px] min-w-[160px] whitespace-nowrap">
                        <Link
                          href={`/requests/${req.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300 whitespace-nowrap block"
                          title={req.code}
                        >
                          {req.code}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium truncate text-foreground" title={req.categoryName}>{req.categoryName}</span>
                          {category?.status === "archived" && (
                            <span className="w-fit rounded-full bg-slate-200 px-1.5 text-[9px] font-bold tracking-wider text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-200">
                              Archived
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="text-sm font-medium truncate" title={`${residentFullName(resident)} (${resident?.residentIdNumber || ''})`}>{residentFullName(resident)}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{resident?.residentIdNumber}</div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="max-w-[200px] truncate text-sm" title={`${propAddress} (Lot: ${propLot})`}>{propAddress}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{propLot}</div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground max-w-[130px] truncate" title={format(new Date(req.submittedAt), "PPP")}>{format(new Date(req.submittedAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="max-w-[140px]">
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        {reviewer ? (
                          <div className="flex items-center gap-2 min-w-0" title={reviewer.name}>
                            <PersonAvatar name={reviewer.name} className="size-6 shrink-0" fallbackClassName="text-[9px]" />
                            <span className="text-sm truncate">{reviewer.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <div className="flex flex-col items-start gap-1">
                          <DepositChip deposit={req.deposit} />
                          {req.refund && <RefundChip refund={req.refund} />}
                        </div>
                      </TableCell>
                      <TableCell className="pr-4">
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
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
            total={totalCount}
            onPageChange={(p) => setUrl({ page: String(p) })}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setUrl({ page: "1" });
            }}
          />
        </div>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        requests={allRequests ?? requests}
        context={{ residents: residents ?? [], categories: categories ?? [], reviewers: reviewers ?? [] }}
        filterSummary={filterSummary}
      />
    </div>
  );
}
