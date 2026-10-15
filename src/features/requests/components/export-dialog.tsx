"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FolderLock } from "lucide-react";
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
import { downloadRequestsCsv } from "@/lib/csv-export";

const INCLUDED = [
  "Request details: reference, category, resident, property, lot, contractor",
  "Every configured information field for the matching categories",
  "Status, assigned reviewer, submitted / decision / completed / withdrawn dates",
  "Deposit, refund outcome, approval-letter and email-result tracking fields",
];

export function ExportDialog({
  open,
  onOpenChange,
  total,
  filters,
  filterSummary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of requests matching the current filters (the export covers all of them, not just this page). */
  total: number;
  /** The list's current filters; the server builds the CSV from them. */
  filters: object;
  filterSummary: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setProblem(null);
    const outcome = await downloadRequestsCsv("/admin/reports/requests.csv", filters);
    setBusy(false);
    if (outcome.ok) {
      toast.success("Export ready", `The CSV of all matching requests was downloaded.`);
      onOpenChange(false);
      return;
    }
    // No file was created: say why, and keep the dialog open so the export can be retried.
    setProblem(outcome.message);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) {
          setProblem(null);
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-amber-300">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="font-heading text-xl font-medium">Export Requests to CSV</DialogTitle>
          <DialogDescription>
            Exports all <span className="font-semibold text-foreground">{total}</span> matching rows from all pages of the current results.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3 text-xs">
            <p className="font-semibold tracking-wider text-muted-foreground uppercase">Current filters</p>
            <p className="mt-1 text-foreground">{filterSummary || "None (all requests)"}</p>
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
            Documents remain in the system; only file names are exported.
          </p>
          {problem && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {problem}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? <Spinner className="size-4" /> : <Download className="size-4" />}
            {problem ? "Try again" : "Download CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
