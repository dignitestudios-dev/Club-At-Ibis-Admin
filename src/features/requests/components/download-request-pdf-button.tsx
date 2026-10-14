"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { STATUS_LABEL } from "@/lib/domain";
import { downloadRequestPdf, type RequestPdfInput } from "@/lib/request-pdf";
import { getAdminFileDownloadUrl } from "@/features/requests/api/requests.service";

function asText(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Downloads this request (answers + uploaded documents) as a branded PDF. */
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
      const fields = (request.formSnapshot || []).filter((f) => f.type !== "file").sort((a, b) => a.order - b.order);
      const fileFields = (request.formSnapshot || []).filter((f) => f.type === "file").sort((a, b) => a.order - b.order);

      const input: RequestPdfInput = {
        reference: request.code,
        categoryName: request.categoryName,
        title: request.title,
        status: request.status,
        statusLabel: STATUS_LABEL[request.status] ?? request.status,
        submittedAt: request.submittedAt,
        updatedAt: request.updatedAt,
        resident: {
          name: residentName,
          idNumber: residentIdNumber,
          email: request.resident?.email,
          phone: request.resident?.phone,
        },
        property: {
          address: request.property?.address || asText(request.fieldValues?.propertyAddress),
          lotNo: request.property?.lotNo || asText(request.fieldValues?.lotNo),
        },
        reviewer: reviewerName,
        summary: request.deposit?.required
          ? [
              {
                label: "Deposit",
                value: [
                  request.deposit.amount != null && request.deposit.amount !== "" ? `$${Number(request.deposit.amount).toFixed(2)}` : "Required",
                  request.deposit.status === "received" ? "Received" : "Pending",
                ].join("  -  "),
              },
            ]
          : undefined,
        fields: fields.map((f) => {
          const review = request.itemReviews?.[f.id];
          return {
            label: f.label,
            value: asText(request.fieldValues?.[f.id]),
            required: f.required,
            note: review?.state === "flagged" ? review.reason : null,
          };
        }),
        documents: fileFields.flatMap((f) => {
          const review = request.itemReviews?.[f.id];
          return (request.uploads?.[f.id] ?? []).map((file) => ({
            title: f.label,
            fileId: file.id,
            name: file.name,
            size: file.size,
            mimeType: file.mimeType,
            uploadedAt: file.uploadedAt,
            required: f.required,
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
