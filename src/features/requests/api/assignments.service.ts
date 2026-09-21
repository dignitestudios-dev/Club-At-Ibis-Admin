import { db, delay } from "@/lib/mock/store";
import { logActivity, currentAdminActor, pushAdminNotification } from "@/lib/mock/activity";
import { IN_FLIGHT } from "@/lib/domain";

export interface AssignPayload {
  requestId: string;
  reviewerId: string;
}

/**
 * Super Admin routes a request to any active reviewer — typically one that is
 * waiting in the default reviewers' intake, but also a reassignment. Ownership
 * moves to the chosen reviewer; the previous reviewer loses authority to act
 * on it, and earlier actions stay in the history.
 */
export async function assignRequest({ requestId, reviewerId }: AssignPayload): Promise<RequestRecord> {
  const requests = db.getRequests();
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx === -1) throw new Error("Request not found.");
  const request = requests[idx];
  if (!IN_FLIGHT.includes(request.status)) {
    throw new Error("Only requests that are still in progress can be assigned.");
  }
  const reviewers = db.getReviewers();
  const reviewer = reviewers.find((r) => r.id === reviewerId);
  if (!reviewer) throw new Error("Reviewer not found.");
  if (!reviewer.loginEnabled) throw new Error("Inactive reviewers cannot be assigned requests.");
  if (request.assignedReviewerId === reviewerId) throw new Error(`${reviewer.name} is already assigned to this request.`);

  const previous = request.assignedReviewerId ? reviewers.find((r) => r.id === request.assignedReviewerId) : undefined;
  const actor = currentAdminActor();
  const now = new Date().toISOString();
  const event: HistoryEvent = {
    id: crypto.randomUUID(),
    type: previous ? "reassigned" : "assigned",
    actor: { name: actor.name, role: "super_admin" },
    message: previous
      ? `Super Admin reassigned this request from ${previous.name} to ${reviewer.name}.`
      : `Super Admin assigned this request to ${reviewer.name}.`,
    detail: previous ? `${previous.name} no longer has authority to act on this request.` : undefined,
    assignment: { from: previous?.name, to: reviewer.name },
    createdAt: now,
  };
  const updated: RequestRecord = {
    ...request,
    assignedReviewerId: reviewerId,
    updatedAt: now,
    history: [...request.history, event],
  };
  const next = [...requests];
  next[idx] = updated;
  db.setRequests(next);

  logActivity({
    category: "routing",
    type: "request_assigned",
    message: previous
      ? `Reassigned ${request.code} from ${previous.name} to ${reviewer.name}.`
      : `Assigned ${request.code} to ${reviewer.name}.`,
    target: { kind: "request", id: request.id, label: request.code },
  });
  pushAdminNotification({
    type: "request_update",
    title: previous ? "Request reassigned" : "Request assigned",
    message: `${request.code} is now with ${reviewer.name}.`,
    requestId: request.id,
  });
  return delay(updated, 220);
}
