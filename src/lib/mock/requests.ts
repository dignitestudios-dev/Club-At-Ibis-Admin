import { addMinutes, currentYear, hoursAgo } from "./date-helpers";
import { seedCategories, baseProjectFields } from "./categories";
import { seedResidents, seedReviewers } from "./people";

const YR = currentYear();

interface Spec {
  cat: string;
  /** 1-based resident number (res-N). */
  res: number;
  status: RequestStatus;
  /** 1-based reviewer number (rev-N) or null for unassigned intake. */
  rev: number | null;
  /** Days since submission. */
  ago: number;
  /** For withdrawn requests: the stage the request was in when withdrawn. */
  from?: "submitted" | "under_review" | "approved" | "completed";
  deposit?: number;
  received?: boolean;
  refund?: RefundOutcome;
  /** First assignee before the request was reassigned to `rev`. */
  firstRev?: number;
  reason?: string;
}

const specs: Spec[] = [
  // Submitted — waiting in default-reviewer intake
  { cat: "roof-replacement", res: 10, status: "submitted", rev: null, ago: 0.3 },
  { cat: "fence", res: 9, status: "submitted", rev: null, ago: 0.9 },
  { cat: "pool-installation", res: 8, status: "submitted", rev: null, ago: 1.6 },
  { cat: "windows-doors", res: 3, status: "submitted", rev: null, ago: 2.2 },
  // Under review
  { cat: "generator", res: 1, status: "under_review", rev: 1, ago: 4 },
  { cat: "landscaping", res: 4, status: "under_review", rev: 4, ago: 5 },
  { cat: "addition-to-dwelling", res: 6, status: "under_review", rev: 2, ago: 6 },
  { cat: "screen-enclosure", res: 5, status: "under_review", rev: 3, ago: 7 },
  { cat: "hurricane-shutters", res: 7, status: "under_review", rev: 2, ago: 8, firstRev: 3 },
  { cat: "new-dwelling", res: 2, status: "under_review", rev: 1, ago: 9 },
  // Changes required
  { cat: "paint-color-change", res: 1, status: "changes_required", rev: 1, ago: 3 },
  { cat: "pool-deck-driveway", res: 3, status: "changes_required", rev: 3, ago: 10 },
  { cat: "roof-replacement", res: 5, status: "changes_required", rev: 2, ago: 12 },
  { cat: "fence", res: 6, status: "changes_required", rev: 4, ago: 13 },
  // Resubmitted
  { cat: "generator", res: 2, status: "resubmitted", rev: 2, ago: 11 },
  { cat: "windows-doors", res: 4, status: "resubmitted", rev: 3, ago: 14 },
  { cat: "landscaping", res: 8, status: "resubmitted", rev: 4, ago: 15 },
  // Approved — deposit / letter still pending
  { cat: "pool-installation", res: 7, status: "approved", rev: 1, ago: 18, deposit: 2500, received: false },
  { cat: "new-dwelling", res: 9, status: "approved", rev: 2, ago: 22, deposit: 5000, received: true },
  { cat: "screen-enclosure", res: 10, status: "approved", rev: 3, ago: 20 },
  { cat: "hurricane-shutters", res: 1, status: "approved", rev: 2, ago: 24, deposit: 1000, received: true },
  // Rejected
  {
    cat: "demolition",
    res: 6,
    status: "rejected",
    rev: 1,
    ago: 30,
    reason:
      "The proposed demolition removes a load-bearing party wall shared with the neighbouring lot. Structural engineering sign-off is required before the Board can consider this scope.",
  },
  {
    cat: "fence",
    res: 2,
    status: "rejected",
    rev: 3,
    ago: 41,
    reason:
      "A 6 ft solid privacy fence in the front setback exceeds the 4 ft maximum in ARB Guidelines §7.3. A compliant design must be submitted as a new request.",
  },
  {
    cat: "paint-color-change",
    res: 8,
    status: "rejected",
    rev: 2,
    ago: 55,
    reason:
      "The selected body colour is outside the approved community palette and conflicts with both adjacent homes.",
  },
  // Completed
  { cat: "roof-replacement", res: 1, status: "completed", rev: 1, ago: 60 },
  { cat: "generator", res: 3, status: "completed", rev: 2, ago: 48, deposit: 1500, received: true },
  { cat: "windows-doors", res: 5, status: "completed", rev: 3, ago: 75 },
  { cat: "landscaping", res: 9, status: "completed", rev: 4, ago: 88 },
  { cat: "pool-deck-driveway", res: 7, status: "completed", rev: 2, ago: 104, deposit: 2000, received: true },
  { cat: "addition-to-dwelling", res: 10, status: "completed", rev: 1, ago: 128 },
  { cat: "paint-color-change", res: 4, status: "completed", rev: 3, ago: 152 },
  // Withdrawn
  { cat: "fence", res: 3, status: "withdrawn", rev: 2, ago: 26, from: "under_review" },
  { cat: "pool-installation", res: 5, status: "withdrawn", rev: 1, ago: 36, from: "approved", deposit: 3000, received: true, refund: "awaiting" },
  { cat: "roof-replacement", res: 4, status: "withdrawn", rev: 3, ago: 66, from: "completed", deposit: 1200, received: true, refund: "refunded" },
  { cat: "generator", res: 6, status: "withdrawn", rev: 2, ago: 97, from: "approved", deposit: 1800, received: true, refund: "no_refund" },
  { cat: "new-dwelling", res: 10, status: "withdrawn", rev: null, ago: 5, from: "submitted" },
  { cat: "hurricane-shutters", res: 2, status: "withdrawn", rev: 2, ago: 120, from: "completed" },
];

const DESCRIPTIONS: Record<string, string> = {
  "new-dwelling": "Construction of a new two-story, 4-bedroom single-family residence with attached two-car garage.",
  "addition-to-dwelling": "Second-floor primary suite addition over the existing garage, matching existing stucco and roof tile.",
  demolition: "Removal of a detached 400 sq ft storage outbuilding and adjoining concrete slab.",
  "windows-doors": "Replacement of nine impact-rated windows and the front entry door with bronze-framed units.",
  generator: "Installation of a whole-home natural gas standby generator on a concrete pad at the east side yard.",
  "screen-enclosure": "New pool cage over the existing pool deck with a bronze aluminium frame and standard screening.",
  "pool-deck-driveway": "Replacing the cracked pool deck and driveway apron with travertine pavers.",
  "hurricane-shutters": "Installing accordion-style hurricane shutters on all street-facing windows.",
  "pool-installation": "New 32 ft pool with integrated spa and a screened equipment pad along the side yard.",
  "roof-replacement": "Full tear-off and replacement of the existing barrel tile roof with flat concrete tile.",
  fence: "Installing a 5 ft black aluminium fence along the rear and side property lines.",
  "paint-color-change": "Refreshing the exterior to a warm neutral palette with dark bronze trim and door.",
  landscaping: "Replacing turf in the front yard with a native plant bed and adding drip irrigation.",
};

const CONTRACTORS: [string, string][] = [
  ["Coastal Power Solutions", "(561) 555-8820"],
  ["Palm Beach Precision Painting", "(561) 555-7311"],
  ["Heron Bay Builders", "(561) 555-2204"],
  ["Sunstate Roofing & Restoration", "(561) 555-6093"],
  ["BlueWater Pools of Florida", "(561) 555-4417"],
  ["Ironwood Fence & Gate", "(561) 555-3350"],
  ["Evergreen Landscape Design", "(561) 555-9182"],
  ["Atlantic Impact Windows", "(561) 555-7746"],
];

const SAMPLE_VALUES: Record<string, string> = {
  builderName: "Harborview Design Group",
  squareFootage: "3,200",
  additionType: "Second-story addition",
  demolitionScope: "Complete removal of the outbuilding and slab; debris hauled off-site.",
  unitCount: "9",
  frameColor: "Dark bronze",
  fuelType: "Natural gas",
  kwRating: "22",
  enclosureType: "Pool cage",
  surfaceMaterial: "Travertine pavers",
  areaSize: "1,150",
  shutterType: "Accordion",
  shutterColor: "White",
  poolDimensions: "32 × 15 × 5.5 ft",
  equipmentLocation: "Side yard, east wall",
  roofMaterial: "Flat concrete tile",
  roofColor: "Charcoal Slate CS-410",
  fenceMaterial: "Aluminium",
  fenceHeight: "5 ft",
  surfaces: "Body, trim, front door",
  colorName: "Sherwin-Williams SW 7036 Accessible Beige",
  landscapeScope: "Replace front turf with native plantings, add mulch beds and drip irrigation.",
};

const FLAG_REASONS = [
  "The uploaded document is illegible at this resolution. Please upload a clearer copy.",
  "Setback dimensions are not shown. Please mark distances to all property lines.",
  "Product specification does not show the required rating or approval number.",
  "Photo does not show the full elevation. Please retake from a wider angle.",
];

function seededPick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function makeFile(label: string, at: string, seed: number, suffix = ""): AttachedFile {
  const isPhoto = /photo|swatch|sample/i.test(label);
  const ext = isPhoto ? "jpg" : "pdf";
  return {
    id: `file-${seed}-${slug(label)}${suffix}`,
    name: `${slug(label)}${suffix}.${ext}`,
    size: 180_000 + ((seed * 73_911) % 2_400_000),
    uploadedAt: at,
  };
}

function ev(
  seq: number,
  type: HistoryEventType,
  actor: HistoryEvent["actor"],
  message: string,
  createdAt: string,
  extra: Partial<Pick<HistoryEvent, "detail" | "staffOnly">> = {}
): HistoryEvent {
  return { id: `evt-${seq}-${type}-${createdAt}`, type, actor, message, createdAt, ...extra };
}

function stageChain(status: RequestStatus | "submitted" | "under_review", hasDeposit: boolean): string[] {
  const reviewed = ["submitted", "assigned", "review_started", "item_accepted"];
  switch (status) {
    case "submitted":
      return ["submitted"];
    case "under_review":
      return reviewed;
    case "changes_required":
      return [...reviewed, "item_flagged", "revision_requested"];
    case "resubmitted":
      return [...reviewed, "item_flagged", "revision_requested", "resubmitted"];
    case "approved":
      return [...reviewed, "approved", ...(hasDeposit ? ["deposit_required"] : [])];
    case "completed":
      return [...reviewed, "approved", ...(hasDeposit ? ["deposit_required"] : []), "letter_uploaded", "completed", "letter_email"];
    case "rejected":
      return [...reviewed, "item_flagged", "rejected"];
    default:
      return ["submitted"];
  }
}

function buildRequest(spec: Spec, index: number): RequestRecord {
  const category = seedCategories.find((c) => c.id === spec.cat)!;
  const resident = seedResidents[spec.res - 1];
  const reviewer = spec.rev ? seedReviewers[spec.rev - 1] : null;
  const defaultReviewer = seedReviewers[0];
  const seed = index + 3;

  const submittedAt = hoursAgo(spec.ago * 24);
  const isWithdrawn = spec.status === "withdrawn";
  const lastStage = isWithdrawn ? spec.from ?? "submitted" : spec.status;
  const hasDeposit = spec.deposit !== undefined;
  const chain =
    lastStage === "submitted"
      ? ["submitted"]
      : stageChain(lastStage as RequestStatus, hasDeposit);
  if (hasDeposit && spec.received && chain.includes("deposit_required")) {
    chain.splice(chain.indexOf("deposit_required") + 1, 0, "receipt_recorded");
  }
  if (isWithdrawn) chain.push("withdrawn");
  if (isWithdrawn && hasDeposit && spec.received && spec.refund) {
    chain.push(spec.refund === "refunded" ? "refunded" : spec.refund === "no_refund" ? "no_refund" : "");
  }
  const steps = chain.filter(Boolean);

  // Spread events across the request's lifetime. The most recent event happened
  // somewhere between ~1h and half the request's age ago so activity looks varied.
  const totalHours = spec.ago * 24;
  const tailHours = Math.max(1, Math.min(totalHours - 1, 1 + totalHours * 0.5 * (((index * 37) % 100) / 100)));
  const spanMinutes = Math.max(30, (totalHours - tailHours) * 60);
  const stepMinutes = steps.length > 1 ? spanMinutes / (steps.length - 1) : 0;
  const timeOf = (i: number) => addMinutes(submittedAt, Math.round(i * stepMinutes));

  const residentActor = { name: `${resident.firstName} ${resident.lastName}`, role: "resident" as const };
  const reviewerActor = reviewer ? { name: reviewer.name, role: "reviewer" as const } : residentActor;
  const defaultActor = { name: defaultReviewer.name, role: "reviewer" as const };
  const systemActor = { name: "System", role: "system" as const };

  // Snapshot of the form as it existed when this request was submitted.
  const legacyGenerator = category.id === "generator" && spec.ago > 25;
  const formFields = legacyGenerator
    ? category.fields.filter((f) => f.id !== "soundRating")
    : category.fields;
  const formSnapshot = [...baseProjectFields, ...formFields.map((f, i) => ({ ...f, order: baseProjectFields.length + i + 1 }))];
  const formVersion = legacyGenerator ? 1 : category.version;

  // Field values & uploads
  const contractor = seededPick(CONTRACTORS, seed);
  const fieldValues: Record<string, string> = {
    propertyAddress: resident.address ?? "",
    lotNo: resident.lotNo ?? "",
    projectDescription: DESCRIPTIONS[category.id] ?? "Exterior modification as described in attached plans.",
    contractorName: contractor[0],
    contractorNumber: contractor[1],
    additionalDetails: seed % 3 === 0 ? "" : "Work to be completed within 6 weeks of approval. Contractor will keep the site clean and confined.",
  };
  const uploads: Record<string, AttachedFile[]> = {};
  formFields.forEach((field, i) => {
    if (field.type === "file") {
      uploads[field.id] = [makeFile(field.label, addMinutes(submittedAt, -10 - i), seed * 7 + i)];
    } else if (field.type === "text") {
      fieldValues[field.id] = SAMPLE_VALUES[field.id] ?? "As described in attached documents";
    } else {
      fieldValues[field.id] = SAMPLE_VALUES[field.id] ?? "See attached documents for details.";
    }
  });

  const requiredFileFields = formFields.filter((f) => f.type === "file" && f.required);
  const textFields = [...baseProjectFields.slice(0, 3), ...formFields.filter((f) => f.type !== "file")];
  const itemReviews: Record<string, ItemReview> = {};
  const revisions: RequestRevision[] = [];

  const reviewedStates: RequestStatus[] = ["under_review", "changes_required", "resubmitted", "approved", "completed", "rejected"];
  const wasReviewed = reviewedStates.includes(lastStage as RequestStatus);
  if (wasReviewed) {
    if (["approved", "completed"].includes(lastStage)) {
      [...baseProjectFields, ...formFields].forEach((f) => (itemReviews[f.id] = { state: "accepted" }));
    } else {
      textFields.slice(0, 3).forEach((f) => (itemReviews[f.id] = { state: "accepted" }));
    }
  }
  const flagged: CategoryField[] = [];
  if (["changes_required", "resubmitted", "rejected"].includes(lastStage)) {
    const targets = requiredFileFields.slice(0, lastStage === "changes_required" && index % 2 === 0 ? 2 : 1);
    targets.forEach((f, i) => {
      flagged.push(f);
      if (lastStage === "resubmitted") {
        itemReviews[f.id] = { state: "accepted" };
      } else {
        itemReviews[f.id] = { state: "flagged", reason: seededPick(FLAG_REASONS, seed + i) };
      }
    });
  }
  if (lastStage === "resubmitted") {
    flagged.forEach((f, i) => {
      const prev = uploads[f.id][0];
      const next = makeFile(f.label, timeOf(steps.length - 1), seed * 11 + i, "-v2");
      uploads[f.id] = [next];
      revisions.push({
        id: `rev-${index}-${i}`,
        fieldId: f.id,
        label: f.label,
        previous: prev.name,
        current: next.name,
        at: timeOf(steps.length - 1),
      });
    });
  }

  // History
  const history: HistoryEvent[] = [];
  steps.forEach((step, i) => {
    const at = timeOf(i);
    switch (step) {
      case "submitted":
        history.push(
          ev(index, "submitted", residentActor, `Request submitted for ${category.name}.`, at, {
            detail: "HOA approval confirmed at submission.",
          })
        );
        break;
      case "assigned": {
        if (!reviewer) break;
        const first = spec.firstRev ? seedReviewers[spec.firstRev - 1] : reviewer;
        history.push(
          first.id === defaultReviewer.id
            ? ev(index, "assigned", defaultActor, `${defaultReviewer.name} took ownership of this request.`, at)
            : ev(index, "assigned", defaultActor, `${defaultReviewer.name} assigned this request to ${first.name}.`, at)
        );
        if (spec.firstRev) {
          history.push(
            ev(index, "reassigned", defaultActor, `Reassigned from ${first.name} to ${reviewer.name}.`, addMinutes(at, 25), {
              detail: `${first.name} no longer has authority to act on this request.`,
            })
          );
        }
        break;
      }
      case "review_started":
        history.push(ev(index, "review_started", reviewerActor, "Review started — status changed to Under Review.", at));
        break;
      case "item_accepted":
        history.push(
          ev(index, "item_accepted", reviewerActor, `Accepted ${Math.max(3, Object.keys(itemReviews).length)} items as complete.`, at, {
            detail: "Accepting an item does not approve the overall request.",
          })
        );
        break;
      case "item_flagged":
        (flagged.length ? flagged : requiredFileFields.slice(0, 1)).forEach((f) => {
          history.push(
            ev(index, "item_flagged", reviewerActor, `Flagged “${f.label}” — correction needed.`, at, {
              detail: itemReviews[f.id]?.reason ?? seededPick(FLAG_REASONS, seed),
            })
          );
        });
        break;
      case "revision_requested":
        history.push(
          ev(index, "revision_requested", reviewerActor, `Revision requested for ${Math.max(1, flagged.length)} flagged item${flagged.length > 1 ? "s" : ""}.`, addMinutes(at, 5), {
            detail: "Status changed to Changes Required. Only flagged items are editable by the resident.",
          })
        );
        break;
      case "resubmitted":
        history.push(
          ev(index, "resubmitted", residentActor, `Resident resubmitted ${flagged.length} corrected item${flagged.length > 1 ? "s" : ""}.`, at, {
            detail: "Earlier versions are retained in the request history.",
          })
        );
        break;
      case "approved":
        history.push(ev(index, "approved", reviewerActor, "Request approved.", at));
        break;
      case "rejected":
        history.push(ev(index, "rejected", reviewerActor, "Request rejected.", at, { detail: spec.reason }));
        break;
      case "deposit_required":
        history.push(
          ev(index, "deposit_required", reviewerActor, `Deposit of $${spec.deposit?.toLocaleString()} required — status Pending.`, at, { staffOnly: true })
        );
        break;
      case "receipt_recorded":
        history.push(
          ev(index, "receipt_recorded", reviewerActor, "Payment receipt uploaded — deposit marked Received.", at, { staffOnly: true })
        );
        break;
      case "letter_uploaded":
        history.push(ev(index, "letter_uploaded", reviewerActor, "Final approval letter uploaded.", at, { staffOnly: true }));
        break;
      case "completed":
        history.push(ev(index, "completed", reviewerActor, "Request marked Completed.", at));
        break;
      case "letter_email":
        history.push(
          ev(index, "letter_email", systemActor, `Approval letter emailed to ${resident.email}.`, at)
        );
        break;
      case "withdrawn":
        history.push(
          ev(index, "withdrawn", residentActor, "Resident withdrew this request.", at, {
            detail: `Withdrawn while ${String(spec.from ?? "submitted").replace("_", " ")}. Further processing stopped.`,
          })
        );
        break;
      case "refunded":
        history.push(ev(index, "refunded", reviewerActor, "Deposit marked Refunded.", at, { staffOnly: false }));
        break;
      case "no_refund":
        history.push(ev(index, "no_refund", reviewerActor, "Recorded No Refund for the deposit.", at));
        break;
    }
  });

  // Deposit / refund / letter
  const depositActive = hasDeposit && (["approved", "completed"].includes(lastStage) || (isWithdrawn && ["approved", "completed"].includes(spec.from ?? "")));
  const deposit: DepositRecord = depositActive
    ? {
        required: true,
        amount: spec.deposit,
        status: spec.received ? "received" : "pending",
        receipt: spec.received
          ? { id: `receipt-${index}`, name: `deposit-receipt-${YR}-${1000 + index}.pdf`, size: 96_000, uploadedAt: timeOf(steps.indexOf("receipt_recorded")) }
          : undefined,
        receivedAt: spec.received ? timeOf(steps.indexOf("receipt_recorded")) : undefined,
      }
    : { required: false, status: "not_required" };

  const completedIdx = steps.indexOf("completed");
  const approvedIdx = steps.indexOf("approved");
  const rejectedIdx = steps.indexOf("rejected");
  const withdrawnIdx = steps.indexOf("withdrawn");
  const hasLetter = steps.includes("letter_uploaded");

  const refundIdx = Math.max(steps.indexOf("refunded"), steps.indexOf("no_refund"));
  const refund: RefundRecord | undefined =
    isWithdrawn && deposit.status === "received" && spec.refund
      ? {
          outcome: spec.refund,
          recordedBy: reviewer?.name ?? defaultReviewer.name,
          date: spec.refund === "awaiting" ? timeOf(withdrawnIdx) : timeOf(refundIdx),
        }
      : undefined;

  const lastEvent = history[history.length - 1];

  return {
    id: `req-${1000 + index}`,
    code: `ARB-${YR}-${1000 + index}`,
    categoryId: category.id,
    categoryName: category.name,
    formVersion,
    formSnapshot,
    residentId: resident.id,
    status: spec.status,
    assignedReviewerId: reviewer ? reviewer.id : null,
    fieldValues,
    uploads,
    itemReviews,
    revisions,
    hoaApproved: true,
    hoaConfirmedAt: submittedAt,
    submittedAt,
    updatedAt: lastEvent?.createdAt ?? submittedAt,
    decidedAt: approvedIdx >= 0 ? timeOf(approvedIdx) : rejectedIdx >= 0 ? timeOf(rejectedIdx) : undefined,
    completedAt: completedIdx >= 0 ? timeOf(completedIdx) : undefined,
    withdrawnAt: withdrawnIdx >= 0 ? timeOf(withdrawnIdx) : undefined,
    withdrawnFrom: isWithdrawn ? (spec.from as RequestStatus) : undefined,
    feedback:
      lastStage === "changes_required" || lastStage === "resubmitted"
        ? "Please correct the flagged documents and resubmit."
        : undefined,
    rejectionReason: spec.status === "rejected" ? spec.reason : undefined,
    deposit,
    refund,
    approvalLetter: hasLetter
      ? { id: `letter-${index}`, name: `ARB-${YR}-${1000 + index}-approval-letter.pdf`, size: 210_000, uploadedAt: timeOf(steps.indexOf("letter_uploaded")) }
      : undefined,
    letterEmail: hasLetter ? { status: "sent", at: timeOf(steps.indexOf("letter_email")) } : undefined,
    history,
  };
}

// Oldest submissions get the lowest sequence numbers.
const ordered = [...specs].sort((a, b) => b.ago - a.ago);

export const seedRequests: RequestRecord[] = ordered
  .map((spec, i) => buildRequest(spec, i + 1))
  .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
