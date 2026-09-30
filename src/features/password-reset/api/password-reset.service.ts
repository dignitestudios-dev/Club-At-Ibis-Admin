import axiosInstance from "@/lib/axios";


export interface SendResetPayload {
  userKind: "resident" | "reviewer";
  userId: string;
}

export async function sendPasswordReset({ userKind, userId }: SendResetPayload): Promise<void> {
  // Never send a localhost origin to the backend — it ends up in the
  // emailed password-reset link, which must always point to the real
  // deployed app regardless of where this Admin app itself is running from.
  const origin =
    userKind === "reviewer"
      ? process.env.NEXT_PUBLIC_REVIEWER_APP_URL ||
        process.env.NEXT_PUBLIC_REVIEWER_URL ||
        "https://clubatibis-reviewer.vercel.app"
      : process.env.NEXT_PUBLIC_RESIDENT_APP_URL ||
        process.env.NEXT_PUBLIC_RESIDENT_URL ||
        "https://clubatibis-resident.vercel.app";

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
