"use client";

import { useState } from "react";
import { ChevronDown, Eye, FileText, Flag, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PreviewableFile } from "@/components/shared/file-preview-dialog";
import { earlierSubmissions, flaggedItemsForSubmission } from "@/lib/domain";
import { formatDateTime, formatFileSize } from "@/utils/format";
import { cn } from "@/utils/cn";

type AdminSubmission = NonNullable<RequestRecord["submissions"]>[number];

function ReviewStateBadge({ flagged, reason }: { flagged: boolean; reason?: string }) {
  if (flagged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <Flag className="size-3" aria-hidden="true" />
        {reason ? "Flagged" : "Flagged for revision"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      Accepted
    </span>
  );
}

function SubmissionRow({
  request,
  submission,
  onPreview,
  defaultOpen,
}: {
  request: RequestRecord;
  submission: AdminSubmission;
  onPreview: (f: PreviewableFile) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const sortedFields = [...(request.formSnapshot || [])].sort((a, b) => a.order - b.order);
  // Documents get their own section, same as the current submission's own
  // Details/Documents tab split — not interleaved with the answer fields.
  const answerFields = sortedFields.filter((f) => f.type !== "file");
  const docFields = sortedFields.filter((f) => f.type === "file");
  // `submissions[]` never carries per-round item reviews — reconstructed
  // from the "revision-requested" history event recorded for this round.
  const flaggedReasons = flaggedItemsForSubmission(request, submission.number);

  function renderFieldItem(field: CategoryField) {
    const reason = flaggedReasons.get(field.id);
    const flagged = reason !== undefined;
    const files = submission.files?.[field.id] ?? [];
    const value = submission.fieldValues?.[field.id];
    if (field.type === "file" ? files.length === 0 : !value) return null;
    return (
      <li
        key={field.id}
        className={cn(
          "space-y-1.5 rounded-lg border p-3",
          flagged ? "border-amber-300/70 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/10" : "border-border/70"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-[11px] font-semibold tracking-wider text-foreground uppercase break-words [overflow-wrap:anywhere]">
            {field.label}
          </p>
          <ReviewStateBadge flagged={flagged} reason={reason} />
        </div>
        {field.type === "file" ? (
          files.map((f) => (
            <div key={f.id} className="flex items-center gap-2.5 text-sm">
              <FileText className="size-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-[11px] text-muted-foreground">{formatFileSize(f.size)}</span>
              <Button variant="outline" size="xs" onClick={() => onPreview(f)}>
                <Eye />
                Preview
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm whitespace-pre-line break-words [overflow-wrap:anywhere] text-foreground">{value}</p>
        )}
        {flagged && reason && (
          <p className="text-xs break-words [overflow-wrap:anywhere] text-amber-900 dark:text-amber-300">Note: {reason}</p>
        )}
      </li>
    );
  }

  const answerItems = answerFields.map(renderFieldItem).filter(Boolean);
  const docItems = docFields.map(renderFieldItem).filter(Boolean);

  return (
    <div className="rounded-xl border border-border/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-heading text-sm font-semibold">
          #{submission.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Submission {submission.number}</span>
          <span className="block text-xs text-muted-foreground">Submitted {formatDateTime(submission.submittedAt)}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <Flag className="size-3" aria-hidden="true" />
          {flaggedReasons.size} flagged
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/70 px-4 py-4">
          {answerItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Answers</p>
              <ul className="space-y-2">{answerItems}</ul>
            </div>
          )}
          {docItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Documents</p>
              <ul className="space-y-2">{docItems}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Earlier submissions stay on the request after the resident resubmits, exactly as they were reviewed. */
export function EarlierSubmissions({ request, onPreview }: { request: RequestRecord; onPreview: (f: PreviewableFile) => void }) {
  const list = earlierSubmissions(request);
  if (list.length === 0) return null;
  return (
    <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
      <CardHeader className="border-b border-border/70 pb-3">
        <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium">
          <History className="size-4 text-muted-foreground" aria-hidden="true" />
          Earlier submissions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          What the resident originally submitted and how the reviewer assessed it. Kept after they resubmit and never changes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {list.map((s, i) => (
          <SubmissionRow key={s.id} request={request} submission={s} onPreview={onPreview} defaultOpen={i === 0} />
        ))}
      </CardContent>
    </Card>
  );
}
