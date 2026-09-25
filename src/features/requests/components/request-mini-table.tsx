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
            <TableHead className="pl-5 w-[180px] min-w-[180px]">Request</TableHead>
            {showResident && <TableHead className="max-w-[180px]">Resident</TableHead>}
            <TableHead className="max-w-[200px]">Property</TableHead>
            {showReviewer && <TableHead className="max-w-[160px]">Reviewer</TableHead>}
            <TableHead className="max-w-[130px]">Status</TableHead>
            <TableHead className="max-w-[130px]">Submitted</TableHead>
            <TableHead className="w-10 pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((req) => {
            const resident = residentById.get(req.residentId);
            const reviewer = req.assignedReviewerId ? reviewerById.get(req.assignedReviewerId) : undefined;
            const resName = residentFullName(resident);
            return (
              <TableRow key={req.id} className="group cursor-pointer" onClick={() => router.push(`/requests/${req.id}`)}>
                <TableCell className="pl-5 w-[180px] min-w-[180px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs font-semibold text-primary group-hover:underline dark:text-amber-300 whitespace-nowrap" title={req.code}>{req.code}</span>
                      <span className="block truncate text-sm font-medium text-foreground" title={req.categoryName}>{req.categoryName}</span>
                    </span>
                  </div>
                </TableCell>
                {showResident && (
                  <TableCell className="max-w-[180px]">
                    <div className="flex items-center gap-2 min-w-0" title={resName}>
                      <PersonAvatar name={resName} className="size-7 shrink-0" fallbackClassName="text-[10px]" />
                      <span className="text-sm truncate">{resName}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="max-w-[200px]">
                  <span className="flex max-w-[200px] items-center gap-1.5 text-sm text-muted-foreground" title={req.fieldValues.propertyAddress}>
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{req.fieldValues.propertyAddress}</span>
                  </span>
                </TableCell>
                {showReviewer && (
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
                )}
                <TableCell className="max-w-[130px]">
                  <StatusBadge status={req.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap max-w-[130px] truncate" title={format(new Date(req.submittedAt), "PPP")}>
                  <span className="block text-sm text-foreground truncate">{formatRelative(req.submittedAt)}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{format(new Date(req.submittedAt), "MMM d, yyyy")}</span>
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
