import axiosInstance from "@/lib/axios";
import { db, delay } from "@/lib/mock/store";
import { logActivity } from "@/lib/mock/activity";

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
    draftRevision: raw.draftRevision,
    currentStep: raw.currentStep,
    fieldValues,
    uploads,
    itemReviews: raw.itemReviews || {},
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
    history: Array.isArray(raw.history) ? raw.history.map((h: any) => ({
      id: h.id || h._id || crypto.randomUUID(),
      type: (h.type?.replace(/^request\./, "") || "submitted") as HistoryEventType,
      actor: typeof h.actor === "string" ? { name: h.actor, role: "super_admin" as const } : {
        name: h.actor?.displayName || h.actor?.name || "User",
        role: (h.actor?.role === "super_admin" || h.actor?.role === "admin" ? "super_admin" : h.actor?.role === "reviewer" ? "reviewer" : h.actor?.role === "resident" ? "resident" : "system") as ActorRole,
      },
      message: h.message || "",
      createdAt: h.occurredAt || h.createdAt || new Date().toISOString(),
      assignment: h.details?.assignment || h.assignment,
      staffOnly: !!(h.details?.staffOnly || h.staffOnly),
    })) : (Array.isArray(raw.activity) ? raw.activity.map((a: any) => ({
      id: a.id || crypto.randomUUID(),
      type: a.type || "updated",
      actor: { name: a.actor || "User", role: "super_admin" as const },
      message: a.message || "",
      createdAt: a.createdAt || new Date().toISOString(),
    })) : []),
  };
}

export async function getRequests(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<RequestRecord[]> {
  try {
    const { data } = await axiosInstance.get("/admin/requests", { params });
    const list = data?.data?.requests ?? data?.requests ?? [];
    return list.map(toAdminRequestRecord);
  } catch {
    const all = db.getRequests();
    return delay(
      [...all].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
      80
    );
  }
}

export async function getRequestById(id: string): Promise<RequestRecord> {
  try {
    const { data } = await axiosInstance.get(`/admin/requests/${id}`);
    const req = data?.data?.request ?? data?.request ?? data?.data;
    if (req) {
      return toAdminRequestRecord(req);
    }
  } catch {
    // fallback to mock store in dev/offline
  }
  const all = db.getRequests();
  const match = all.find((r) => r.id === id);
  if (!match) throw new Error("Request not found");
  return delay(match, 80);
}

export async function recordExport(count: number, summary: string): Promise<void> {
  logActivity({
    category: "export",
    type: "requests_exported",
    message: `Exported ${count} request${count === 1 ? "" : "s"} to CSV${summary ? ` (${summary})` : ""}.`,
    target: { kind: "system", id: "export", label: "Request export" },
  });
  return delay(undefined, 60);
}
