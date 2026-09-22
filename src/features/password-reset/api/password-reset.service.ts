import axiosInstance from "@/lib/axios";

/** The backend has no password-reset history endpoint yet, so this list stays empty. */
export async function getResets(): Promise<PasswordResetRecord[]> {
  return [];
}

export interface SendResetPayload {
  userKind: "resident" | "reviewer";
  userId: string;
}

export async function sendPasswordReset({ userId }: SendResetPayload): Promise<void> {
  await axiosInstance.post(`/admin/accounts/${userId}/password-reset-requests`);
}

export interface SetPasswordPayload {
  userKind: "resident" | "reviewer";
  userId: string;
  password: string;
}

export async function setUserPassword({ userId, password }: SetPasswordPayload): Promise<void> {
  await axiosInstance.post(`/admin/accounts/${userId}/password-changes`, {
    newPassword: password,
  });
}
