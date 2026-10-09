import { formatDate } from "@/utils/format";

/** "Item accepted" -> "Item Accepted": every word starts with a capital. */
export function titleCase(text: string): string {
  return text.replace(/(^|[\s/-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export interface EventLine {
  text: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}

/** The stored file a receipt / final-letter event points at (`details.fileId`), so the timeline can open it. */
export interface EventFile {
  id: string;
  name: string;
  kind: "receipt" | "letter";
}

export interface EventInfo {
  file?: EventFile;
  /** Replaces the generic title when the event itself says more (e.g. "Deposit required" vs "No deposit required"). */
  title?: string;
  lines: EventLine[];
}

type Details = Record<string, unknown> | undefined;

const money = (minor: unknown) =>
  typeof minor === "number"
    ? `$${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const stage = (v: unknown) => (str(v) ? str(v)!.replace(/_/g, " ") : null);

function date(v: unknown) {
  const s = str(v);
  if (!s) return null;
  try {
    return formatDate(s);
  } catch {
    return s;
  }
}

/**
 * What to show under each event, from the backend's `details` for that event type
 * (see REQUEST_EVENTS in the backend). `audience` only changes wording, never the facts.
 */
export function describeEvent(type: string, details: Details, audience: "staff" | "resident"): EventInfo {
  const d = details ?? {};
  const staff = audience === "staff";

  switch (type) {
    case "deposit_configured": {
      if (d.depositRequired === true) {
        const amount = money(d.amountMinor);
        return {
          title: "Deposit required",
          lines: [
            { text: amount ? `${amount} deposit` : "A deposit is required", tone: "warn" },
            {
              text: staff
                ? "Paid outside the portal. The reviewer marks it as received once paid."
                : "Paid outside the portal. You will be notified once it is received.",
            },
          ],
        };
      }
      return { title: "No deposit required", lines: [{ text: "Nothing to collect for this project.", tone: "good" }] };
    }

    case "deposit_received":
      return { lines: [{ text: "The deposit was marked as received.", tone: "good" }] };

    case "deposit_receipt_recorded":
      return {
        file: str(d.fileId) ? { id: str(d.fileId)!, name: str(d.fileName) ?? "Deposit receipt", kind: "receipt" } : undefined,
        lines: [
          { text: "Payment receipt attached.", tone: "good" },
          ...(str(d.fileName) ? [{ text: `File: ${str(d.fileName)}${typeof d.version === "number" && d.version > 1 ? ` (version ${d.version})` : ""}` }] : []),
        ],
      };

    case "final_letter_uploaded":
      return {
        file: str(d.fileId) ? { id: str(d.fileId)!, name: str(d.fileName) ?? "Final approval letter", kind: "letter" } : undefined,
        lines: [
          { text: "The resident can see it once the request is completed." },
          ...(str(d.fileName) ? [{ text: `File: ${str(d.fileName)}${typeof d.version === "number" && d.version > 1 ? ` (version ${d.version})` : ""}` }] : []),
        ],
      };

    case "completed":
      return {
        lines: [
          {
            text: staff ? "The final approval letter was released to the resident." : "Your final approval letter is ready to view and download.",
            tone: "good",
          },
        ],
      };

    case "completion_email_sent":
      return {
        title: "Completion email sent",
        lines: [{ text: `Delivered to the resident${typeof d.attempt === "number" && d.attempt > 1 ? ` (attempt ${d.attempt})` : ""}.`, tone: "good" }],
      };

    case "completion_email_failed":
      return {
        title: "Completion email failed",
        lines: [
          {
            text: `Delivery failed${typeof d.attempt === "number" ? ` (attempt ${d.attempt})` : ""}${str(d.errorCode) ? ` · ${str(d.errorCode)}` : ""}.`,
            tone: "bad",
          },
          ...(staff ? [{ text: "Use “Retry email” on the request to send it again." }] : []),
        ],
      };

    case "completion_email_retry_requested":
      return { title: "Email retry requested", lines: [{ text: "A new delivery attempt was queued." }] };

    case "withdrawn": {
      const lines: EventLine[] = [];
      if (stage(d.previousStatus)) lines.push({ text: `Withdrawn while ${stage(d.previousStatus)}.` });
      if (str(d.refundOutcome)) lines.push({ text: "A deposit had been received, so a refund outcome is now needed.", tone: "warn" });
      return { lines };
    }

    case "refund_outcome_recorded":
    case "refund_outcome_corrected": {
      const corrected = type === "refund_outcome_corrected";
      const refunded = d.outcome === "refunded";
      const lines: EventLine[] = [
        refunded
          ? { text: `Deposit refunded${date(d.refundDate) ? ` on ${date(d.refundDate)}` : ""}.`, tone: "good" }
          : { text: "No refund: the deposit was retained or is non-refundable.", tone: "neutral" },
      ];
      if (corrected) {
        const prev = d.previousOutcome === "refunded" ? `refunded${date(d.previousRefundDate) ? ` on ${date(d.previousRefundDate)}` : ""}` : d.previousOutcome === "no_refund" ? "no refund" : null;
        if (prev) lines.push({ text: `Previously: ${prev}.` });
        if (str(d.correctionReason)) lines.push({ text: `Reason for correction: ${str(d.correctionReason)}` });
      }
      return { title: corrected ? "Refund outcome corrected" : refunded ? "Deposit refunded" : "No refund", lines };
    }

    default:
      return { lines: [] };
  }
}
