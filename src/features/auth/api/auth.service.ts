import { db, delay } from "@/lib/mock/store";

function toPublic(admin: AdminUser): PublicAdmin {
  const { password: _password, ...rest } = admin;
  return rest;
}

export async function getCurrentUser(): Promise<PublicAdmin | null> {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("caia.logged-out") === "true") return null;

  const stored = localStorage.getItem("auth-user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as PublicAdmin;
      const found = db.getAdmins().find((a) => a.id === parsed?.id);
      if (found) return delay(toPublic(found), 40);
    } catch {
      // fall through to default demo admin
    }
  }
  const admin = db.getAdmins()[0];
  return delay(admin ? toPublic(admin) : null, 40);
}

export async function loginUser(credentials: LoginCredentials): Promise<PublicAdmin> {
  const match = db
    .getAdmins()
    .find(
      (a) =>
        a.email.toLowerCase() === credentials.email.toLowerCase() &&
        a.password === credentials.password
    );
  if (!match) {
    await delay(null, 150);
    throw new Error("Invalid email or password.");
  }
  return delay(toPublic(match), 180);
}

export async function requestPasswordReset({ email }: ForgotPasswordPayload): Promise<void> {
  const match = db.getAdmins().find((a) => a.email.toLowerCase() === email.toLowerCase());
  // Always resolve the same way so the form never reveals which emails exist.
  if (match) {
    console.info(`[mock email] Password reset link: /auth/reset-password?token=${btoa(match.id)}`);
  }
  return delay(undefined, 200);
}

export async function resetPassword({ token, password }: ResetPasswordPayload): Promise<void> {
  let adminId: string;
  try {
    adminId = atob(token);
  } catch {
    await delay(null, 150);
    throw new Error("This reset link is invalid or has expired.");
  }
  const admins = db.getAdmins();
  const idx = admins.findIndex((a) => a.id === adminId);
  if (idx === -1) {
    await delay(null, 150);
    throw new Error("This reset link is invalid or has expired.");
  }
  const next = [...admins];
  next[idx] = { ...next[idx], password };
  db.setAdmins(next);
  return delay(undefined, 180);
}

export async function changeAdminPassword(id: string, payload: ChangePasswordPayload): Promise<void> {
  const admins = db.getAdmins();
  const idx = admins.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Account not found.");
  if (admins[idx].password !== payload.currentPassword) {
    await delay(null, 150);
    throw new Error("The current password you entered is incorrect.");
  }
  const next = [...admins];
  next[idx] = { ...next[idx], password: payload.newPassword };
  db.setAdmins(next);
  return delay(undefined, 180);
}
