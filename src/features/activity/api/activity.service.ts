import axiosInstance from "@/lib/axios";

export async function getActivitiesPage(params?: ActivityQueryParams): Promise<ActivityPageResponse> {
  try {
    const { data } = await axiosInstance.get("/admin/activities", {
      params: {
        type: params?.type && params.type !== "all" ? params.type : undefined,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
      },
    });

    const rawList = data?.data?.activities ?? data?.activities ?? [];
    const rawPagination = data?.pagination ?? data?.data?.pagination ?? {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      total: rawList.length,
      totalPages: Math.ceil(rawList.length / (params?.limit ?? 20)) || 1,
    };

    const activities: ActivityLogEntry[] = rawList.map((a: any) => ({
      id: String(a.id || a._id || crypto.randomUUID()),
      category: (a.type || "accounts") as ActivityCategory,
      type: a.type || "accounts",
      action: a.action || "",
      message: a.message || a.summary || a.description || "",
      actor: {
        id: a.actor?.id ? String(a.actor.id) : null,
        name: a.actor?.displayName || a.actor?.name || "System",
        role: a.actor?.role || "SUPER_ADMIN",
      },
      target: a.target
        ? {
            kind: a.target.kind || "system",
            id: a.target.id ? String(a.target.id) : null,
            label: a.target.label || "",
            role: a.target.role,
          }
        : undefined,
      details: a.details || {},
      createdAt: a.occurredAt || a.createdAt || new Date().toISOString(),
      occurredAt: a.occurredAt || a.createdAt || new Date().toISOString(),
    }));

    return {
      activities,
      pagination: {
        page: Number(rawPagination.page) || 1,
        limit: Number(rawPagination.limit) || 20,
        total: Number(rawPagination.total) || 0,
        totalPages: Number(rawPagination.totalPages) || 1,
      },
    };
  } catch {
    return {
      activities: [],
      pagination: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function getActivity(params?: ActivityQueryParams): Promise<ActivityLogEntry[]> {
  const result = await getActivitiesPage(params);
  return result.activities;
}
