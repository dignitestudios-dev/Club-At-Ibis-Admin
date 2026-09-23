import axiosInstance from "@/lib/axios";

/** The backend has no password-reset history endpoint yet, so this list stays empty. */
export async function getResets(): Promise<PasswordResetRecord[]> {
  return [];
}

export interface SendResetPayload {
  userKind: "resident" | "reviewer";
  userId: string;
}

export async function sendPasswordReset({ userKind, userId }: SendResetPayload): Promise<void> {
  const isLocal = typeof window !== "undefined" && window.location.origin.includes("localhost");
  const origin =
    userKind === "reviewer"
      ? process.env.NEXT_PUBLIC_REVIEWER_APP_URL ||
        process.env.NEXT_PUBLIC_REVIEWER_URL ||
        (isLocal ? "http://localhost:3001" : "https://clubatibis-reviewer.vercel.app")
      : process.env.NEXT_PUBLIC_RESIDENT_APP_URL ||
        process.env.NEXT_PUBLIC_RESIDENT_URL ||
        (isLocal ? "http://localhost:3000" : "https://clubatibis-resident.vercel.app");

  await axiosInstance.post(
    `/admin/accounts/${userId}/password-reset-requests`,
    {},
    {
      headers: {
        "x-frontend-origin": origin,
      },
    }
  );
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
