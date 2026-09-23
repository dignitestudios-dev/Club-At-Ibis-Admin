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
  return {
    id: raw.id || raw._id,
    type: (raw.type as AdminNotificationType) || "action_required",
    title: raw.title ?? "",
    message: raw.message ?? "",
    requestId: raw.entity?.kind === "request" ? raw.entity.id : (raw.requestId ?? null),
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
