"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Pagination } from "@/components/shared/pagination";
import { usePageSize } from "@/hooks/use-page-size";
import { residentFullName } from "@/lib/domain";
import { formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

/**
 * Compact request table used on resident / reviewer detail pages. Each row is
 * a clickable card-like line: category tile + reference, resident, property,
 * status and submission date, with built-in pagination.
 */
export function RequestMiniTable({
  requests,
  residents,
  reviewers,
  showReviewer = false,
  showResident = true,
  empty = "No requests to show.",
}: {
  requests: RequestRecord[];
  residents: Resident[];
  reviewers?: PublicReviewer[];
  showReviewer?: boolean;
  showResident?: boolean;
  empty?: string;
}) {
  const router = useRouter();
  const [pageSize, setPageSize] = usePageSize();
  const [page, setPage] = useState(1);

  const residentById = new Map(residents.map((r) => [r.id, r]));
  const reviewerById = new Map((reviewers ?? []).map((r) => [r.id, r]));

  if (requests.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  const pages = Math.max(1, Math.ceil(requests.length / pageSize));
  const safePage = Math.min(page, pages);
  const rows = requests.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-5">Request</TableHead>
            {showResident && <TableHead>Resident</TableHead>}
            <TableHead>Property</TableHead>
            {showReviewer && <TableHead>Reviewer</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="w-10 pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((req) => {
            const resident = residentById.get(req.residentId);
            const reviewer = req.assignedReviewerId ? reviewerById.get(req.assignedReviewerId) : undefined;
            return (
              <TableRow key={req.id} className="group cursor-pointer" onClick={() => router.push(`/requests/${req.id}`)}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-primary group-hover:underline dark:text-amber-300">{req.code}</span>
                      <span className="block truncate text-sm font-medium text-foreground">{req.categoryName}</span>
                    </span>
                  </div>
                </TableCell>
                {showResident && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PersonAvatar name={residentFullName(resident)} className="size-7" fallbackClassName="text-[10px]" />
                      <span className="text-sm whitespace-nowrap">{residentFullName(resident)}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <span className="flex max-w-[220px] items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{req.fieldValues.propertyAddress}</span>
                  </span>
                </TableCell>
                {showReviewer && (
                  <TableCell>
                    {reviewer ? (
                      <div className="flex items-center gap-2">
                        <PersonAvatar name={reviewer.name} className="size-6" fallbackClassName="text-[9px]" />
                        <span className="text-sm whitespace-nowrap">{reviewer.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge status={req.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="block text-sm text-foreground">{formatRelative(req.submittedAt)}</span>
                  <span className="block text-[11px] text-muted-foreground">{format(new Date(req.submittedAt), "MMM d, yyyy")}</span>
                </TableCell>
                <TableCell className="pr-4">
                  <ChevronRight className={cn("size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5")} aria-hidden="true" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t border-border/70 px-5 py-3">
        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={requests.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
