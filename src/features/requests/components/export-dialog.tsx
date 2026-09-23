"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Download, FileSpreadsheet, FolderLock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useRecordExport } from "@/hooks/use-admin-data";
import { buildRequestsCsv, downloadCsv } from "@/lib/domain";

const INCLUDED = [
  "Request details — reference, category, resident, property, lot, contractor",
  "Every configured information field for the matching categories",
  "Status, assigned reviewer, submitted / decision / completed / withdrawn dates",
  "Deposit, refund outcome, approval-letter and email-result tracking fields",
];

export function ExportDialog({
  open,
  onOpenChange,
  requests,
  context,
  filterSummary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every request matching the current filters — not just the visible page. */
  requests: RequestRecord[];
  context: { residents: Resident[]; categories: Category[]; reviewers: PublicReviewer[] };
  filterSummary: string;
}) {
  const toast = useToast();
  const record = useRecordExport();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const csv = buildRequestsCsv(requests, context);
      downloadCsv(`club-at-ibis-requests-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv);
      await record.mutateAsync({ count: requests.length, summary: filterSummary });
      toast.success("Export ready", `${requests.length} request${requests.length === 1 ? "" : "s"} downloaded as CSV.`);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-amber-300">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="font-heading text-xl font-medium">Export Requests to CSV</DialogTitle>
          <DialogDescription>
            Exports <span className="font-semibold text-foreground">all {requests.length} matching row{requests.length === 1 ? "" : "s"}</span>
            {" "}— not just the page you are looking at.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-xs">
            <p className="font-semibold tracking-wider text-muted-foreground uppercase">Current filters</p>
            <p className="mt-1 text-foreground">{filterSummary || "None — all requests"}</p>
          </div>
          <ul className="space-y-2">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm text-foreground/90">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-xl border border-amber-300/70 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
            <FolderLock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Uploaded documents are not embedded — they remain in the system. Only their file names are listed.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={busy || requests.length === 0}>
            {busy ? <Spinner className="size-4" /> : <Download className="size-4" />}
            Download {requests.length} row{requests.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
