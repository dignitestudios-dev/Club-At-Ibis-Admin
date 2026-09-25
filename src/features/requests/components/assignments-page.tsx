"use client";

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
import { useRequests, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { IN_FLIGHT, residentFullName } from "@/lib/domain";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function AssignmentsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: requests, isLoading, isFetching, refetch } = useRequests();
  const { data: residents } = useResidents();
  const { data: reviewers } = useReviewers();
  const { values, set } = useUrlParams({ tab: "intake", page: "1" });
  const tab: "intake" | "assigned" | "activity" = values.tab === "assigned" || values.tab === "activity" ? values.tab : "intake";
  const [search, setSearch] = useUrlSearch("q");
  const [pageSize, setPageSize] = usePageSize();
  const [target, setTarget] = useState<RequestRecord | null>(null);

  const residentById = useMemo(() => new Map((residents ?? []).map((r) => [r.id, r])), [residents]);
  const reviewerById = useMemo(() => new Map((reviewers ?? []).map((r) => [r.id, r])), [reviewers]);

  const all = requests ?? [];
  const intake = all.filter((r) => r.status === "submitted" && !r.assignedReviewerId);
  const assigned = all.filter((r) => r.assignedReviewerId && IN_FLIGHT.includes(r.status));
  const activeReviewers = (reviewers ?? []).filter((r) => r.loginEnabled && r.inviteStatus === "active");

  const q = search.trim().toLowerCase();

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
    if (!q) return true;
    return `${request.code} ${request.categoryName} ${event.actor.name} ${event.assignment?.from ?? ""} ${event.assignment?.to ?? ""}`.toLowerCase().includes(q);
  });

  const source = tab === "intake" ? intake : assigned;
  const rows = tab === "activity" ? [] : source.filter((r) => {
    if (!q) return true;
    const res = residentById.get(r.residentId);
    const rev = r.assignedReviewerId ? reviewerById.get(r.assignedReviewerId) : undefined;
    return `${r.code} ${r.categoryName} ${residentFullName(res)} ${r.fieldValues.propertyAddress} ${rev?.name ?? ""}`.toLowerCase().includes(q);
  });
  const listLength = tab === "activity" ? activityRows.length : rows.length;
  const pages = Math.max(1, Math.ceil(listLength / pageSize));
  const page = Math.min(Math.max(1, Number(values.page) || 1), pages);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);
  const visibleActivity = activityRows.slice((page - 1) * pageSize, page * pageSize);

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
        <StatCard label="Waiting In Intake" value={intake.length} icon={Inbox} accent="blue" hint="No owner yet" />
        <StatCard label="Assigned · In Progress" value={assigned.length} icon={ListChecks} accent="navy" hint="Owned by a reviewer" />
        <StatCard label="Active Reviewers" value={activeReviewers.length} icon={Users} accent="emerald" hint="Can be assigned" />
        <StatCard label="Default Reviewers" value={activeReviewers.filter((r) => r.receiveNewRequests).length} icon={Route} accent="gold" hint="Receive new requests" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs
          label="Assignment lists"
          value={tab}
          onChange={(v) => set({ tab: v, page: "1" })}
          options={[
            { value: "intake", label: "Intake queue", icon: Inbox, count: intake.length },
            { value: "assigned", label: "Assigned requests", icon: UserRoundCheck, count: assigned.length },
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
                    <TableHead className="pl-4 w-[180px] min-w-[180px]">Request</TableHead>
                    <TableHead className="max-w-[120px]">Action</TableHead>
                    <TableHead className="max-w-[220px]">Reviewer change</TableHead>
                    <TableHead className="max-w-[160px]">Done by</TableHead>
                    <TableHead className="max-w-[140px]">When</TableHead>
                    <TableHead className="w-10 pr-4">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleActivity.map(({ event, request }) => (
                    <TableRow key={`${request.id}-${event.id}`} className="group cursor-pointer" onClick={() => router.push(`/requests/${request.id}`)}>
                      <TableCell className="pl-4 w-[180px] min-w-[180px]">
                        <Link href={`/requests/${request.id}`} onClick={(e) => e.stopPropagation()} className="block font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300 whitespace-nowrap" title={request.code}>
                          {request.code}
                        </Link>
                        <span className="block truncate text-sm font-medium text-foreground" title={request.categoryName}>{request.categoryName}</span>
                      </TableCell>
                      <TableCell className="max-w-[120px]">
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
                      <TableCell className="max-w-[220px]">
                        {event.assignment ? (
                          <div className="flex flex-wrap items-center gap-2 text-sm min-w-0">
                            {event.assignment.from && (
                              <>
                                <span className="text-muted-foreground line-through decoration-muted-foreground/50 truncate max-w-[100px]" title={event.assignment.from}>{event.assignment.from}</span>
                                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                              </>
                            )}
                            <span className="inline-flex items-center gap-1.5 font-medium text-foreground min-w-0" title={event.assignment.to}>
                              <PersonAvatar name={event.assignment.to} className="size-6 shrink-0" fallbackClassName="text-[9px]" />
                              <span className="truncate max-w-[100px]">{event.assignment.to}</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground truncate block" title={event.message}>{event.message}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        <span className="block text-sm truncate" title={event.actor.name}>{event.actor.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{event.actor.role === "super_admin" ? "Super Admin" : "Reviewer"}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-w-[140px] truncate" title={formatDateTime(event.createdAt)}>
                        <span className="block text-sm truncate">{formatRelative(event.createdAt)}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{formatDateTime(event.createdAt)}</span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={page}
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
                  <TableHead className="pl-4 w-[180px] min-w-[180px]">Request</TableHead>
                  <TableHead className="max-w-[180px]">Resident</TableHead>
                  <TableHead className="max-w-[200px]">Property</TableHead>
                  <TableHead className="max-w-[130px]">Status</TableHead>
                  <TableHead className="max-w-[130px]">Submitted</TableHead>
                  <TableHead className="max-w-[160px]">{tab === "intake" ? "Owner" : "Assigned reviewer"}</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Action</span>
                  </TableHead>
                  <TableHead className="w-10 pr-4">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((req) => {
                  const reviewer = req.assignedReviewerId ? reviewerById.get(req.assignedReviewerId) : undefined;
                  const resName = residentFullName(residentById.get(req.residentId));
                  return (
                    <TableRow key={req.id} className="group cursor-pointer" onClick={() => router.push(`/requests/${req.id}`)}>
                      <TableCell className="pl-4 w-[180px] min-w-[180px]">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="min-w-0">
                            <Link href={`/requests/${req.id}`} onClick={(e) => e.stopPropagation()} className="block font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300 whitespace-nowrap" title={req.code}>
                              {req.code}
                            </Link>
                            <span className="block truncate text-sm font-medium text-foreground" title={req.categoryName}>{req.categoryName}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px]">
                        <span className="block truncate" title={resName}>{resName}</span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="block max-w-[200px] truncate text-sm text-muted-foreground" title={req.fieldValues.propertyAddress}>{req.fieldValues.propertyAddress}</span>
                      </TableCell>
                      <TableCell className="max-w-[130px]">
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap max-w-[130px] truncate" title={format(new Date(req.submittedAt), "PPP")}>
                        <span className="block text-sm truncate">{formatRelative(req.submittedAt)}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{format(new Date(req.submittedAt), "MMM d, yyyy")}</span>
                      </TableCell>
                      <TableCell className="max-w-[160px]">
                        {reviewer ? (
                          <div className="flex items-center gap-2 min-w-0" title={reviewer.name}>
                            <PersonAvatar name={reviewer.name} className="size-7 shrink-0" fallbackClassName="text-[10px]" />
                            <span className="text-sm truncate">{reviewer.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Default reviewers&apos; intake</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant={tab === "intake" ? "default" : "outline"} onClick={() => setTarget(req)}>
                          <UserRoundPlus />
                          {tab === "intake" ? "Assign" : "Reassign"}
                        </Button>
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
            total={rows.length}
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
