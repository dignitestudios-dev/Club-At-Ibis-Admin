import { db } from "./store";

export function currentAdminActor(): ActivityLogEntry["actor"] {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("auth-user");
      if (raw) {
        const user = JSON.parse(raw) as PublicAdmin;
        if (user?.id) {
          return { id: user.id, name: `${user.firstName} ${user.lastName}`, role: "super_admin" };
        }
      }
    } catch {
      // fall through
    }
  }
  const fallback = db.getAdmins()[0];
  return { id: fallback.id, name: `${fallback.firstName} ${fallback.lastName}`, role: "super_admin" };
}

/** Records a system-activity entry, always attributed to the acting Super Admin. */
export function logActivity(
  input: Pick<ActivityLogEntry, "category" | "type" | "message" | "target">
): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    id: crypto.randomUUID(),
    ...input,
    actor: currentAdminActor(),
    createdAt: new Date().toISOString(),
  };
  db.setActivity([entry, ...db.getActivity()]);
  return entry;
}

export function pushAdminNotification(
  input: Pick<AdminNotification, "type" | "title" | "message" | "requestId">
) {
  db.setNotifications([
    { ...input, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() },
    ...db.getNotifications(),
  ]);
}
