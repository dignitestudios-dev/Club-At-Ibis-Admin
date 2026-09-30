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
  const firstName = (u.firstName ?? "").trim();
  const lastName = (u.lastName ?? "").trim();
  // The invite form lets the admin leave last name blank, but the backend
  // requires a non-empty lastName on create — createReviewer()/updateReviewer()
  // below fall back to reusing the first name in that case (the same fallback
  // splitName() has always used), which is what's stored. Detect that
  // synthetic duplicate here so every screen that reads `.name` shows just
  // the first name instead of "Riley Riley".
  const hasDistinctLastName = !!lastName && lastName.toLowerCase() !== firstName.toLowerCase();
  return {
    id: u._id,
    name: hasDistinctLastName ? `${firstName} ${lastName}`.trim() : firstName,
    employeeNumber: u.employeeNumber ?? "",
    designation: u.designation ?? "",
    email: u.email,
    receiveNewRequests: !!u.isDefaultReviewer,
    loginEnabled: u.accountStatus !== "DISABLED" && u.accountStatus !== "DELETED",
    // "active" here specifically means "has accepted the invitation and set a
    // password" (credentialStatus === SET). An INVITED reviewer can't sign in
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
export async function getReviewers(
  params?: { limit?: number; search?: string; status?: string } | number
): Promise<PublicReviewer[]> {
  const query =
    typeof params === "number"
      ? { limit: params }
      : {
          limit: params?.limit ?? 100,
          search: params?.search?.trim() || undefined,
          status: params?.status && params.status.toUpperCase() !== "ALL" ? params.status.toUpperCase() : undefined,
        };
  const { data } = await axiosInstance.get("/admin/reviewers", { params: query });
  const list = data?.data?.reviewers ?? data?.reviewers ?? [];
  return (list as ReviewerApiUser[]).map(toPublicReviewer);
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

/** Real server-side pagination: the request's `page`/`limit`/`search`/`status`/`isDefaultReviewer` match what the table actually shows. */
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
  actorId: string | null;
  actorRole: string | null;
  occurredAt: string;
}

export interface ReviewerDetail {
  reviewer: PublicReviewer;
  /** Up to the 5 most recent admin-visible account events for this reviewer (the backend doesn't expose more). */
  activities: ReviewerActivityEntry[];
}

interface ReviewerActivityApiEntry {
  _id: string;
  category: string;
  message: string;
  actor: { _id?: string; role?: string; displayName?: string } | null;
  occurredAt: string;
}

/** The single-reviewer endpoint (used by the reviewer detail page instead of fetching everyone and filtering). */
export async function getReviewer(id: string): Promise<ReviewerDetail> {
  const { data } = await axiosInstance.get(`/admin/reviewers/${id}`);
  return {
    reviewer: toPublicReviewer(data.data.reviewer),
    activities: (data.data.activities as ReviewerActivityApiEntry[]).map((a) => ({
      id: a._id,
      category: a.category,
      message: a.message,
      actorName: a.actor?.displayName ?? "Unknown",
      actorId: a.actor?._id ?? null,
      actorRole: a.actor?.role ?? null,
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
  // Never send a localhost origin to the backend — it ends up in emailed
  // action links (invitation / create-password), which must always point
  // to the real deployed Reviewer app regardless of where this Admin app
  // itself happens to be running from.
  return "https://clubatibis-reviewer.vercel.app";
}

export async function createReviewer(payload: ReviewerFormPayload): Promise<PublicReviewer> {
  const firstName = (payload.firstName || payload.name?.split(" ")[0] || "").trim();
  // The backend requires a non-empty lastName on create (inviteReviewer validator
  // has no `.optional()`) — the form enforces this too, so it's always present here.
  const lastName = (
    payload.lastName !== undefined
      ? payload.lastName
      : payload.name?.trim().split(/\s+/).slice(1).join(" ") ?? ""
  ).trim();
  const employeeNumber = payload.employeeNumber?.trim() || undefined;
  const designation = payload.designation?.trim() || undefined;
  const reviewerOrigin = getReviewerFrontendOrigin();

  const requestBody: Record<string, any> = {
    firstName,
    lastName,
    email: payload.email.trim(),
    isDefaultReviewer: !!payload.receiveNewRequests,
  };

  // These stay genuinely optional on the backend, so only send when filled.
  if (employeeNumber) {
    requestBody.employeeNumber = employeeNumber;
  }
  if (designation) {
    requestBody.designation = designation;
  }

  const { data } = await axiosInstance.post(
    "/admin/reviewer-invitations",
    requestBody,
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
  const firstName = (updates.firstName || updates.name?.split(" ")[0] || "").trim();
  // Unlike employeeNumber/designation, lastName can never legitimately be
  // cleared — the backend model requires it on every reviewer — so it's
  // always sent as a real value here, the same as firstName, rather than
  // omitted when blank (which used to silently make "removing the last
  // name" in the edit form a no-op).
  const lastName = (
    updates.lastName !== undefined
      ? updates.lastName
      : updates.name?.trim().split(/\s+/).slice(1).join(" ") ?? ""
  ).trim();
  const employeeNumber = updates.employeeNumber?.trim() || undefined;
  const designation = updates.designation !== undefined ? (updates.designation.trim() || null) : undefined;

  const requestBody: Record<string, any> = {
    firstName,
    lastName,
    email: updates.email.trim(),
  };

  if (updates.employeeNumber !== undefined) {
    if (employeeNumber) {
      requestBody.employeeNumber = employeeNumber;
    }
  }

  if (designation !== undefined) {
    requestBody.designation = designation;
  }

  const { data } = await axiosInstance.patch(`/admin/reviewers/${id}`, requestBody);
  return toPublicReviewer(data.data.reviewer);
}

interface ReceiveToggle {
  id: string;
  enabled: boolean;
  /** Required when disabling the last Default Reviewer. */
  replacementId?: string;
}

/**
 * Toggling a reviewer's Default status is one PATCH, except turning off the
 * *last* Default Reviewer, which the backend refuses outright (409
 * LAST_DEFAULT_REVIEWER) unless another reviewer is promoted first. The
 * caller (use-reviewer-actions.tsx) is responsible for getting a
 * `replacementId` via its own confirmation dialog before calling this with
 * `enabled: false`: this function does not skip that step or guess a
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
