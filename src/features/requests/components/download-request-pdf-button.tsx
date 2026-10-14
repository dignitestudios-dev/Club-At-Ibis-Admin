"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { STATUS_LABEL } from "@/lib/domain";
import { downloadRequestPdf, type RequestPdfInput, type RequestPdfRow, type RequestPdfSection } from "@/lib/request-pdf";
import { getAdminFileDownloadUrl } from "@/features/requests/api/requests.service";

/** Fields every request carries; the rest come from the category's own form. */
const COMMON_FIELD_IDS = new Set(["propertyAddress", "lotNo", "projectDescription", "contractorName", "contractorNumber", "additionalDetails"]);

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function date(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function money(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isNaN(n) ? "" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Only rows that have something to say; the form's own fields are kept even when empty. */
function present(rows: RequestPdfRow[]): RequestPdfRow[] {
  return rows.filter((r) => r.value && r.value.trim());
}

/** Downloads this request (answers + uploaded documents) as a formal PDF record. */
export function DownloadRequestPdfButton({
  request,
  residentName,
  residentIdNumber,
  reviewerName,
}: {
  request: RequestRecord;
  residentName?: string;
  residentIdNumber?: string;
  reviewerName?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    setMessage("Preparing…");
    try {
      const formFields = request.formSnapshot || [];
      const answers = formFields.filter((f) => f.type !== "file").sort((a, b) => a.order - b.order);
      const fileFields = formFields.filter((f) => f.type === "file").sort((a, b) => a.order - b.order);
      const isCommon = (f: { id: string }) => {
        const source = (f as { source?: string }).source;
        return source ? source === "common" : COMMON_FIELD_IDS.has(f.id);
      };
      const toRow = (f: (typeof answers)[number]): RequestPdfRow => {
        const value = asText(request.fieldValues?.[f.id]);
        const review = request.itemReviews?.[f.id];
        return {
          label: f.label,
          value,
          wide: f.type === "textarea" || value.length > 48 || value.includes("\n"),
          note: review?.state === "flagged" ? review.reason : null,
        };
      };

      const sections: RequestPdfSection[] = [
        {
          title: "Request Information",
          rows: present([
            { label: "Reference number", value: request.code },
            { label: "Category", value: request.categoryName },
            { label: "Status", value: STATUS_LABEL[request.status] ?? request.status },
            { label: "Date submitted", value: date(request.submittedAt) },
            { label: "Last updated", value: date(request.updatedAt) },
            { label: "Review started", value: date(request.review?.startedAt) },
          ]),
        },
        {
          title: "Resident Information",
          rows: present([
            { label: "Resident name", value: residentName ?? "" },
            { label: "Resident ID", value: residentIdNumber ?? "" },
            { label: "Email", value: request.resident?.email ?? "" },
            { label: "Phone", value: request.resident?.phone ?? "" },
          ]),
        },
        {
          title: "Review & Decision",
          rows: present([
            { label: "Assigned reviewer", value: reviewerName ?? "" },
            { label: "Decision date", value: date(request.decidedAt) },
            { label: "Rejection reason", value: request.status === "rejected" ? (request.rejectionReason ?? "") : "", wide: true },
            { label: "Reviewer feedback and instructions", value: request.status === "changes_required" ? (request.feedback ?? "") : "", wide: true },
          ]),
        },
        { title: "Project Information", rows: answers.filter(isCommon).map(toRow) },
        { title: `${request.categoryName || "Category"} Information`, rows: answers.filter((f) => !isCommon(f)).map(toRow) },
        ...(request.deposit?.required
          ? [
              {
                title: "Deposit & Refund",
                rows: present([
                  { label: "Deposit required", value: "Yes" },
                  { label: "Deposit amount", value: money(request.deposit.amount) },
                  { label: "Deposit status", value: request.deposit.status === "received" ? "Received" : "Pending" },
                  { label: "Deposit received on", value: date(request.deposit.receivedAt) },
                  {
                    label: "Refund outcome",
                    value: request.refund?.outcome === "refunded" ? "Refunded" : request.refund?.outcome === "no_refund" ? "No refund" : "",
                  },
                  { label: "Refund date", value: request.refund?.outcome === "refunded" ? date(request.refund.refundDate || request.refund.date) : "" },
                ]),
              },
            ]
          : []),
      ];

      const input: RequestPdfInput = {
        reference: request.code,
        categoryName: request.categoryName,
        statusLabel: STATUS_LABEL[request.status] ?? request.status,
        sections,
        documents: fileFields.flatMap((f) => {
          const review = request.itemReviews?.[f.id];
          return (request.uploads?.[f.id] ?? []).map((file) => ({
            title: f.label,
            fileId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            note: review?.state === "flagged" ? review.reason : null,
          }));
        }),
        getFileUrl: async (fileId) => {
          const { url } = await getAdminFileDownloadUrl(request.id, fileId);
          return url;
        },
        onProgress: setMessage,
      };
      await downloadRequestPdf(input);
    } catch {
      toast.error("Could not create the PDF", "Please try again in a moment.");
    } finally {
      setBusy(false);
      setMessage("");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleDownload} disabled={busy} className="gap-1.5" title="Download this request as a PDF">
      {busy ? <Spinner className="size-3.5" /> : <Download className="size-3.5" aria-hidden="true" />}
      {busy ? message || "Preparing…" : "Download PDF"}
    </Button>
  );
}
