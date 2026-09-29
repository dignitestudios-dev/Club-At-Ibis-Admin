import axiosInstance from "@/lib/axios";

function toActivityEntry(a: any): ActivityLogEntry {
  return {
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
  };
}

export interface AdminDashboardResult {
  attention: {
    total: number;
    waitingInIntake: number;
    resubmitted: number;
    approvedNotCompleted: number;
    refundsAwaitingAction: number;
  };
  requests: {
    total: number;
    statusCounts: Partial<Record<RequestStatus, number>>;
  };
  recentActivity: ActivityLogEntry[];
}

/** GET /admin/dashboard — the single source for every Admin dashboard number; no separate fetch-all requests/reviewers/activity calls. */
export async function getAdminDashboard(): Promise<AdminDashboardResult> {
  const { data } = await axiosInstance.get("/admin/dashboard");
  const d = data.data;
  return {
    attention: {
      total: d.attention?.total ?? 0,
      waitingInIntake: d.attention?.waitingInIntake ?? 0,
      resubmitted: d.attention?.resubmitted ?? 0,
      approvedNotCompleted: d.attention?.approvedNotCompleted ?? 0,
      refundsAwaitingAction: d.attention?.refundsAwaitingAction ?? 0,
    },
    requests: {
      total: d.requests?.total ?? 0,
      statusCounts: d.requests?.statusCounts ?? {},
    },
    recentActivity: (d.recentActivity ?? []).map(toActivityEntry),
  };
}
