import axiosInstance from "@/lib/axios";

/** Shape the backend's `adminAccountUser` presenter returns for a RESIDENT account. */
interface ResidentApiUser {
  _id: string;
  residentId: string;
  firstName: string;
  lastName: string;
  email: string;
  accountStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
}

function toResident(u: ResidentApiUser): Resident {
  return {
    id: u._id,
    residentIdNumber: u.residentId ?? "",
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    email: u.email,
    // The backend doesn't track these yet — see chat notes.
    phone: undefined,
    address: undefined,
    lotNo: undefined,
    active: u.accountStatus !== "DISABLED" && u.accountStatus !== "DELETED",
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt ?? undefined,
  };
}

/**
 * `limit` defaults to a generous batch for callers that need the whole roster
 * (search pickers, etc). The Resident Records table uses `getResidentsPage`
 * below instead, which genuinely paginates server-side.
 */
export async function getResidents(limit = 100): Promise<Resident[]> {
  const { data } = await axiosInstance.get("/admin/residents", { params: { limit } });
  return (data.data.residents as ResidentApiUser[]).map(toResident);
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResidentMetrics {
  total: number;
  active: number;
  inactive: number;
}

export interface ResidentsPageResult {
  residents: Resident[];
  metrics?: ResidentMetrics;
  pagination: ApiPagination;
}

/** Real server-side pagination — the request's `page`/`limit`/`search`/`status` match what the table actually shows. */
export async function getResidentsPage({
  page = 1,
  limit = 50,
  search = "",
  status,
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<ResidentsPageResult> {
  const normalizedStatus = status && status.toUpperCase() !== "ALL" ? status.toUpperCase() : undefined;
  const { data } = await axiosInstance.get("/admin/residents", {
    params: {
      page,
      limit,
      search: search.trim() || undefined,
      status: normalizedStatus,
    },
  });
  return {
    residents: (data.data.residents as ResidentApiUser[]).map(toResident),
    metrics: data.data?.metrics,
    pagination: data.pagination,
  };
}

export interface ResidentActivityEntry {
  id: string;
  eventType?: string;
  category: string;
  message: string;
  actorName: string;
  actorRole?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface ResidentDetail {
  resident: Resident;
  /** Up to the most recent account and security activity events for this resident */
  activities: ResidentActivityEntry[];
}

interface ResidentActivityApiEntry {
  _id: string;
  eventType?: string;
  category: string;
  message: string;
  actor: { _id?: string; role?: string; displayName?: string } | null;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

/** The single-resident endpoint — used by the resident detail page instead of fetching everyone and filtering. */
export async function getResident(id: string): Promise<ResidentDetail> {
  const { data } = await axiosInstance.get(`/admin/residents/${id}`);
  const rawResident = data.data.resident;
  const rawActivities = (data.data.activities as ResidentActivityApiEntry[]) || [];

  return {
    resident: toResident(rawResident),
    activities: rawActivities.map((a) => ({
      id: a._id,
      eventType: a.eventType,
      category: a.category || "Account",
      message: a.message,
      actorName: a.actor?.displayName ?? "System",
      actorRole: a.actor?.role,
      occurredAt: a.occurredAt,
      metadata: a.metadata,
    })),
  };
}

export async function setResidentActive(id: string, active: boolean): Promise<Resident> {
  const { data } = await axiosInstance.patch(`/admin/accounts/${id}/status`, {
    status: active ? "ACTIVE" : "DISABLED",
  });
  return toResident(data.data.user);
}
