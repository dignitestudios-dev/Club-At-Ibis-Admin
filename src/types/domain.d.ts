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
  role?: string;
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
  /** "Receive New Requests": the reviewer is a Default Reviewer. */
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
  accountStatus?: string;
  /** Inactive residents cannot sign in. */
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface ReviewerFormPayload {
  name: string;
  firstName?: string;
  lastName?: string;
  employeeNumber?: string;
  designation?: string;
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

interface CategoryActivityActor {
  id: string | null;
  role: string;
  displayName: string;
}

interface CategoryActivityEntry {
  id: string;
  type: string;
  actor: CategoryActivityActor;
  message: string;
  details?: Record<string, unknown>;
  occurredAt: string;
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
  activityHistory?: CategoryActivityEntry[];
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
  | "assigned"
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
  /** Set on a "revision-requested" event: the exact fields flagged for that review round, with the reviewer's reason. `submissions[]` never carries per-round item reviews, so this is the only place a past round's flagged items are reconstructable from. */
  flaggedItems?: { fieldId: string; label: string; reason: string }[];
  /** The submission round this event applies to. */
  submissionNumber?: number;
}

interface ReviewItemActor {
  actorId: string;
  role: string;
  displayName: string;
}

interface ReviewRoundItem {
  kind: "field" | "file";
  fieldId: string;
  label: string;
  decision: "pending" | "accepted" | "flagged";
  reason: string | null;
  decidedBy: ReviewItemActor | null;
  decidedAt: string | null;
  carriedForward: boolean;
}

interface ActiveReviewRecord {
  id: string;
  roundNumber: number;
  status: "active" | "closed";
  reviewVersion: number;
  items: ReviewRoundItem[];
  startedBy?: ReviewItemActor;
  startedAt?: string;
  closedBy?: ReviewItemActor | null;
  closedAt?: string | null;
}

interface ItemReview {
  state: "pending" | "accepted" | "flagged";
  reason?: string;
  reviewer?: string;
  reviewedAt?: string;
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
  /** Category name at time of submission (preserved when categories change). */
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
  workflowVersion?: number;
  draftRevision?: number | null;
  currentStep?: number | null;
  fieldValues: Record<string, string>;
  uploads: Record<string, AttachedFile[]>;
  itemReviews: Record<string, ItemReview>;
  review?: ActiveReviewRecord;
  revision?: {
    roundNumber?: number;
    items?: Array<{ fieldId: string; label: string; reason: string; previousValue?: string }>;
  } | null;
  submissions?: Array<{
    id: string;
    number: number;
    submittedAt: string;
    changedFieldIds: string[];
    fieldValues: Record<string, string>;
    files: Record<string, AttachedFile[]>;
  }>;
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

type ActivityType = "all" | "accounts" | "routing" | "categories" | "security";

type ActivityCategory =
  | "accounts"
  | "routing"
  | "categories"
  | "security"
  | "account"
  | "category"
  | "export";

interface ActivityActor {
  id: string | null;
  name: string;
  role: string;
}

interface ActivityTarget {
  kind: string;
  id: string | null;
  label: string;
  role?: string;
}

interface ActivityLogEntry {
  id: string;
  category: ActivityCategory;
  type: string;
  action?: string;
  message: string;
  actor: ActivityActor;
  target?: ActivityTarget;
  details?: Record<string, unknown>;
  createdAt: string;
  occurredAt?: string;
}

interface ActivityQueryParams {
  type?: ActivityType;
  page?: number;
  limit?: number;
}

interface ActivityPageResponse {
  activities: ActivityLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

