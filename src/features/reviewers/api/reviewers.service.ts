import axiosInstance from "@/lib/axios";

/** Shape the backend's `adminAccountUser` presenter returns for a REVIEWER account. */
interface ReviewerApiUser {
  _id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  designation?: string | null;
  email: string;
  accountStatus: string;
  credentialStatus: string;
  isDefaultReviewer: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

function toPublicReviewer(u: ReviewerApiUser): PublicReviewer {
  return {
    id: u._id,
    name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
    employeeNumber: u.employeeNumber ?? "",
    designation: u.designation ?? "",
    email: u.email,
    receiveNewRequests: !!u.isDefaultReviewer,
    loginEnabled: u.accountStatus !== "DISABLED" && u.accountStatus !== "DELETED",
    // "active" here specifically means "has accepted the invitation and set a
    // password" (credentialStatus === SET) — an INVITED reviewer can't sign in
    // yet, so they're not truly active even though their account isn't disabled.
    inviteStatus: u.credentialStatus === "SET" ? "active" : "invited",
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? undefined,
  };
}

/**
 * The backend stores first/last name separately; the builder form still collects one
 * "full name" field, so split it here. First word = first name, remainder = last name
 * (falls back to reusing the first word if there's no second word, since the backend
 * requires both to be non-empty).
 */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? name.trim();
  const lastName = parts.slice(1).join(" ") || firstName;
  return { firstName, lastName };
}

/**
 * `limit` defaults to a generous batch for callers that need the whole roster
 * (assign/replace-default logic, the "first reviewer" check, search pickers).
 * The Reviewer Accounts table uses `getReviewersPage` below instead, which
 * genuinely paginates server-side rather than truncating to one page's worth.
 */
export async function getReviewers(limit = 100): Promise<PublicReviewer[]> {
  const { data } = await axiosInstance.get("/admin/reviewers", { params: { limit } });
  return (data.data.reviewers as ReviewerApiUser[]).map(toPublicReviewer);
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReviewerMetrics {
  total: number;
  defaultReviewers: number;
  pendingInvite: number;
  inactive: number;
}

export interface ReviewersPageResult {
  reviewers: PublicReviewer[];
  metrics?: ReviewerMetrics;
  pagination: ApiPagination;
}

/** Real server-side pagination — the request's `page`/`limit`/`search`/`status`/`isDefaultReviewer` match what the table actually shows. */
export async function getReviewersPage({
  page = 1,
  limit = 50,
  search = "",
  status,
  isDefaultReviewer,
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  isDefaultReviewer?: boolean | string;
}): Promise<ReviewersPageResult> {
  const normalizedStatus = status && status.toUpperCase() !== "ALL" ? status.toUpperCase() : undefined;
  let normalizedDefault: boolean | undefined = undefined;
  if (isDefaultReviewer === true || isDefaultReviewer === "true") {
    normalizedDefault = true;
  } else if (isDefaultReviewer === false || isDefaultReviewer === "false") {
    normalizedDefault = false;
  }

  const { data } = await axiosInstance.get("/admin/reviewers", {
    params: {
      page,
      limit,
      search: search.trim() || undefined,
      status: normalizedStatus,
      isDefaultReviewer: normalizedDefault,
    },
  });
  return {
    reviewers: (data.data.reviewers as ReviewerApiUser[]).map(toPublicReviewer),
    metrics: data.data?.metrics,
    pagination: data.pagination,
  };
}

export interface ReviewerActivityEntry {
  id: string;
  category: string;
  message: string;
  actorName: string;
  occurredAt: string;
}

export interface ReviewerDetail {
  reviewer: PublicReviewer;
  /** Up to the 5 most recent admin-visible account events for this reviewer — the backend doesn't expose more. */
  activities: ReviewerActivityEntry[];
}

interface ReviewerActivityApiEntry {
  _id: string;
  category: string;
  message: string;
  actor: { displayName?: string } | null;
  occurredAt: string;
}

/** The single-reviewer endpoint — used by the reviewer detail page instead of fetching everyone and filtering. */
export async function getReviewer(id: string): Promise<ReviewerDetail> {
  const { data } = await axiosInstance.get(`/admin/reviewers/${id}`);
  return {
    reviewer: toPublicReviewer(data.data.reviewer),
    activities: (data.data.activities as ReviewerActivityApiEntry[]).map((a) => ({
      id: a._id,
      category: a.category,
      message: a.message,
      actorName: a.actor?.displayName ?? "Unknown",
      occurredAt: a.occurredAt,
    })),
  };
}

/**
 * Resolves the Reviewer frontend origin to be sent in the `x-frontend-origin` header.
 * Allows the backend to construct action links (such as invitation & create-password links)
 * pointing to the Reviewer web app rather than the Admin portal.
 */
export function getReviewerFrontendOrigin(): string {
  const envOrigin =
    process.env.NEXT_PUBLIC_REVIEWER_APP_URL ||
    process.env.NEXT_PUBLIC_REVIEWER_URL ||
    process.env.NEXT_PUBLIC_REVIEWER_FRONTEND_ORIGIN;
  if (envOrigin && envOrigin.trim()) {
    return envOrigin.trim();
  }
  if (typeof window !== "undefined" && window.location.origin.includes("localhost")) {
    return "http://localhost:3001";
  }
  return "https://clubatibis-reviewer.vercel.app";
}

export async function createReviewer(payload: ReviewerFormPayload): Promise<PublicReviewer> {
  const { firstName, lastName } = payload.firstName && payload.lastName
    ? { firstName: payload.firstName.trim(), lastName: payload.lastName.trim() }
    : splitName(payload.name);
  const reviewerOrigin = getReviewerFrontendOrigin();
  const { data } = await axiosInstance.post(
    "/admin/reviewer-invitations",
    {
      employeeNumber: payload.employeeNumber.trim(),
      firstName,
      lastName,
      email: payload.email.trim(),
      designation: payload.designation?.trim() || undefined,
      isDefaultReviewer: payload.receiveNewRequests,
    },
    {
      headers: {
        "x-frontend-origin": reviewerOrigin,
      },
    }
  );
  return toPublicReviewer(data.data.user);
}

export async function updateReviewer(
  id: string,
  updates: Pick<ReviewerFormPayload, "name" | "employeeNumber" | "designation" | "email"> & {
    firstName?: string;
    lastName?: string;
  }
): Promise<PublicReviewer> {
  const { firstName, lastName } = updates.firstName && updates.lastName
    ? { firstName: updates.firstName.trim(), lastName: updates.lastName.trim() }
    : splitName(updates.name);
  const employeeNumber = updates.employeeNumber.trim();
  const { data } = await axiosInstance.patch(`/admin/reviewers/${id}`, {
    firstName,
    lastName,
    // Employee number is optional on this endpoint — omitted entirely when
    // blank rather than sent as an empty string, which the backend rejects.
    ...(employeeNumber ? { employeeNumber } : {}),
    email: updates.email.trim(),
    designation: updates.designation !== undefined ? (updates.designation.trim() || null) : undefined,
  });
  return toPublicReviewer(data.data.reviewer);
}

interface ReceiveToggle {
  id: string;
  enabled: boolean;
  /** Required when disabling the last Default Reviewer. */
  replacementId?: string;
}

/**
 * Toggling a reviewer's Default status is one PATCH — except turning off the
 * *last* Default Reviewer, which the backend refuses outright (409
 * LAST_DEFAULT_REVIEWER) unless another reviewer is promoted first. The
 * caller (use-reviewer-actions.tsx) is responsible for getting a
 * `replacementId` via its own confirmation dialog before calling this with
 * `enabled: false` — this function does not skip that step or guess a
 * replacement on its own.
 */
export async function setReceiveNewRequests({ id, enabled, replacementId }: ReceiveToggle): Promise<PublicReviewer> {
  if (!enabled && replacementId) {
    await axiosInstance.patch(`/admin/reviewers/${replacementId}`, { isDefaultReviewer: true });
  }
  const { data } = await axiosInstance.patch(`/admin/reviewers/${id}`, { isDefaultReviewer: enabled });
  return toPublicReviewer(data.data.reviewer);
}

export async function setLoginEnabled(id: string, enabled: boolean, replacementId?: string): Promise<PublicReviewer> {
  if (!enabled && replacementId) {
    await axiosInstance.patch(`/admin/reviewers/${replacementId}`, { isDefaultReviewer: true });
  }
  const { data } = await axiosInstance.patch(`/admin/accounts/${id}/status`, {
    status: enabled ? "ACTIVE" : "DISABLED",
  });
  return toPublicReviewer(data.data.user);
}

export async function resendInvitation(id: string): Promise<void> {
  const reviewerOrigin = getReviewerFrontendOrigin();
  await axiosInstance.post(
    `/admin/reviewer-invitations/${id}/resend`,
    {},
    {
      headers: {
        "x-frontend-origin": reviewerOrigin,
      },
    }
  );
}
