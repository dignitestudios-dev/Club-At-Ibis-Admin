import { db, delay } from "@/lib/mock/store";
import { logActivity, pushAdminNotification } from "@/lib/mock/activity";

function toPublic(reviewer: Reviewer): PublicReviewer {
  const { password: _password, ...rest } = reviewer;
  return rest;
}

/** Reviewers that will actually receive new requests. */
function activeDefaults(reviewers: Reviewer[]) {
  return reviewers.filter((r) => r.receiveNewRequests && r.loginEnabled);
}

export async function getReviewers(): Promise<PublicReviewer[]> {
  return delay(db.getReviewers().map(toPublic), 60);
}

function assertUnique(reviewers: Reviewer[], email: string, employeeNumber: string, ignoreId?: string) {
  if (reviewers.some((r) => r.id !== ignoreId && r.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("A reviewer with this email already exists.");
  }
  if (
    reviewers.some(
      (r) => r.id !== ignoreId && r.employeeNumber.toLowerCase() === employeeNumber.toLowerCase()
    )
  ) {
    throw new Error("That employee number is already assigned to another reviewer.");
  }
}

export async function createReviewer(payload: ReviewerFormPayload): Promise<PublicReviewer> {
  const reviewers = db.getReviewers();
  assertUnique(reviewers, payload.email.trim(), payload.employeeNumber.trim());

  // The first reviewer always becomes the initial default recipient.
  const isFirst = activeDefaults(reviewers).length === 0;
  const reviewer: Reviewer = {
    id: crypto.randomUUID(),
    name: payload.name.trim(),
    employeeNumber: payload.employeeNumber.trim(),
    designation: payload.designation.trim(),
    email: payload.email.trim(),
    // No password yet — the reviewer creates their own from the emailed invitation link.
    password: "",
    receiveNewRequests: isFirst ? true : payload.receiveNewRequests,
    loginEnabled: true,
    inviteStatus: "invited",
    createdAt: new Date().toISOString(),
  };
  db.setReviewers([...reviewers, reviewer]);
  logActivity({
    category: "account",
    type: "reviewer_created",
    message: `Created reviewer account for ${reviewer.name} (${reviewer.employeeNumber}). Invitation link sent to ${reviewer.email}.`,
    target: { kind: "reviewer", id: reviewer.id, label: reviewer.name },
  });
  if (reviewer.receiveNewRequests) {
    logActivity({
      category: "routing",
      type: "default_reviewer_enabled",
      message: `Made ${reviewer.name} a default reviewer (Receive New Requests on).`,
      target: { kind: "reviewer", id: reviewer.id, label: reviewer.name },
    });
  }
  return delay(toPublic(reviewer), 200);
}

export async function updateReviewer(
  id: string,
  updates: Pick<ReviewerFormPayload, "name" | "employeeNumber" | "designation" | "email">
): Promise<PublicReviewer> {
  const reviewers = db.getReviewers();
  const idx = reviewers.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("Reviewer not found.");
  assertUnique(reviewers, updates.email.trim(), updates.employeeNumber.trim(), id);
  const next = [...reviewers];
  next[idx] = {
    ...next[idx],
    name: updates.name.trim(),
    employeeNumber: updates.employeeNumber.trim(),
    designation: updates.designation.trim(),
    email: updates.email.trim(),
  };
  db.setReviewers(next);
  logActivity({
    category: "account",
    type: "reviewer_updated",
    message: `Updated reviewer account details for ${next[idx].name}.`,
    target: { kind: "reviewer", id, label: next[idx].name },
  });
  return delay(toPublic(next[idx]), 160);
}

interface ReceiveToggle {
  id: string;
  enabled: boolean;
  /** Required when disabling the last Default Reviewer. */
  replacementId?: string;
}

export async function setReceiveNewRequests({
  id,
  enabled,
  replacementId,
}: ReceiveToggle): Promise<PublicReviewer> {
  let reviewers = db.getReviewers();
  const target = reviewers.find((r) => r.id === id);
  if (!target) throw new Error("Reviewer not found.");

  if (!enabled && target.receiveNewRequests) {
    const remaining = activeDefaults(reviewers).filter((r) => r.id !== id);
    if (remaining.length === 0) {
      if (!replacementId) {
        throw new Error("At least one Default Reviewer must remain. Select a replacement first.");
      }
      const replacement = reviewers.find((r) => r.id === replacementId && r.loginEnabled);
      if (!replacement) throw new Error("The selected replacement cannot receive requests.");
      reviewers = reviewers.map((r) =>
        r.id === replacementId ? { ...r, receiveNewRequests: true } : r
      );
      logActivity({
        category: "routing",
        type: "default_reviewer_replaced",
        message: `Replaced ${target.name} with ${replacement.name} as default reviewer.`,
        target: { kind: "reviewer", id: replacement.id, label: replacement.name },
      });
      pushAdminNotification({
        type: "request_update",
        title: "Default reviewer changed",
        message: `${replacement.name} is now the default recipient for new requests.`,
        requestId: null,
      });
    }
  }

  const next = reviewers.map((r) => (r.id === id ? { ...r, receiveNewRequests: enabled } : r));
  db.setReviewers(next);
  if (!replacementId || enabled) {
    logActivity({
      category: "routing",
      type: enabled ? "default_reviewer_enabled" : "default_reviewer_disabled",
      message: enabled
        ? `Made ${target.name} a default reviewer (Receive New Requests on).`
        : `Removed ${target.name} from default reviewers (Receive New Requests off).`,
      target: { kind: "reviewer", id, label: target.name },
    });
  }
  return delay(toPublic(next.find((r) => r.id === id)!), 140);
}

export async function setLoginEnabled(
  id: string,
  enabled: boolean,
  replacementId?: string
): Promise<PublicReviewer> {
  let reviewers = db.getReviewers();
  const target = reviewers.find((r) => r.id === id);
  if (!target) throw new Error("Reviewer not found.");

  if (!enabled && target.receiveNewRequests) {
    const remaining = activeDefaults(reviewers).filter((r) => r.id !== id);
    if (remaining.length === 0) {
      if (!replacementId) {
        throw new Error("At least one Default Reviewer must remain. Select a replacement first.");
      }
      reviewers = reviewers.map((r) =>
        r.id === replacementId ? { ...r, receiveNewRequests: true } : r
      );
    }
  }
  const next = reviewers.map((r) =>
    r.id === id
      ? { ...r, loginEnabled: enabled, receiveNewRequests: enabled ? r.receiveNewRequests : false }
      : r
  );
  db.setReviewers(next);
  logActivity({
    category: "account",
    type: enabled ? "reviewer_login_enabled" : "reviewer_login_disabled",
    message: `${enabled ? "Activated" : "Deactivated"} reviewer account for ${target.name}.`,
    target: { kind: "reviewer", id, label: target.name },
  });
  return delay(toPublic(next.find((r) => r.id === id)!), 140);
}

export async function resendInvitation(id: string): Promise<PublicReviewer> {
  const reviewers = db.getReviewers();
  const target = reviewers.find((r) => r.id === id);
  if (!target) throw new Error("Reviewer not found.");
  if (target.inviteStatus !== "invited") throw new Error("This reviewer has already set a password.");
  if (!target.loginEnabled) throw new Error("This reviewer account is inactive.");
  logActivity({
    category: "account",
    type: "reviewer_invitation_resent",
    message: `Resent the invitation link to ${target.name} (${target.email}).`,
    target: { kind: "reviewer", id, label: target.name },
  });
  return delay(toPublic(target), 200);
}
