import { db, delay } from "@/lib/mock/store";

function toPublic(reviewer: Reviewer): PublicReviewer {
  const { password: _password, ...rest } = reviewer;
  return rest;
}

/**
 * Mock reviewer data, for the parts of the app that still work against mock
 * Requests (assignment, request detail/filters, dashboard, global search) and
 * so can't switch to the real reviewers API until Requests has one too — real
 * reviewer ids wouldn't match anything in the mock request data. The actual
 * Reviewer Accounts page uses the real API — see reviewers.service.ts.
 */
export async function getMockReviewers(): Promise<PublicReviewer[]> {
  return delay(db.getReviewers().map(toPublic), 60);
}
