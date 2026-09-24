import { format } from "date-fns";

/* ------------------------------------------------------------------ */
/* Status metadata                                                     */
/* ------------------------------------------------------------------ */

export const STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "under_review",
  "changes_required",
  "resubmitted",
  "approved",
  "rejected",
  "completed",
  "withdrawn",
];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  changes_required: "Changes Required",
  resubmitted: "Resubmitted",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

/** Hex colours for charts — mirrors the status badge palette. */
export const STATUS_COLOR: Record<RequestStatus, string> = {
  submitted: "#64748b",
  under_review: "#0284c7",
  changes_required: "#d97706",
  resubmitted: "#9333ea",
  approved: "#059669",
  rejected: "#e11d48",
  completed: "#0f766e",
  withdrawn: "#94a3b8",
};

/** Requests still moving through the workflow. */
export const IN_FLIGHT: RequestStatus[] = ["submitted", "under_review", "changes_required", "resubmitted", "approved"];

export const DEPOSIT_LABEL: Record<DepositStatus, string> = {
  not_required: "Not required",
  pending: "Pending",
  received: "Received",
};

export const REFUND_LABEL: Record<RefundOutcome, string> = {
  awaiting: "Awaiting refund action",
  refunded: "Refunded",
  no_refund: "No Refund",
};

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export function residentFullName(r?: { firstName?: string; lastName?: string; displayName?: string; residentIdNumber?: string; residentId?: string } | null) {
  if (!r) return "Unknown resident";
  if (r.displayName) return r.displayName;
  const combined = `${r.firstName || ""} ${r.lastName || ""}`.trim();
  return combined || r.residentIdNumber || r.residentId || "Resident";
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/* ------------------------------------------------------------------ */
/* Request filtering                                                   */
/* ------------------------------------------------------------------ */

export interface RequestFilters {
  search: string;
  status: RequestStatus | "all";
  categoryId: string;
  categoryStatus: "all" | CategoryStatus;
  reviewerId: string; // "all" | "unassigned" | reviewer id
  depositStatus: "all" | DepositStatus;
  refund: "all" | RefundOutcome | "none";
  year: string; // "all" | "2026"
  from: string; // yyyy-mm-dd
  to: string;
}

export const DEFAULT_FILTERS: RequestFilters = {
  search: "",
  status: "all",
  categoryId: "all",
  categoryStatus: "all",
  reviewerId: "all",
  depositStatus: "all",
  refund: "all",
  year: "all",
  from: "",
  to: "",
};

interface FilterContext {
  residents: Resident[];
  categories: Category[];
}

export function filterRequests(
  requests: RequestRecord[],
  filters: RequestFilters,
  ctx: FilterContext
): RequestRecord[] {
  const q = filters.search.trim().toLowerCase();
  const residentById = new Map(ctx.residents.map((r) => [r.id, r]));
  const categoryById = new Map(ctx.categories.map((c) => [c.id, c]));

  return requests.filter((req) => {
    if (q) {
      const resident = req.resident || residentById.get(req.residentId);
      const hay = [
        req.code,
        req.title,
        req.categoryName,
        residentFullName(resident),
        (resident as any)?.residentIdNumber || (resident as any)?.residentId,
        req.property?.address,
        req.property?.lotNo,
        req.fieldValues?.propertyAddress,
        req.fieldValues?.lotNo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.status !== "all" && req.status !== filters.status) return false;
    if (filters.categoryId !== "all" && req.categoryId !== filters.categoryId) return false;
    if (filters.categoryStatus !== "all") {
      const cat = categoryById.get(req.categoryId);
      if ((cat?.status ?? "active") !== filters.categoryStatus) return false;
    }
    if (filters.reviewerId === "unassigned") {
      if (req.assignedReviewerId) return false;
    } else if (filters.reviewerId !== "all" && req.assignedReviewerId !== filters.reviewerId) {
      return false;
    }
    if (filters.depositStatus !== "all" && req.deposit.status !== filters.depositStatus) return false;
    if (filters.refund !== "all") {
      if (filters.refund === "none") {
        if (req.refund) return false;
      } else if (req.refund?.outcome !== filters.refund) {
        return false;
      }
    }
    if (filters.year !== "all" && new Date(req.submittedAt).getFullYear().toString() !== filters.year) return false;
    if (filters.from && req.submittedAt.slice(0, 10) < filters.from) return false;
    if (filters.to && req.submittedAt.slice(0, 10) > filters.to) return false;
    return true;
  });
}

export function countActiveFilters(filters: RequestFilters): number {
  let n = 0;
  (Object.keys(DEFAULT_FILTERS) as (keyof RequestFilters)[]).forEach((k) => {
    if (k !== "search" && filters[k] !== DEFAULT_FILTERS[k]) n += 1;
  });
  return n;
}

/* ------------------------------------------------------------------ */
/* Oversight buckets (dashboard "needs attention")                     */
/* ------------------------------------------------------------------ */

export function attentionBuckets(requests: RequestRecord[]) {
  return {
    unassigned: requests.filter((r) => r.status === "submitted" && !r.assignedReviewerId),
    resubmitted: requests.filter((r) => r.status === "resubmitted"),
    approvedPending: requests.filter((r) => r.status === "approved"),
    refundsAwaiting: requests.filter((r) => r.refund?.outcome === "awaiting"),
  };
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ts(iso?: string) {
  return iso ? format(new Date(iso), "yyyy-MM-dd HH:mm") : "";
}

interface CsvContext extends FilterContext {
  reviewers: PublicReviewer[];
}

/**
 * Builds one CSV containing every matching row (not just the visible page):
 * request details, status/dates/tracking fields, and every configured
 * information field across the matching categories. Uploaded documents stay
 * in the system — only their filenames are listed.
 */
export function buildRequestsCsv(requests: RequestRecord[], ctx: CsvContext): string {
  const residentById = new Map(ctx.residents.map((r) => [r.id, r]));
  const reviewerById = new Map(ctx.reviewers.map((r) => [r.id, r]));
  const categoryById = new Map(ctx.categories.map((c) => [c.id, c]));

  const baseIds = new Set(["propertyAddress", "lotNo", "projectDescription", "contractorName", "contractorNumber", "additionalDetails"]);
  const dynamic = new Map<string, string>(); // field id -> label
  const documents = new Map<string, string>();
  requests.forEach((req) => {
    req.formSnapshot.forEach((f) => {
      if (baseIds.has(f.id)) return;
      if (f.type === "file") documents.set(f.id, f.label);
      else dynamic.set(f.id, f.label);
    });
  });

  const headers = [
    "Request Reference",
    "Category",
    "Category Status",
    "Form Version",
    "Resident ID",
    "Resident Name",
    "Resident Email",
    "Property Address",
    "Lot No.",
    "Project Description",
    "Contractor Name",
    "Contractor Number",
    "Additional Details",
    "HOA Approval Confirmed",
    "Status",
    "Assigned Reviewer",
    "Submitted",
    "Last Updated",
    "Decision Date",
    "Completed",
    "Withdrawn",
    "Rejection Reason",
    "Deposit Required",
    "Deposit Amount",
    "Deposit Status",
    "Deposit Receipt Recorded",
    "Refund Outcome",
    "Refund Date",
    "Approval Letter",
    "Letter Email Result",
    ...[...dynamic.values()].map((l) => `Info: ${l}`),
    ...[...documents.values()].map((l) => `Document: ${l}`),
  ];

  const rows = requests.map((req) => {
    const resident = residentById.get(req.residentId);
    const reviewer = req.assignedReviewerId ? reviewerById.get(req.assignedReviewerId) : undefined;
    const cat = categoryById.get(req.categoryId);
    return [
      req.code,
      req.categoryName,
      cat?.status ?? "active",
      `v${req.formVersion}`,
      resident?.residentIdNumber,
      residentFullName(resident),
      resident?.email,
      req.fieldValues.propertyAddress,
      req.fieldValues.lotNo,
      req.fieldValues.projectDescription,
      req.fieldValues.contractorName,
      req.fieldValues.contractorNumber,
      req.fieldValues.additionalDetails,
      req.hoaApproved ? "Yes" : "No",
      STATUS_LABEL[req.status],
      reviewer?.name ?? "Unassigned",
      ts(req.submittedAt),
      ts(req.updatedAt),
      ts(req.decidedAt),
      ts(req.completedAt),
      ts(req.withdrawnAt),
      req.rejectionReason,
      req.deposit.required ? "Yes" : "No",
      req.deposit.amount,
      DEPOSIT_LABEL[req.deposit.status],
      ts(req.deposit.receivedAt),
      req.refund ? (req.refund.outcome === "no_refund" ? "-" : REFUND_LABEL[req.refund.outcome]) : "",
      req.refund?.outcome === "refunded" ? ts(req.refund.date) : "",
      req.approvalLetter?.name,
      req.letterEmail ? "Sent" : "",
      ...[...dynamic.keys()].map((id) => req.fieldValues[id]),
      ...[...documents.keys()].map((id) => req.uploads[id]?.map((f) => f.name).join("; ")),
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
