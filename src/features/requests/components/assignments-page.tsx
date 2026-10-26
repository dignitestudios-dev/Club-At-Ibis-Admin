"use client";

import { Highlight } from "@/components/shared/highlight";
import { ProcessingChip, isRefundPending } from "@/components/shared/processing-chip";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Inbox, ListChecks, RefreshCw, RotateCcw, Route, UserRoundCheck, UserRoundPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { SegmentedTabs } from "@/components/shared/pill-tabs";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableFrame } from "@/components/shared/table-frame";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignReviewerDialog } from "@/features/requests/components/assign-reviewer-dialog";
import { useRequestsPage, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { residentFullName } from "@/lib/domain";
import { formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

// "submitted" with no assignedReviewerId is the same thing by the request
// lifecycle (assignment moves a request out of "submitted"), so the intake
// queue is just this one status filter — no "unassigned" query param needed.
const INTAKE_STATUS = "submitted";
const ASSIGNED_STATUSES = "assigned,under_review,changes_required,resubmitted,approved";

export default function AssignmentsPage() {
  const router = useRouter();
  const toast = useToast();
  const { values, set, resetAll } = useUrlParams({ tab: "intake", page: "1" });
  const tab: "intake" | "assigned" = values.tab === "assigned" ? values.tab : "intake";
  const [search, setSearch] = useUrlSearch("q");
  const [pageSize, setPageSize] = usePageSize();
  const [target, setTarget] = useState<RequestRecord | null>(null);

  const isIntakeTab = tab === "intake";
  const isAssignedTab = tab === "assigned";

  const page = Math.max(1, Number(values.page) || 1);
  const q = search.trim();
  const qLower = q.toLowerCase();

  // Intake/Assigned counts and table content both come from the same
  // server-paginated query's `pagination.total` — never a single capped
  // `useRequests()` fetch sliced on the client, which silently truncated
  // both the counts and the visible rows once there were more than 20
  // requests system-wide. The tab that isn't open only needs the total, so
  // it's fetched with `limit: 1` to keep the background request cheap.
  const {
    data: intakePage,
    isLoading: isLoadingIntake,
    isFetching: isFetchingIntake,
    refetch: refetchIntake,
  } = useRequestsPage({
    status: INTAKE_STATUS,
    search: q || undefined,
    page: isIntakeTab ? page : 1,
    limit: isIntakeTab ? pageSize : 1,
  });
  const {
    data: assignedPage,
    isLoading: isLoadingAssigned,
    isFetching: isFetchingAssigned,
    refetch: refetchAssigned,
  } = useRequestsPage({
    status: ASSIGNED_STATUSES,
    search: q || undefined,
    page: isAssignedTab ? page : 1,
    limit: isAssignedTab ? pageSize : 1,
  });
  const { data: residents } = useResidents();
  const { data: reviewers } = useReviewers();

  const residentById = useMemo(() => new Map((residents ?? []).map((r) => [r.id, r])), [residents]);
  const reviewerById = useMemo(() => new Map((reviewers ?? []).map((r) => [r.id, r])), [reviewers]);

  const intakeCount = intakePage?.pagination?.total ?? 0;
  const assignedCount = assignedPage?.pagination?.total ?? 0;
  const activeReviewers = (reviewers ?? []).filter((r) => r.loginEnabled && r.inviteStatus === "active");

  const rows = isIntakeTab ? intakePage?.requests ?? [] : assignedPage?.requests ?? [];
  const total = isIntakeTab ? intakeCount : assignedCount;
  const displayPage = page;

  const isLoading = isIntakeTab ? isLoadingIntake : isLoadingAssigned;
  const isFetching = isIntakeTab ? isFetchingIntake : isFetchingAssigned;
  const refetch = isIntakeTab ? refetchIntake : refetchAssigned;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Assignments"
        description="Send unassigned requests to reviewers or update existing assignments when needed."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await refetch();
                toast.success("Assignments refreshed");
              } catch {
                toast.error("Failed to refresh assignments");
              }
            }}
            disabled={isFetching}
            className="h-8 gap-1.5"
            aria-label="Refresh assignments"
            title="Refresh assignments"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            <span>Refresh</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting In Intake" value={intakeCount} icon={Inbox} accent="blue" hint="No owner yet" />
        <StatCard label="Assigned · In Progress" value={assignedCount} icon={ListChecks} accent="navy" hint="Owned by a reviewer" />
        <StatCard label="Active Reviewers" value={activeReviewers.length} icon={Users} accent="emerald" hint="Can be assigned" />
        <StatCard label="Default Reviewers" value={activeReviewers.filter((r) => r.receiveNewRequests).length} icon={Route} accent="gold" hint="Receive new requests" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs
          label="Assignment lists"
          value={tab}
          onChange={(v) => set({ tab: v, page: "1" })}
          options={[
            { value: "intake", label: "Intake queue", icon: Inbox, count: intakeCount },
            { value: "assigned", label: "Assigned requests", icon: UserRoundCheck, count: assignedCount },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search reference, resident, property or reviewer…"
          className="sm:max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={tab === "intake" ? Inbox : UserRoundCheck}
          title={q ? "No matching requests found" : tab === "intake" ? "Intake is empty" : "Nothing assigned"}
          description={
            q
              ? "Try adjusting your search criteria or clear the search."
              : tab === "intake"
              ? "Every new request has an owner. New submissions will appear here until a reviewer is assigned."
              : "No in-progress requests match."
          }
          action={
            q ? (
              <Button variant="outline" size="sm" onClick={() => resetAll({ tab })}>
                <RotateCcw className="size-3.5 mr-1" />
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <TableFrame
          footer={
          <Pagination
        page={displayPage}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => set({ page: String(p) })}
        onPageSizeChange={(n) => {
          setPageSize(n);
          set({ page: "1" });
        }}
      />
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4 w-[180px] min-w-[180px] max-w-[180px]">Request</TableHead>
                <TableHead className="w-[180px] min-w-[160px] max-w-[180px]">Resident</TableHead>
                <TableHead className="w-[200px] min-w-[180px] max-w-[200px]">Property</TableHead>
                <TableHead className="min-w-[170px]">Status</TableHead>
                <TableHead className="w-[130px] min-w-[120px] max-w-[130px]">Submitted</TableHead>
                <TableHead className="w-[180px] min-w-[160px] max-w-[180px]">{tab === "intake" ? "Owner" : "Assigned reviewer"}</TableHead>
                <TableHead className="w-[120px] min-w-[110px] max-w-[120px] text-right">
                  <span className="sr-only">Action</span>
                </TableHead>
                <TableHead className="w-10 pr-4">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((req) => {
                const reviewer = req.assignedReviewerId ? reviewerById.get(req.assignedReviewerId) : undefined;
                const resName = residentFullName(req.resident ?? residentById.get(req.residentId));
                return (
                  <TableRow key={req.id} className={cn("group cursor-pointer", isRefundPending(req) && "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/15 dark:hover:bg-amber-950/25")} onClick={() => router.push(`/requests/${req.id}`)}>
                    <TableCell className="pl-4 w-[180px] min-w-[180px] max-w-[180px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="min-w-0">
                          <Link href={`/requests/${req.id}`} onClick={(e) => e.stopPropagation()} className="block font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300 whitespace-nowrap truncate" title={req.code}>
                            <Highlight text={req.code} query={search} />
                          </Link>
                          <span className="block truncate text-sm font-medium text-foreground" title={req.categoryName}><Highlight text={req.categoryName} query={search} /></span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[180px] min-w-[160px] max-w-[180px] text-sm">
                      <span className="block truncate" title={resName}><Highlight text={resName} query={search} /></span>
                    </TableCell>
                    <TableCell className="w-[200px] min-w-[180px] max-w-[200px]">
                      <span className="block truncate text-sm text-muted-foreground" title={req.fieldValues.propertyAddress}><Highlight text={req.fieldValues.propertyAddress} query={search} /></span>
                    </TableCell>
                    <TableCell className="min-w-[170px]">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={req.status} />
                        <ProcessingChip request={req} />
                      </div>
                    </TableCell>
                    <TableCell className="w-[130px] min-w-[120px] max-w-[130px] whitespace-nowrap truncate" title={format(new Date(req.submittedAt), "PPP")}>
                      <span className="block text-sm truncate">{formatRelative(req.submittedAt)}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{format(new Date(req.submittedAt), "MMM d, yyyy")}</span>
                    </TableCell>
                    <TableCell className="w-[180px] min-w-[160px] max-w-[180px]">
                      {reviewer ? (
                        <div className="flex items-center gap-2 min-w-0" title={reviewer.name}>
                          <PersonAvatar name={reviewer.name} className="size-7 shrink-0" fallbackClassName="text-[10px]" />
                          <span className="text-sm truncate block"><Highlight text={reviewer.name} query={search} /></span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Default reviewers&apos; intake</span>
                      )}
                    </TableCell>
                    <TableCell className="w-[120px] min-w-[110px] max-w-[120px] text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant={tab === "intake" ? "default" : "outline"} onClick={() => setTarget(req)}>
                        <UserRoundPlus />
                        {tab === "intake" ? "Assign" : "Reassign"}
                      </Button>
                    </TableCell>
                    <TableCell className="w-10 pr-4">
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableFrame>
      )}

      <AssignReviewerDialog request={target} onOpenChange={(o) => !o && setTarget(null)} />
    </div>
  );
}
