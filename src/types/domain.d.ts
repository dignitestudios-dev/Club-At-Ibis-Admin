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

interface CategoryActor {
  id: string | null;
  role: string;
  displayName: string;
}

interface CategoryVersion {
  id?: string;
  categoryId?: string;
  version: number;
  name: string;
  description: string;
  fields: CategoryField[];
  createdAt: string;
  createdBy: CategoryActor | string;
  /** Machine-readable diff objects from backend. */
  changes?: Array<Record<string, unknown> | string>;
  /** Human-readable summary of what changed from the previous version. */
  changeSummaries?: string[];
  restoredFromVersion?: number | null;
  note?: string | null;
}

interface Category {
  id: string;
  slug?: string;
  name: string;
  description: string;
  status: CategoryStatus;
  fields: CategoryField[];
  /** Incremented on every saved edit. New requests snapshot the version. */
  currentVersion: number;
  /** Compatibility alias for currentVersion */
  version: number;
  /** Every version ever saved, newest first when loaded from versions endpoint. */
  versions?: CategoryVersion[];
  createdBy?: CategoryActor | string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  currentForm?: CategoryVersion;
}

interface CommonForm {
  key: string;
  currentVersion: number;
  fields: CategoryField[];
  note?: string | null;
  createdBy?: CategoryActor | string;
  createdAt: string;
}

interface VersionComparison {
  categoryId: string;
  fromVersion: number;
  toVersion: number;
  changes: Array<Record<string, unknown>>;
  summaries: string[];
}

interface CategoryDraftPayload {
  name: string;
  description: string;
  fields: Array<Omit<CategoryField, "id" | "order"> & { id?: string; order?: number }>;
  /** Optional note stored with the new version. */
  note?: string;
  /** Required on updates to prevent concurrent overwrite collisions. */
  expectedVersion?: number;
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
  url?: string;
  mimeType?: string;
  originalName?: string;
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
  /** Set on assigned / reassigned events so the assignment log can show from → to. */
  assignment?: { from?: string; to: string };
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
  /** Optional proof of refund / supporting document uploaded by the reviewer. */
  proof?: AttachedFile;
  recordedBy: string;
  date: string;
}

interface LetterEmailRecord {
  status: "sent" | "failed";
  at: string;
  error?: string;
}

interface RequestResidentSnapshot {
  id: string;
  residentId?: string;
  residentIdNumber?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

interface RequestPropertySnapshot {
  address?: string | null;
  lotNo?: string | null;
  subDivision?: string | null;
  parcelId?: string | null;
}

interface RequestRecord {
  id: string;
  code: string;
  title?: string;
  categoryId: string;
  /** Category name at time of submission — preserved when categories change. */
  categoryName: string;
  categorySlug?: string;
  category?: { id: string; slug: string; name: string };
  formVersion: number;
  formSnapshot: CategoryField[];
  residentId: string;
  resident?: RequestResidentSnapshot;
  property?: RequestPropertySnapshot;
  status: RequestStatus;
  assignedReviewerId: string | null;
  assignmentVersion?: number;
  draftRevision?: number | null;
  currentStep?: number | null;
  fieldValues: Record<string, string>;
  uploads: Record<string, AttachedFile[]>;
  itemReviews: Record<string, ItemReview>;
  revisions: RequestRevision[];
  previousSubmissions?: Array<Record<string, unknown>>;
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

