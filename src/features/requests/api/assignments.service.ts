import axiosInstance from "@/lib/axios";
import { toAdminRequestRecord } from "./requests.service";

export interface AssignPayload {
  requestId: string;
  reviewerId: string;
  expectedAssignmentVersion?: number;
}

/**
 * Super Admin routes a request to any active reviewer.
 */
export async function assignRequest({
  requestId,
  reviewerId,
  expectedAssignmentVersion,
}: AssignPayload): Promise<RequestRecord> {
  const { data } = await axiosInstance.patch(`/admin/requests/${requestId}/assignment`, {
    reviewerId,
    expectedAssignmentVersion: expectedAssignmentVersion ?? 0,
  });
  return toAdminRequestRecord(data.data.request);
}
