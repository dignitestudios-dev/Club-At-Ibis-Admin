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

export interface ResidentsPageResult {
  residents: Resident[];
  pagination: ApiPagination;
}

/** Real server-side pagination — the request's `page`/`limit`/`search` match what the table actually shows. */
export async function getResidentsPage({
  page = 1,
  limit = 50,
  search = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ResidentsPageResult> {
  const { data } = await axiosInstance.get("/admin/residents", {
    params: { page, limit, search: search.trim() || undefined },
  });
  return {
    residents: (data.data.residents as ResidentApiUser[]).map(toResident),
    pagination: data.pagination,
  };
}

/** The single-resident endpoint — used by the resident detail page instead of fetching everyone and filtering. */
export async function getResident(id: string): Promise<Resident> {
  const { data } = await axiosInstance.get(`/admin/residents/${id}`);
  return toResident(data.data.resident);
}

export async function setResidentActive(id: string, active: boolean): Promise<Resident> {
  const { data } = await axiosInstance.patch(`/admin/accounts/${id}/status`, {
    status: active ? "ACTIVE" : "DISABLED",
  });
  return toResident(data.data.user);
}
