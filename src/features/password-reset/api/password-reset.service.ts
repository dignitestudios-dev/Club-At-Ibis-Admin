import { db, delay } from "@/lib/mock/store";
import { logActivity, currentAdminActor } from "@/lib/mock/activity";

export async function getResets(): Promise<PasswordResetRecord[]> {
  return delay(
    [...db.getResets()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    60
  );
}

export interface SendResetPayload {
  userKind: "resident" | "reviewer";
  userId: string;
}

export async function sendPasswordReset({
  userKind,
  userId,
}: SendResetPayload): Promise<PasswordResetRecord> {
  let name = "";
  let email = "";
  if (userKind === "resident") {
    const resident = db.getResidents().find((r) => r.id === userId);
    if (!resident) throw new Error("Resident not found.");
    if (!resident.active) throw new Error("This resident account is inactive.");
    name = `${resident.firstName} ${resident.lastName}`;
    email = resident.email;
  } else {
    const reviewer = db.getReviewers().find((r) => r.id === userId);
    if (!reviewer) throw new Error("Reviewer not found.");
    if (!reviewer.loginEnabled) throw new Error("This reviewer account is inactive.");
    name = reviewer.name;
    email = reviewer.email;
  }
  const record: PasswordResetRecord = {
    id: crypto.randomUUID(),
    userKind,
    userId,
    userName: name,
    email,
    initiatedBy: currentAdminActor().name,
    status: "sent",
    createdAt: new Date().toISOString(),
  };
  db.setResets([record, ...db.getResets()]);
  // The reset *initiation* is recorded in the system activity history.
  logActivity({
    category: "security",
    type: "password_reset_sent",
    message: `Sent password-reset link to ${userKind} ${name}.`,
    target: { kind: userKind, id: userId, label: name },
  });
  return delay(record, 250);
}
