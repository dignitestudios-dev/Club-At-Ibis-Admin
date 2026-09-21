import { daysAgo, hoursAgo } from "./date-helpers";
import { seedAdmin, seedResidents, seedReviewers } from "./people";
import { seedRequests } from "./requests";

const admin = { id: seedAdmin.id, name: `${seedAdmin.firstName} ${seedAdmin.lastName}`, role: "super_admin" as const };

function residentName(id: string) {
  const r = seedResidents.find((x) => x.id === id);
  return r ? `${r.firstName} ${r.lastName}` : "Resident";
}

/* ------------------------------------------------------------------ */
/* Super Admin oversight notifications — derived from request history   */
/* ------------------------------------------------------------------ */

function buildNotifications(): AdminNotification[] {
  const out: AdminNotification[] = [];
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const req of seedRequests) {
    for (const event of req.history) {
      if (new Date(event.createdAt).getTime() < cutoff) continue;
      const who = residentName(req.residentId);
      if (event.type === "submitted") {
        out.push({
          id: `n-${event.id}`,
          type: "new_submission",
          title: "New submission",
          message: `${who} submitted a ${req.categoryName} request (${req.code}).`,
          requestId: req.id,
          read: false,
          createdAt: event.createdAt,
        });
      } else if (event.type === "resubmitted") {
        out.push({
          id: `n-${event.id}`,
          type: "resubmission",
          title: "Resubmission received",
          message: `${who} resubmitted ${req.code} with corrected items.`,
          requestId: req.id,
          read: false,
          createdAt: event.createdAt,
        });
      } else if (event.type === "withdrawn") {
        out.push({
          id: `n-${event.id}`,
          type: "withdrawal",
          title: "Request withdrawn",
          message: `${who} withdrew ${req.code}${req.deposit.status === "received" ? " — deposit refund outcome pending." : "."}`,
          requestId: req.id,
          read: false,
          createdAt: event.createdAt,
        });
      } else if (["approved", "rejected", "completed"].includes(event.type)) {
        out.push({
          id: `n-${event.id}`,
          type: "request_update",
          title: `Request ${event.type}`,
          message: `${req.code} was ${event.type} by ${event.actor.name}.`,
          requestId: req.id,
          read: false,
          createdAt: event.createdAt,
        });
      }
    }
    if (req.refund?.outcome === "awaiting") {
      out.push({
        id: `n-refund-${req.id}`,
        type: "action_required",
        title: "Refund awaiting action",
        message: `${req.code} was withdrawn with a received deposit. Refund action is pending with the reviewer.`,
        requestId: req.id,
        read: false,
        createdAt: req.refund.date,
      });
    }
  }

  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  // Older notifications start as read so the unread count feels realistic.
  return out.slice(0, 40).map((n, i) => ({ ...n, read: i >= 12 }));
}

export const seedNotifications: AdminNotification[] = buildNotifications();

/* ------------------------------------------------------------------ */
/* System activity                                                      */
/* ------------------------------------------------------------------ */

const rv = (i: number) => seedReviewers[i - 1];

const baseActivity: ActivityLogEntry[] = [
  {
    id: "act-1",
    category: "account",
    type: "reviewer_created",
    message: `Created reviewer account for ${rv(5).name} (${rv(5).employeeNumber}). Invitation email sent.`,
    actor: admin,
    target: { kind: "reviewer", id: rv(5).id, label: rv(5).name },
    createdAt: daysAgo(6),
  },
  {
    id: "act-2",
    category: "category",
    type: "category_updated",
    message: "Updated category “Generator” to form v2 — added required document “Sound rating certificate (dBA)”.",
    actor: admin,
    target: { kind: "category", id: "generator", label: "Generator" },
    createdAt: daysAgo(24),
  },
  {
    id: "act-3",
    category: "security",
    type: "password_reset_sent",
    message: `Sent password-reset link to resident ${residentName("res-3")}.`,
    actor: admin,
    target: { kind: "resident", id: "res-3", label: residentName("res-3") },
    createdAt: daysAgo(4, 3),
  },
  {
    id: "act-4",
    category: "routing",
    type: "default_reviewer_enabled",
    message: `Made ${rv(2).name} a default reviewer (Receive New Requests on).`,
    actor: admin,
    target: { kind: "reviewer", id: rv(2).id, label: rv(2).name },
    createdAt: daysAgo(46),
  },
  {
    id: "act-7",
    category: "account",
    type: "reviewer_login_disabled",
    message: `Deactivated reviewer account for ${rv(6).name}.`,
    actor: admin,
    target: { kind: "reviewer", id: rv(6).id, label: rv(6).name },
    createdAt: daysAgo(68),
  },
  {
    id: "act-8",
    category: "export",
    type: "requests_exported",
    message: "Exported 37 requests to CSV (all statuses, all categories).",
    actor: admin,
    target: { kind: "system", id: "export", label: "Request export" },
    createdAt: daysAgo(12, 5),
  },
  {
    id: "act-11",
    category: "account",
    type: "resident_deactivated",
    message: `Deactivated resident account for ${residentName("res-9")}.`,
    actor: admin,
    target: { kind: "resident", id: "res-9", label: residentName("res-9") },
    createdAt: daysAgo(15, 4),
  },
  {
    id: "act-12",
    category: "routing",
    type: "default_reviewer_replaced",
    message: `Replaced ${rv(4).name} with ${rv(1).name} as default reviewer.`,
    actor: admin,
    target: { kind: "reviewer", id: rv(1).id, label: rv(1).name },
    createdAt: daysAgo(120),
  },
  {
    id: "act-13",
    category: "account",
    type: "reviewer_updated",
    message: `Updated reviewer account details for ${rv(3).name}.`,
    actor: admin,
    target: { kind: "reviewer", id: rv(3).id, label: rv(3).name },
    createdAt: daysAgo(33),
  },
  {
    id: "act-9",
    category: "category",
    type: "category_created",
    message: "Created category “Landscaping”.",
    actor: admin,
    target: { kind: "category", id: "landscaping", label: "Landscaping" },
    createdAt: daysAgo(380),
  },
  {
    id: "act-10",
    category: "security",
    type: "password_reset_sent",
    message: `Sent password-reset link to reviewer ${rv(3).name}.`,
    actor: admin,
    target: { kind: "reviewer", id: rv(3).id, label: rv(3).name },
    createdAt: hoursAgo(52),
  },
];


/* Additional account-management history so the activity views feel lived-in. */
type Extra = [type: string, category: ActivityCategory, kind: "reviewer" | "resident", id: string, message: string, days: number, hours?: number];

const res = (id: string) => residentName(id);

const extraRows: Extra[] = [
  ["reviewer_created", "account", "reviewer", rv(1).id, `Created reviewer account for ${rv(1).name} (${rv(1).employeeNumber}). Invitation email sent.`, 312],
  ["default_reviewer_enabled", "routing", "reviewer", rv(1).id, `Made ${rv(1).name} a default reviewer (Receive New Requests on).`, 312, 1],
  ["reviewer_created", "account", "reviewer", rv(2).id, `Created reviewer account for ${rv(2).name} (${rv(2).employeeNumber}). Invitation email sent.`, 242],
  ["reviewer_created", "account", "reviewer", rv(3).id, `Created reviewer account for ${rv(3).name} (${rv(3).employeeNumber}). Invitation email sent.`, 181],
  ["reviewer_created", "account", "reviewer", rv(4).id, `Created reviewer account for ${rv(4).name} (${rv(4).employeeNumber}). Invitation email sent.`, 121],
  ["reviewer_updated", "account", "reviewer", rv(2).id, `Updated reviewer account details for ${rv(2).name}.`, 205],
  ["reviewer_updated", "account", "reviewer", rv(4).id, `Updated reviewer account details for ${rv(4).name}.`, 88],
  ["reviewer_updated", "account", "reviewer", rv(1).id, `Updated reviewer account details for ${rv(1).name}.`, 19],
  ["reviewer_login_disabled", "account", "reviewer", rv(4).id, `Deactivated reviewer account for ${rv(4).name}.`, 101],
  ["reviewer_login_enabled", "account", "reviewer", rv(4).id, `Activated reviewer account for ${rv(4).name}.`, 97],
  ["default_reviewer_disabled", "routing", "reviewer", rv(2).id, `Removed ${rv(2).name} from default reviewers (Receive New Requests off).`, 160],
  ["default_reviewer_enabled", "routing", "reviewer", rv(2).id, `Made ${rv(2).name} a default reviewer (Receive New Requests on).`, 141],
  ["default_reviewer_replaced", "routing", "reviewer", rv(2).id, `Replaced ${rv(1).name} with ${rv(2).name} as default reviewer.`, 75],
  ["default_reviewer_enabled", "routing", "reviewer", rv(1).id, `Made ${rv(1).name} a default reviewer (Receive New Requests on).`, 74],
  ["resident_deactivated", "account", "resident", "res-4", `Deactivated resident account for ${res("res-4")}.`, 62],
  ["resident_activated", "account", "resident", "res-4", `Activated resident account for ${res("res-4")}.`, 58],
  ["resident_deactivated", "account", "resident", "res-2", `Deactivated resident account for ${res("res-2")}.`, 92],
  ["resident_activated", "account", "resident", "res-2", `Activated resident account for ${res("res-2")}.`, 90],
  ["password_reset_sent", "security", "resident", "res-1", `Sent password-reset link to resident ${res("res-1")}.`, 55],
  ["password_reset_sent", "security", "resident", "res-5", `Sent password-reset link to resident ${res("res-5")}.`, 41],
  ["password_reset_sent", "security", "resident", "res-8", `Sent password-reset link to resident ${res("res-8")}.`, 27],
  ["password_reset_sent", "security", "resident", "res-1", `Sent password-reset link to resident ${res("res-1")}.`, 9, 3],
  ["password_reset_sent", "security", "reviewer", rv(2).id, `Sent password-reset link to reviewer ${rv(2).name}.`, 36],
  ["password_changed", "security", "resident", "res-5", `Changed the password for resident ${res("res-5")}.`, 21],
  ["password_changed", "security", "reviewer", rv(3).id, `Changed the password for reviewer ${rv(3).name}.`, 16],
  ["request_assigned", "routing", "reviewer", rv(2).id, `Assigned ARB-${new Date().getFullYear()}-1024 to ${rv(2).name}.`, 11],
  ["password_reset_sent", "security", "reviewer", rv(4).id, `Sent password-reset link to reviewer ${rv(4).name}.`, 14],
  ["resident_deactivated", "account", "resident", "res-7", `Deactivated resident account for ${res("res-7")}.`, 6],
  ["resident_activated", "account", "resident", "res-7", `Activated resident account for ${res("res-7")}.`, 5],
];

const extraActivity: ActivityLogEntry[] = extraRows.map(([type, category, kind, targetId, message, days, hours], i) => ({
  id: `act-x${i + 1}`,
  category,
  type,
  message,
  actor: admin,
  target: {
    kind,
    id: targetId,
    label: kind === "resident" ? residentName(targetId) : seedReviewers.find((r) => r.id === targetId)?.name ?? "",
  },
  createdAt: daysAgo(days, hours ?? 0),
}));

export const seedActivity: ActivityLogEntry[] = [...baseActivity, ...extraActivity].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

/* ------------------------------------------------------------------ */
/* Password reset history                                               */
/* ------------------------------------------------------------------ */

export const seedResets: PasswordResetRecord[] = [
  {
    id: "reset-1",
    userKind: "reviewer",
    userId: rv(3).id,
    userName: rv(3).name,
    email: rv(3).email,
    initiatedBy: admin.name,
    status: "completed",
    createdAt: hoursAgo(52),
  },
  {
    id: "reset-2",
    userKind: "resident",
    userId: "res-3",
    userName: residentName("res-3"),
    email: seedResidents[2].email,
    initiatedBy: admin.name,
    status: "sent",
    createdAt: daysAgo(4, 3),
  },
  {
    id: "reset-3",
    userKind: "resident",
    userId: "res-6",
    userName: residentName("res-6"),
    email: seedResidents[5].email,
    initiatedBy: admin.name,
    status: "completed",
    createdAt: daysAgo(31),
  },
];
