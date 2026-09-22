import axiosInstance from "@/lib/axios";

/** Shape the backend's `publicAdmin` presenter returns (Admin model, minus password fields). */
interface AdminApiUser {
  _id: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  accountStatus: string;
  credentialStatus: string;
  createdAt: string;
}

function toPublicAdmin(u: AdminApiUser): PublicAdmin {
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    // The backend's Admin model doesn't track these yet.
    employeeNumber: "",
    designation: "Super Administrator",
    createdAt: u.createdAt,
  };
}

export async function getCurrentUser(): Promise<PublicAdmin | null> {
  if (typeof window === "undefined") return null;
  if (!localStorage.getItem("auth-token")) return null;
  try {
    const { data } = await axiosInstance.get("/admin/me");
    return toPublicAdmin(data.data.admin);
  } catch {
    return null;
  }
}

/** Real login. Callers store `token` (as `auth-token`) themselves — see login-form.tsx. */
export async function loginUser(credentials: LoginCredentials): Promise<{ token: string; admin: PublicAdmin }> {
  const { data } = await axiosInstance.post("/admin/login", credentials);
  return { token: data.data.token, admin: toPublicAdmin(data.data.admin) };
}

export async function logoutUser(): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
  if (!token) return;
  try {
    await axiosInstance.post("/admin/logout", null, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Best-effort — the caller clears the local session regardless.
  }
}

export async function requestPasswordReset({ email }: ForgotPasswordPayload): Promise<void> {
  await axiosInstance.post("/admin/password-reset-requests", {
    email: email.trim().toLowerCase(),
  });
}

export async function resetPassword({ token, password }: ResetPasswordPayload): Promise<void> {
  await axiosInstance.post("/admin/password-resets", {
    token,
    newPassword: password,
  });
}

export async function changeAdminPassword(_id: string, payload: ChangePasswordPayload): Promise<void> {
  await axiosInstance.post("/admin/password-changes", {
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword,
  });
}
