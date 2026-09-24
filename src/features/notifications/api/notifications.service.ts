import axiosInstance from "@/lib/axios";

interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity: { kind: string; id: string } | null;
  link: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

function toAdminNotification(raw: any): AdminNotification {
  const rawType = String(raw.type || "").trim();
  let type: AdminNotificationType = "action_required";
  if (rawType === "new_submission" || rawType === "request_submitted" || rawType === "incoming_request" || rawType === "submitted" || rawType === "admin_submission") {
    type = "new_submission";
  } else if (rawType === "resubmission" || rawType === "resubmitted") {
    type = "resubmission";
  } else if (rawType === "request_update" || rawType === "request_assigned" || rawType === "new_assignment" || rawType === "assigned" || rawType === "reassigned" || rawType === "updated") {
    type = "request_update";
  } else if (rawType === "withdrawal" || rawType === "withdrawn") {
    type = "withdrawal";
  } else if (rawType === "action_required") {
    type = "action_required";
  }

  return {
    id: raw.id || raw._id,
    type,
    title: raw.title ?? "",
    message: raw.message ?? "",
    requestId: raw.entity?.kind === "request" ? raw.entity.id : (raw.entityId || raw.requestId || null),
    read: Boolean(raw.read || raw.readAt),
    createdAt: raw.createdAt,
  };
}

export async function getNotifications(limit = 100): Promise<AdminNotification[]> {
  const { data } = await axiosInstance.get("/admin/notifications", { params: { limit } });
  const list = data?.data?.notifications || [];
  return (list as any[]).map(toAdminNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await axiosInstance.patch(`/admin/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await axiosInstance.post("/admin/notifications/read-all");
}
