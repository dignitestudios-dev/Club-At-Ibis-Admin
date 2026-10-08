"use client";

import { ProcessingChip, isRefundPending } from "@/components/shared/processing-chip";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, ChevronRight, History, Inbox, ListChecks, RefreshCw, Route, UserRoundCheck, UserRoundPlus, Users } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignReviewerDialog } from "@/features/requests/components/assign-reviewer-dialog";
import { useRequests, useRequestsPage, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { residentFullName } from "@/lib/domain";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

// "submitted" with no assignedReviewerId is the same thing by the request
// lifecycle (assignment moves a request out of "submitted"), so the intake
// queue is just this one status filter — no "unassigned" query param needed.
const INTAKE_STATUS = "submitted";
const ASSIGNED_STATUSES = "assigned,under_review,changes_required,resubmitted,approved";

export default function AssignmentsPage() {
  const router = useRouter();
  const toast = useToast();
  const { values, set } = useUrlParams({ tab: "intake", page: "1" });
  const tab: "intake" | "assigned" | "activity" = values.tab === "assigned" || values.tab === "activity" ? values.tab : "intake";
  const [search, setSearch] = useUrlSearch("q");
  const [pageSize, setPageSize] = usePageSize();
  const [target, setTarget] = useState<RequestRecord | null>(null);

  const isIntakeTab = tab === "intake";
  const isAssignedTab = tab === "assigned";
  const isActivityTab = tab === "activity";

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
  // The assignment-activity tab has no dedicated backend endpoint — it's
  // built by scanning every request's own history for assign/reassign
  // events, so unlike the two tabs above it can't read a single
  // pagination.total from one filtered query. It stays a bounded
  // client-side aggregate (widened from the old default-20 fetch to 500)
  // until a dedicated activity endpoint covers assignment events.
  const { data: requests, isFetching: isFetchingActivity, refetch: refetchActivity } = useRequests({ limit: 500 });
  const { data: residents } = useResidents();
  const { data: reviewers } = useReviewers();

  const residentById = useMemo(() => new Map((residents ?? []).map((r) => [r.id, r])), [residents]);
  const reviewerById = useMemo(() => new Map((reviewers ?? []).map((r) => [r.id, r])), [reviewers]);

  const intakeCount = intakePage?.pagination?.total ?? 0;
  const assignedCount = assignedPage?.pagination?.total ?? 0;
  const activeReviewers = (reviewers ?? []).filter((r) => r.loginEnabled && r.inviteStatus === "active");

  // Every assignment / reassignment ever recorded, newest first.
  const activity = useMemo(() => {
    const out: { event: HistoryEvent; request: RequestRecord }[] = [];
    (requests ?? []).forEach((request) => {
      request.history.forEach((event) => {
        if (event.type === "assigned" || event.type === "reassigned") out.push({ event, request });
      });
    });
    return out.sort((a, b) => b.event.createdAt.localeCompare(a.event.createdAt));
  }, [requests]);
  const activityRows = activity.filter(({ event, request }) => {
    if (!qLower) return true;
    return `${request.code} ${request.categoryName} ${event.actor.name} ${event.assignment?.from ?? ""} ${event.assignment?.to ?? ""}`.toLowerCase().includes(qLower);
  });

  const rows = isIntakeTab ? intakePage?.requests ?? [] : isAssignedTab ? assignedPage?.requests ?? [] : [];
  const total = isIntakeTab ? intakeCount : isAssignedTab ? assignedCount : activityRows.length;
  const activityPages = Math.max(1, Math.ceil(activityRows.length / pageSize));
  const activityPage = Math.min(page, activityPages);
  const visibleActivity = activityRows.slice((activityPage - 1) * pageSize, activityPage * pageSize);
  const displayPage = isActivityTab ? activityPage : page;

  const isLoading = isIntakeTab ? isLoadingIntake : isAssignedTab ? isLoadingAssigned : false;
  const isFetching = isIntakeTab ? isFetchingIntake : isAssignedTab ? isFetchingAssigned : isFetchingActivity;
  const refetch = isIntakeTab ? refetchIntake : isAssignedTab ? refetchAssigned : refetchActivity;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Assignments"
        description="Route requests to reviewers. Assign anything waiting in the default reviewers' intake, or reassign a request that is already in progress."
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
            { value: "activity", label: "Assignment activity", icon: History, count: activity.length },
          ]}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={tab === "activity" ? "Search reference, reviewer or who assigned…" : "Search reference, resident, property or reviewer…"}
          className="sm:max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : tab === "activity" ? (
        activityRows.length === 0 ? (
          <EmptyState icon={History} title="No assignment activity" description="Assignments and reassignments will be logged here with who made them and when." />
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4 w-[180px] min-w-[180px] max-w-[180px]">Request</TableHead>
                    <TableHead className="w-[120px] min-w-[110px] max-w-[120px]">Action</TableHead>
                    <TableHead className="w-[220px] min-w-[200px] max-w-[220px]">Reviewer change</TableHead>
                    <TableHead className="w-[160px] min-w-[140px] max-w-[160px]">Done by</TableHead>
                    <TableHead className="w-[140px] min-w-[130px] max-w-[140px]">When</TableHead>
                    <TableHead className="w-10 pr-4">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleActivity.map(({ event, request }) => (
                    <TableRow key={`${request.id}-${event.id}`} className="group cursor-pointer" onClick={() => router.push(`/requests/${request.id}`)}>
                      <TableCell className="pl-4 w-[180px] min-w-[180px] max-w-[180px]">
                        <Link href={`/requests/${request.id}`} onClick={(e) => e.stopPropagation()} className="block font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300 whitespace-nowrap truncate" title={request.code}>
                          {request.code}
                        </Link>
                        <span className="block truncate text-sm font-medium text-foreground" title={request.categoryName}>{request.categoryName}</span>
                      </TableCell>
                      <TableCell className="w-[120px] min-w-[110px] max-w-[120px]">
                        <span
                          className={
                            event.type === "reassigned"
                              ? "inline-flex rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "inline-flex rounded-full border border-sky-300/80 bg-sky-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-sky-800 uppercase dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                          }
                        >
                          {event.type === "reassigned" ? "Reassigned" : "Assigned"}
                        </span>
                      </TableCell>
                      <TableCell className="w-[220px] min-w-[200px] max-w-[220px]">
                        {event.assignment ? (
                          <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
                            {event.assignment.from && (
                              <>
                                <span className="text-muted-foreground line-through decoration-muted-foreground/50 truncate max-w-[90px]" title={event.assignment.from}>{event.assignment.from}</span>
                                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                              </>
                            )}
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground min-w-0" title={event.assignment.to}>
                              <PersonAvatar name={event.assignment.to} className="size-6 shrink-0" fallbackClassName="text-[9px]" />
                              <span className="truncate max-w-[90px]">{event.assignment.to}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground truncate block" title={event.message}>{event.message}</span>
                        )}
                      </TableCell>
                      <TableCell className="w-[160px] min-w-[140px] max-w-[160px]">
                        <span className="block text-sm truncate" title={event.actor.name}>{event.actor.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{event.actor.role === "super_admin" ? "Super Admin" : "Reviewer"}</span>
                      </TableCell>
                      <TableCell className="w-[140px] min-w-[130px] max-w-[140px] whitespace-nowrap truncate" title={formatDateTime(event.createdAt)}>
                        <span className="block text-sm truncate">{formatRelative(event.createdAt)}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{formatDateTime(event.createdAt)}</span>
                      </TableCell>
                      <TableCell className="w-10 pr-4">
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={displayPage}
              pageSize={pageSize}
              total={activityRows.length}
              onPageChange={(p) => set({ page: String(p) })}
              onPageSizeChange={(n) => {
                setPageSize(n);
                set({ page: "1" });
              }}
            />
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyState
          icon={tab === "intake" ? Inbox : UserRoundCheck}
          title={tab === "intake" ? "Intake is empty" : "Nothing assigned"}
          description={tab === "intake" ? "Every new request has an owner. New submissions will appear here until a reviewer is assigned." : "No in-progress requests match."}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
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
                  const resName = residentFullName(residentById.get(req.residentId));
                  return (
                    <TableRow key={req.id} className={cn("group cursor-pointer", isRefundPending(req) && "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/15 dark:hover:bg-amber-950/25")} onClick={() => router.push(`/requests/${req.id}`)}>
                      <TableCell className="pl-4 w-[180px] min-w-[180px] max-w-[180px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="min-w-0">
                            <Link href={`/requests/${req.id}`} onClick={(e) => e.stopPropagation()} className="block font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300 whitespace-nowrap truncate" title={req.code}>
                              {req.code}
                            </Link>
                            <span className="block truncate text-sm font-medium text-foreground" title={req.categoryName}>{req.categoryName}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[180px] min-w-[160px] max-w-[180px] text-sm">
                        <span className="block truncate" title={resName}>{resName}</span>
                      </TableCell>
                      <TableCell className="w-[200px] min-w-[180px] max-w-[200px]">
                        <span className="block truncate text-sm text-muted-foreground" title={req.fieldValues.propertyAddress}>{req.fieldValues.propertyAddress}</span>
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
                            <span className="text-sm truncate block">{reviewer.name}</span>
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
          </div>
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
        </div>
      )}

      <AssignReviewerDialog request={target} onOpenChange={(o) => !o && setTarget(null)} />
    </div>
  );
}
