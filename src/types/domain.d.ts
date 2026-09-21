/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  employeeNumber: string;
  designation: string;
  createdAt: string;
}

type PublicAdmin = Omit<AdminUser, "password">;

interface LoginCredentials {
  email: string;
  password: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface AuthState {
  user: PublicAdmin | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

interface Reviewer {
  id: string;
  name: string;
  employeeNumber: string;
  designation: string;
  email: string;
  password: string;
  /** "Receive New Requests" — the reviewer is a Default Reviewer. */
  receiveNewRequests: boolean;
  /** Account status. Inactive reviewers cannot sign in. */
  loginEnabled: boolean;
  inviteStatus: "invited" | "active";
  createdAt: string;
  lastLoginAt?: string;
}

type PublicReviewer = Omit<Reviewer, "password">;

interface Resident {
  id: string;
  residentIdNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  lotNo?: string;
  /** Inactive residents cannot sign in. */
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface ReviewerFormPayload {
  name: string;
  employeeNumber: string;
  designation: string;
  email: string;
  receiveNewRequests: boolean;
  loginMode: "invite" | "temporary";
  temporaryPassword?: string;
}

/* ------------------------------------------------------------------ */
/* Categories & form builder                                           */
/* ------------------------------------------------------------------ */

type CategoryFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "select"
  | "radio"
  | "checkbox"
  | "file";

interface CategoryField {
  id: string;
  label: string;
  type: CategoryFieldType;
  required: boolean;
  helpText?: string;
  /** Choices for dropdown / multiple choice / checkbox fields. */
  options?: string[];
  /** File fields: accepted file groups. Empty / undefined means every type. */
  accept?: string[];
  /** File fields: allow more than one file. */
  multiple?: boolean;
  /** Display sequence in the resident form (1-based). */
  order: number;
}

type CategoryStatus = "active" | "archived";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: CategoryStatus;
  fields: CategoryField[];
  /** Incremented on every saved edit. New requests snapshot the version. */
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

interface CategoryDraftPayload {
  name: string;
  description: string;
  icon: string;
  fields: CategoryField[];
}

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

type RequestStatus =
  | "submitted"
  | "under_review"
  | "changes_required"
  | "resubmitted"
  | "approved"
  | "rejected"
  | "completed"
  | "withdrawn";

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
}

type HistoryEventType =
  | "submitted"
  | "assigned"
  | "reassigned"
  | "review_started"
  | "item_accepted"
  | "item_flagged"
  | "revision_requested"
  | "resubmitted"
  | "approved"
  | "rejected"
  | "deposit_required"
  | "receipt_recorded"
  | "letter_uploaded"
  | "completed"
  | "letter_email"
  | "withdrawn"
  | "refunded"
  | "no_refund";

type ActorRole = "resident" | "reviewer" | "super_admin" | "system";

interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  actor: { name: string; role: ActorRole };
  message: string;
  detail?: string;
  createdAt: string;
  /** Staff-only records are not shown to the resident. */
  staffOnly?: boolean;
}

interface ItemReview {
  state: "accepted" | "flagged";
  reason?: string;
}

interface RequestRevision {
  id: string;
  fieldId: string;
  label: string;
  previous: string;
  current: string;
  at: string;
}

type DepositStatus = "not_required" | "pending" | "received";
type RefundOutcome = "awaiting" | "refunded" | "no_refund";

interface DepositRecord {
  required: boolean;
  amount?: number;
  status: DepositStatus;
  receipt?: AttachedFile;
  receivedAt?: string;
}

interface RefundRecord {
  outcome: RefundOutcome;
  recordedBy: string;
  date: string;
}

interface LetterEmailRecord {
  status: "sent" | "failed";
  at: string;
  error?: string;
}

interface RequestRecord {
  id: string;
  code: string;
  categoryId: string;
  /** Category name at time of submission — preserved when categories change. */
  categoryName: string;
  formVersion: number;
  formSnapshot: CategoryField[];
  residentId: string;
  status: RequestStatus;
  assignedReviewerId: string | null;
  fieldValues: Record<string, string>;
  uploads: Record<string, AttachedFile[]>;
  itemReviews: Record<string, ItemReview>;
  revisions: RequestRevision[];
  hoaApproved: boolean;
  hoaConfirmedAt: string;
  submittedAt: string;
  updatedAt: string;
  decidedAt?: string;
  completedAt?: string;
  withdrawnAt?: string;
  withdrawnFrom?: RequestStatus;
  feedback?: string;
  rejectionReason?: string;
  deposit: DepositRecord;
  refund?: RefundRecord;
  approvalLetter?: AttachedFile;
  letterEmail?: LetterEmailRecord;
  history: HistoryEvent[];
}

/* ------------------------------------------------------------------ */
/* Notifications, activity, resets                                     */
/* ------------------------------------------------------------------ */

type AdminNotificationType =
  | "new_submission"
  | "resubmission"
  | "request_update"
  | "withdrawal"
  | "action_required";

interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  requestId: string | null;
  read: boolean;
  createdAt: string;
}

type ActivityCategory =
  | "account"
  | "routing"
  | "category"
  | "security"
  | "export";

interface ActivityLogEntry {
  id: string;
  category: ActivityCategory;
  type: string;
  message: string;
  /** The actual person who performed the action. */
  actor: { id: string; name: string; role: "super_admin" };
  target?: { kind: "reviewer" | "resident" | "category" | "request" | "system"; id: string; label: string };
  createdAt: string;
}

interface PasswordResetRecord {
  id: string;
  userKind: "resident" | "reviewer";
  userId: string;
  userName: string;
  email: string;
  initiatedBy: string;
  status: "sent" | "completed";
  createdAt: string;
}

