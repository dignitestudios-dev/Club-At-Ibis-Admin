import { db, delay } from "@/lib/mock/store";

/**
 * Mock resident data, for the parts of the app that still work against mock
 * Requests (assignment, request detail/filters, dashboard, global search) and
 * so can't switch to the real residents API until Requests has one too — real
 * resident ids wouldn't match anything in the mock request data. The actual
 * Resident Records page uses the real API — see residents.service.ts.
 */
export async function getMockResidents(): Promise<Resident[]> {
  return delay(db.getResidents(), 60);
}
