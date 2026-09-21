import { db, delay } from "@/lib/mock/store";

export async function getActivity(): Promise<ActivityLogEntry[]> {
  return delay(
    [...db.getActivity()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    60
  );
}
