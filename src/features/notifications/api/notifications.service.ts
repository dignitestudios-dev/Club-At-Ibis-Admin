import { db, delay } from "@/lib/mock/store";

export async function getNotifications(): Promise<AdminNotification[]> {
  return delay(
    [...db.getNotifications()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    60
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  db.setNotifications(db.getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n)));
  return delay(undefined, 30);
}

export async function markAllNotificationsRead(): Promise<void> {
  db.setNotifications(db.getNotifications().map((n) => ({ ...n, read: true })));
  return delay(undefined, 40);
}
