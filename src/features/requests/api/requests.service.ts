import axiosInstance from "@/lib/axios";

export function toAdminRequestRecord(raw: any): RequestRecord {
  const code = raw.reference || raw.code || "ARB-PENDING";
  const catId = raw.categoryId || raw.requestTypeId || raw.category?.id || "";
  const catName = raw.category?.name || raw.categoryName || "";
  const residentId = raw.residentId || raw.resident?.id || raw.resident?._id || "";

  const fieldValues = { ...(raw.fieldValues || {}) };
  if (raw.property?.address && !fieldValues.propertyAddress) {
    fieldValues.propertyAddress = raw.property.address;
  }
  if (raw.property?.lotNo && !fieldValues.lotNo) {
    fieldValues.lotNo = raw.property.lotNo;
  }

  const rawUploads = raw.files || raw.uploads || {};
  const uploads: Record<string, AttachedFile[]> = {};
  for (const [key, val] of Object.entries(rawUploads)) {
    if (Array.isArray(val)) {
      uploads[key] = val.map((f: any) => ({
        id: f.id || f._id || crypto.randomUUID(),
        name: f.name || f.originalName || f.filename || "file",
        originalName: f.originalName || f.filename || f.name || "file",
        size: f.size || 0,
        mimeType: f.mimeType || "application/octet-stream",
        uploadedAt: f.uploadedAt || f.createdAt || new Date().toISOString(),
        url: f.url || "",
      }));
    }
  }

  return {
    id: raw.id || raw._id,
    code,
    title: raw.title,
    categoryId: catId,
    categoryName: catName,
    categorySlug: raw.category?.slug || raw.categorySlug,
    category: raw.category,
    formVersion: raw.formVersion ?? raw.categoryFormVersion ?? 1,
    formSnapshot: raw.form?.fields || raw.formSnapshot || [],
    residentId,
    resident: raw.resident || raw.residentSnapshot,
    property: raw.property || {
      address: fieldValues.propertyAddress || null,
      lotNo: fieldValues.lotNo || null,
    },
    status: raw.status || "submitted",
    assignedReviewerId: raw.assignedReviewerId || raw.assignedReviewer?.id || null,
    assignmentVersion: raw.assignmentVersion,
    workflowVersion: raw.workflowVersion,
    draftRevision: raw.draftRevision,
    currentStep: raw.currentStep,
    fieldValues,
    uploads,
    itemReviews: (() => {
      const map: Record<string, ItemReview> = { ...(raw.itemReviews || {}) };
      if (raw.review?.items && Array.isArray(raw.review.items)) {
        for (const item of raw.review.items) {
          if (item.fieldId) {
            map[item.fieldId] = {
              state: item.decision,
              reason: item.reason || undefined,
              reviewer: item.decidedBy?.displayName,
              reviewedAt: item.decidedAt,
            };
          }
        }
      }
      return map;
    })(),
    review: raw.review,
    revision: raw.revision,
    submissions: raw.submissions,
    revisions: raw.revisions || [],
    previousSubmissions: raw.previousSubmissions || [],
    hoaApproved: !!(raw.hoaConfirmed ?? raw.hoaApproved),
    hoaConfirmedAt: raw.hoaConfirmedAt || raw.createdAt || new Date().toISOString(),
    submittedAt: raw.submittedAt || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    decidedAt: raw.decidedAt,
    completedAt: raw.completedAt,
    withdrawnAt: raw.withdrawnAt,
    withdrawnFrom: raw.withdrawnFrom,
    feedback: raw.feedback,
    rejectionReason: raw.rejectionReason,
    deposit: raw.deposit || {
      required: !!raw.depositRequired,
      amount: raw.depositAmount,
      status: raw.depositReceived ? "received" : raw.depositRequired ? "pending" : "not_required",
      confirmed: raw.depositRequired !== undefined,
    },
    refund: raw.refund || (raw.refundStatus ? {
      outcome: raw.refundStatus,
      recordedBy: "Staff",
      date: raw.refundDate || new Date().toISOString(),
    } : undefined),
    approvalLetter: raw.approvalLetter,
    letterEmail: raw.letterEmail,
    history: Array.isArray(raw.history) ? raw.history.map((h: any) => {
      const roleStr = (typeof h.actor === "object" ? h.actor?.role : "") || "";
      const normalizedRole = roleStr.toLowerCase() === "super_admin" || roleStr.toLowerCase() === "admin"
        ? "super_admin"
        : roleStr.toLowerCase() === "reviewer"
          ? "reviewer"
          : roleStr.toLowerCase() === "resident"
            ? "resident"
            : "system";

      return {
        id: h.id || h._id || crypto.randomUUID(),
        type: (h.type?.replace(/^request\./, "").replace(/-/g, "_") || "submitted") as HistoryEventType,
        actor: typeof h.actor === "string" ? { name: h.actor, role: "super_admin" as const } : {
          name: h.actor?.displayName || h.actor?.name || "User",
          role: normalizedRole as ActorRole,
        },
        message: h.message || "",
        detail: h.details?.reason || h.detail || undefined,
        createdAt: h.occurredAt || h.createdAt || new Date().toISOString(),
        assignment: h.details?.assignment || h.assignment,
        staffOnly: !!(h.details?.staffOnly || h.staffOnly),
        flaggedItems: Array.isArray(h.details?.flaggedItems) ? h.details.flaggedItems : undefined,
        submissionNumber: typeof h.details?.submissionNumber === "number" ? h.details.submissionNumber : undefined,
      };
    }) : (Array.isArray(raw.activity) ? raw.activity.map((a: any) => ({
      id: a.id || crypto.randomUUID(),
      type: a.type || "updated",
      actor: { name: a.actor || "User", role: "super_admin" as const },
      message: a.message || "",
      createdAt: a.createdAt || new Date().toISOString(),
    })) : []),
  };
}

export interface RequestsQueryParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  submittedFrom?: string;
  submittedTo?: string;
  categoryId?: string;
  categoryStatus?: string;
  assignedReviewerId?: string;
  depositStatus?: string;
  refundOutcome?: string;
}

export interface PaginatedRequestsResponse {
  requests: RequestRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function cleanRequestParams(params?: RequestsQueryParams): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!params) return clean;
  if (params.page) clean.page = params.page;
  if (params.limit) clean.limit = params.limit;
  if (params.search && params.search.trim()) clean.search = params.search.trim();
  if (params.status && params.status !== "all") clean.status = params.status;
  if (params.submittedFrom) clean.submittedFrom = params.submittedFrom;
  if (params.submittedTo) clean.submittedTo = params.submittedTo;
  if (params.categoryId && params.categoryId !== "all") clean.categoryId = params.categoryId;
  if (params.categoryStatus && params.categoryStatus !== "all") clean.categoryStatus = params.categoryStatus;
  if (params.assignedReviewerId && params.assignedReviewerId !== "all") clean.assignedReviewerId = params.assignedReviewerId;
  if (params.depositStatus && params.depositStatus !== "all") clean.depositStatus = params.depositStatus;
  if (params.refundOutcome && params.refundOutcome !== "all") clean.refundOutcome = params.refundOutcome;
  return clean;
}

export async function getRequestsPage(params?: RequestsQueryParams): Promise<PaginatedRequestsResponse> {
  const cleanParams = cleanRequestParams(params);
  const { data } = await axiosInstance.get("/admin/requests", { params: cleanParams });
  const list = data?.data?.requests ?? data?.requests ?? [];
  return {
    requests: list.map(toAdminRequestRecord),
    pagination: data?.pagination ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      total: list.length,
      totalPages: Math.ceil(list.length / (params?.limit ?? 20)) || 1,
    },
  };
}

export async function getRequests(params?: RequestsQueryParams): Promise<RequestRecord[]> {
  const cleanParams = cleanRequestParams(params);
  const { data } = await axiosInstance.get("/admin/requests", { params: cleanParams });
  const list = data?.data?.requests ?? data?.requests ?? [];
  return list.map(toAdminRequestRecord);
}

export async function getRequestById(id: string): Promise<RequestRecord> {
  const { data } = await axiosInstance.get(`/admin/requests/${id}`);
  const req = data?.data?.request ?? data?.request ?? data?.data;
  if (!req) throw new Error("Request not found");
  return toAdminRequestRecord(req);
}

export async function recordExport(_count: number, _summary: string): Promise<void> {
  // Client-side record export completed
}
