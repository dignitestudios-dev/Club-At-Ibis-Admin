import { db, delay } from "@/lib/mock/store";
import { logActivity } from "@/lib/mock/activity";

export async function getRequests(): Promise<RequestRecord[]> {
  const all = db.getRequests();
  return delay(
    [...all].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)),
    80
  );
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
