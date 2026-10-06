"use client";

import { ExpandableText } from "@/components/shared/expandable-text";
import { WithdrawnNotice } from "@/components/shared/withdrawn-notice";
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileImage,
  FileText,
  Flag,
  LayoutTemplate,
  Lock,
  Mail,
  ReceiptText,
  UserRoundPlus,
  XCircle,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { FieldHelpTooltip } from "@/components/shared/field-help-tooltip";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilePreviewDialog, type PreviewableFile } from "@/components/shared/file-preview-dialog";
import { getAdminFileDownloadUrl } from "@/features/requests/api/requests.service";
import { AssignReviewerDialog } from "@/features/requests/components/assign-reviewer-dialog";
import { WithdrawRequestAdminDialog } from "@/features/requests/components/withdraw-request-dialog";
import { EarlierSubmissions } from "@/features/requests/components/earlier-submissions";
import { HistoryTimeline } from "@/features/requests/components/history-timeline";
import { RequestJourney } from "@/features/requests/components/request-journey";
import { DepositChip, RefundChip } from "@/features/requests/components/request-chips";
import { useCategories, useRequest, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { IN_FLIGHT, REFUND_LABEL, currentSubmissionNumber, earlierSubmissions, feedbackForSubmission, residentFullName } from "@/lib/domain";
import { formatDate, formatDateTime, formatFileSize } from "@/utils/format";
import { cn } from "@/utils/cn";

function ReviewState({ review }: { review?: ItemReview }) {
  if (review?.state === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Check className="size-3" aria-hidden="true" />
        Accepted
      </span>
    );
  }
  if (review?.state === "flagged") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <Flag className="size-3" aria-hidden="true" />
        Flagged for revision
      </span>
    );
  }
  if (review?.state === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Pending review
      </span>
    );
  }
  return null;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function RequestDetailPage({ id }: { id: string }) {
  const { data: req, isLoading } = useRequest(id);
  const { data: residents } = useResidents();
  const { data: reviewers } = useReviewers();
  const { data: categories } = useCategories();
  const [activeTab, setActiveTab] = useState("overview");
  const [preview, setPreview] = useState<PreviewableFile | null>(null);
  const [assigning, setAssigning] = useState<RequestRecord | null>(null);
  const [withdrawing, setWithdrawing] = useState<RequestRecord | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!req) {
    return (
      <EmptyState
        icon={FileText}
        title="Request not found"
        description="This request doesn't exist or the link is no longer valid."
        action={
          <Button nativeButton={false} render={<Link href="/requests" />}>
            Back to all requests
          </Button>
        }
      />
    );
  }

  const resident = req.resident
    ? {
        id: req.resident.id,
        residentIdNumber: req.resident.residentId || req.resident.residentIdNumber || "",
        firstName: req.resident.firstName || "",
        lastName: req.resident.lastName || "",
        displayName: req.resident.displayName || "",
        email: req.resident.email || "",
        phone: req.resident.phone || "",
        active: true,
        address: req.property?.address || req.fieldValues?.propertyAddress || "",
        lotNo: req.property?.lotNo || req.fieldValues?.lotNo || "",
        createdAt: "",
      }
    : residents?.find((r) => r.id === req.residentId);
  const reviewer = reviewers?.find((r) => r.id === req.assignedReviewerId);
  const category = categories?.find((c) => c.id === req.categoryId);
  const currentCategoryVersion = category?.version ?? req.formVersion;
  const reviewed = req.status !== "submitted";

  const infoFields = (req.formSnapshot || []).filter((f) => f.type !== "file").sort((a, b) => a.order - b.order);
  const fileFields = (req.formSnapshot || []).filter((f) => f.type === "file").sort((a, b) => a.order - b.order);

  const docCount = fileFields.reduce((n, f) => n + (req.uploads?.[f.id]?.length ?? 0), 0);
  const flaggedCount = (req.review?.items || []).length > 0
    ? (req.review?.items || []).filter((it) => it.decision === "flagged").length
    : Object.values(req.itemReviews || {}).filter((r) => r.state === "flagged").length;
  const earlierRounds = earlierSubmissions(req);

  const propAddress = req.property?.address || req.fieldValues?.propertyAddress || "—";
  const propLot = req.property?.lotNo || req.fieldValues?.lotNo || "—";

  const canWithdraw = [
    "submitted",
    "assigned",
    "under_review",
    "changes_required",
    "resubmitted",
    "approved",
    // A completed request is final: no withdrawal.
  ].includes(req.status);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-4">
        <Link href="/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All requests
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-medium text-foreground sm:text-3xl">{req.code}</h1>
              <StatusBadge status={req.status} />
              {currentSubmissionNumber(req) > 1 && (
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-purple-800 uppercase dark:bg-purple-950/60 dark:text-purple-300">
                  Submission #{currentSubmissionNumber(req)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{req.categoryName}</span>
              {category?.status === "archived" && (
                <span className="rounded-full bg-slate-200 px-2 py-px text-[10px] font-bold tracking-wider text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-200">
                  Archived category
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span>{propAddress}</span>
              <span aria-hidden="true">·</span>
              <span>{propLot}</span>
            </div>
          </div>

          {canWithdraw && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="border-rose-300/80 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                onClick={() => setWithdrawing(req)}
              >
                <Ban className="size-4" />
                Withdraw request
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Assignment banner */}
      {IN_FLIGHT.includes(req.status) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm">
            <UserRoundPlus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-muted-foreground">
              {reviewer ? (
                <>
                  Assigned to <span className="font-semibold text-foreground">{reviewer.name}</span>. You can reassign it to another reviewer if needed.
                </>
              ) : (
                "Unassigned. Waiting in the default reviewers' incoming list — assign it to a reviewer now."
              )}
            </p>
          </div>
          <Button variant={reviewer ? "outline" : "default"} className="shrink-0" onClick={() => setAssigning(req)}>
            <UserRoundPlus />
            {reviewer ? "Reassign reviewer" : "Assign reviewer"}
          </Button>
        </div>
      )}

      {/* Alerts */}
      {(req.status === "changes_required" || req.status === "resubmitted") && req.feedback && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <FileEdit className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              {req.status === "resubmitted" ? "Resident resubmitted corrections" : "Revision requested"}
            </p>
            <p className="mt-0.5 text-amber-900/90 dark:text-amber-300/90 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
              <span className="font-semibold">Reviewer Instructions: </span><ExpandableText text={req.feedback} />
            </p>
          </div>
        </div>
      )}
      {req.status === "rejected" && req.rejectionReason && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300/80 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-rose-950 dark:text-rose-200">
              Rejected{req.decidedAt && ` on ${formatDate(req.decidedAt)}`}
            </p>
            <p className="mt-0.5 text-rose-900/90 dark:text-rose-300/90 break-words [overflow-wrap:anywhere] whitespace-pre-wrap">
              <ExpandableText text={req.rejectionReason} />
            </p>
          </div>
        </div>
      )}
      {req.status === "withdrawn" && (
        <WithdrawnNotice
          audience="staff"
          withdrawnAt={req.withdrawnAt ? formatDate(req.withdrawnAt) : undefined}
          withdrawnFrom={req.withdrawnFrom ?? req.withdrawal?.withdrawnFrom ?? null}
          by={req.withdrawal?.withdrawnBy?.displayName || req.withdrawal?.withdrawnBy?.name || "Resident"}
          refund={
            req.refund?.outcome === "refunded"
              ? {
                  state: "refunded",
                  date: req.refund.refundDate ? formatDate(req.refund.refundDate) : undefined,
                  amount:
                    req.deposit?.amount != null
                      ? `$${Number(req.deposit.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : undefined,
                  by: req.refund.recordedBy,
                }
              : req.refund?.outcome === "no_refund"
                ? { state: "no_refund", explanation: req.refund.explanation, by: req.refund.recordedBy }
                : undefined
          }
          note={req.completedAt ? "The previous completion record and issued approval letter are retained." : undefined}
        />
      )}
      {req.refund?.outcome === "awaiting" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-amber-950 dark:text-amber-200">Awaiting refund action</p>
            <p className="text-amber-900/80 dark:text-amber-300/80">
              A deposit was received before withdrawal. The reviewer records the refund outcome, as refunds are processed outside the app.
            </p>
          </div>
        </div>
      )}

      <RequestJourney request={req} />

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={cn("h-full flex flex-col justify-center shadow-2xs", req.formVersion < currentCategoryVersion && "border-amber-300/80 bg-amber-50/60 dark:border-amber-800/70 dark:bg-amber-950/20")}>
          <CardContent className="space-y-2 py-2 flex flex-1 flex-col justify-center">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Resident</p>
            {resident ? (
              <Link href={`/residents/${resident.id}`} className="group flex items-center gap-3">
                <PersonAvatar name={residentFullName(resident)} className="size-10" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground group-hover:underline">{residentFullName(resident)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{resident.residentIdNumber} · {resident.email}</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Unknown resident</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-2xs h-full flex flex-col justify-center">
          <CardContent className="space-y-2 py-2 flex flex-1 flex-col justify-center">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Assigned reviewer</p>
            {reviewer ? (
              <div className="space-y-2">
                <Link href={`/reviewers/${reviewer.id}`} className="group flex items-center gap-3">
                  <PersonAvatar name={reviewer.name} className="size-10" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground group-hover:underline">{reviewer.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{reviewer.designation}</span>
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Unassigned</p>
                <p className="text-xs text-muted-foreground">
                  {req.status === "withdrawn"
                    ? "Withdrawn before assignment."
                    : "Waiting in the default reviewers' incoming list."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-2xs h-full flex flex-col justify-center">
          <CardContent className="space-y-2 py-2 flex flex-1 flex-col justify-center">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Key dates</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Submitted</dt><dd className="font-medium">{formatDate(req.submittedAt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Last update</dt><dd className="font-medium">{formatDate(req.updatedAt)}</dd></div>
              {req.decidedAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Decision</dt><dd className="font-medium">{formatDate(req.decidedAt)}</dd></div>}
              {req.completedAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Completed</dt><dd className="font-medium">{formatDate(req.completedAt)}</dd></div>}
              {req.withdrawnAt && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Withdrawn</dt><dd className="font-medium">{formatDate(req.withdrawnAt)}</dd></div>}
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-2xs h-full flex flex-col justify-center">
          <CardContent className="space-y-2 py-2 flex flex-1 flex-col justify-center">
            <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase", "text-muted-foreground")}>
              Form configuration
              {req.formVersion < currentCategoryVersion && (
                <span className="rounded-full border border-amber-300/80 bg-amber-100 px-2 py-px text-[10px] font-bold tracking-wider text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">Outdated</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className={cn("flex size-9 items-center justify-center rounded-xl border", req.formVersion < currentCategoryVersion ? "border-amber-300/80 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300" : "border-primary/20 bg-primary/10 text-primary dark:text-amber-300")}>
                <LayoutTemplate className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Submitted on form v{req.formVersion}</p>
                <p className="flex items-center text-xs text-muted-foreground">
                  {req.formVersion === currentCategoryVersion ? "Matches current form" : <span className="font-semibold text-amber-800 dark:text-amber-300">Category is now v{currentCategoryVersion}</span>}
                  {req.formVersion !== currentCategoryVersion && (
                    <FieldHelpTooltip content="This request keeps the form and data it was submitted with; later edits only apply to new requests." />
                  )}
                </p>
              </div>
            </div>
            <Link href={`/categories/${req.categoryId}/versions?v=${req.formVersion}`} className={cn("inline-block text-xs underline-offset-2", req.formVersion < currentCategoryVersion ? "font-medium text-primary hover:underline dark:text-amber-300" : "font-medium text-primary hover:underline dark:text-amber-300")}>
              {req.formVersion < currentCategoryVersion ? "Compare with current version" : "View version history"}
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="shadow-2xs">
        <CardContent className="pt-1">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList aria-label="Request sections">
          <TabsTrigger value="overview">Details</TabsTrigger>
          <TabsTrigger value="decisions">Decision</TabsTrigger>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="refund">Refund</TabsTrigger>
          <TabsTrigger value="history">Activity timeline{req.history.length > 0 ? ` (${req.history.length})` : ""}</TabsTrigger>
          {earlierRounds.length > 0 && (
            <TabsTrigger value="submissionHistory">Submission History ({earlierRounds.length})</TabsTrigger>
          )}
        </TabsList>

        {/* Information */}
        <TabsContent value="overview" className="space-y-5 pt-4">
          {req.review && (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-xs text-primary dark:bg-primary/20">
                  R{req.review.roundNumber}
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    Review Round #{req.review.roundNumber} · {req.review.status === "active" ? "In Progress" : "Completed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.review.startedBy ? `Reviewer: ${req.review.startedBy.displayName}` : reviewer ? `Reviewer: ${reviewer.name}` : "Assigned reviewer"}
                    {req.review.startedAt && ` · Started ${formatDateTime(req.review.startedAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="rounded-full bg-muted border px-2.5 py-1 text-foreground">
                  Total fields: {infoFields.length}
                </span>
                {flaggedCount > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                    {flaggedCount} flagged for revision
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                    0 flagged
                  </span>
                )}
              </div>
            </div>
          )}

          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="font-heading text-lg font-medium">Project information</CardTitle>
              <p className="text-xs text-muted-foreground">
                Fields as configured when the request was submitted. Reviewer decisions are shown per item.
              </p>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                {infoFields.map((field) => {
                  const value = req.fieldValues[field.id];
                  const review = req.itemReviews[field.id];
                  return (
                    <div key={field.id} className={cn("space-y-1.5 min-w-0", field.type === "textarea" && "md:col-span-2")}>
                      <dt className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase break-words [overflow-wrap:anywhere]">
                        {field.label}
                        {!field.required && <span className="font-normal tracking-normal normal-case">(optional)</span>}
                        <ReviewState review={review} />
                      </dt>
                      <dd className="text-sm leading-relaxed text-foreground break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap min-w-0">
                        {value ? value : <span className="text-muted-foreground italic">Not provided</span>}
                      </dd>
                      {review?.state === "flagged" && review.reason && (
                        <div className="rounded-lg border border-amber-300/80 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200 min-w-0 break-words [overflow-wrap:anywhere]">
                          <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                            <Flag className="size-3.5 shrink-0" />
                            Reviewer correction note {review.reviewer ? `(by ${review.reviewer})` : ""}:
                          </p>
                          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"><ExpandableText text={review.reason} limit={140} /></p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </dl>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="font-heading text-lg font-medium">Documents{docCount > 0 ? ` (${docCount})` : ""}</CardTitle>
              <p className="text-xs text-muted-foreground">Uploaded with this submission. Open a preview to inspect a file.</p>
            </CardHeader>
            <CardContent className="divide-y divide-border/70 pt-2">
              {fileFields.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">This form had no document uploads.</p>}
              {fileFields.map((field) => {
                const files = req.uploads[field.id] ?? [];
                const review = req.itemReviews[field.id];
                return (
                  <div key={field.id} className="space-y-2.5 py-4 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground break-words [overflow-wrap:anywhere]">{field.label}</p>
                      <span className="text-[11px] text-muted-foreground">{field.required ? "Required" : "Optional"}</span>
                      <ReviewState review={review} />
                    </div>
                    {files.length === 0 && <p className="text-xs text-muted-foreground italic">No file uploaded</p>}
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                          {/\.(jpe?g|png)$/i.test(file.name) ? <FileImage className="size-4 text-sky-600" /> : <FileText className="size-4 text-rose-600" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)} · uploaded {formatDate(file.uploadedAt)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPreview(file)}>
                          <Eye />
                          Preview
                        </Button>
                      </div>
                    ))}
                    {review?.state === "flagged" && review.reason && (
                      <div className="rounded-lg border border-amber-300/80 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200 min-w-0 break-words [overflow-wrap:anywhere]">
                        <p className="font-semibold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                          <Flag className="size-3.5 shrink-0" />
                          Reviewer correction note {review.reviewer ? `(by ${review.reviewer})` : ""}:
                        </p>
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"><ExpandableText text={review.reason} limit={140} /></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardContent className="flex items-start gap-3 pt-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">HOA approval confirmed</p>
                <p className="text-xs text-muted-foreground">
                  Resident checked “I have HOA Approval” at submission · {formatDateTime(req.hoaConfirmedAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submission History: everything about earlier rounds lives here,
            away from the current answers above. */}
        {earlierRounds.length > 0 && (
          <TabsContent value="submissionHistory" className="space-y-5 pt-4">
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
              Round #{currentSubmissionNumber(req)} is the resident&apos;s latest submission, shown in the{" "}
              <button type="button" onClick={() => setActiveTab("overview")} className="font-semibold text-primary hover:underline dark:text-amber-300">
                Details
              </button>{" "}
              tab. Everything below is what came before it.
            </div>

            {req.revisions.length > 0 && (
              <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
                <CardHeader className="border-b border-border/70 pb-3">
                  <CardTitle className="font-heading text-lg font-medium">What changed</CardTitle>
                  <p className="text-xs text-muted-foreground">Field-by-field, at a glance.</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {req.revisions.map((rev) => (
                    <div key={rev.id} className="grid gap-2 rounded-xl border border-border/80 p-3.5 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Previous · {rev.label}</p>
                        <p className="truncate text-muted-foreground line-through decoration-slate-400/60">{rev.previous}</p>
                      </div>
                      <span className="hidden text-muted-foreground sm:block" aria-hidden="true">→</span>
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Current · {format(new Date(rev.at), "MMM d")}</p>
                        <p className="truncate font-medium text-foreground">{rev.current}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <EarlierSubmissions request={req} onPreview={setPreview} />
          </TabsContent>
        )}

        {/* Decisions & deposit */}
        <TabsContent value="decisions" className="space-y-5 pt-4">
          {req.approvalLetter && (
            <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-3">
                <CardTitle className="font-heading text-lg font-medium">Staff documents</CardTitle>
                <p className="text-xs text-muted-foreground">Uploaded by the assigned reviewer during completion.</p>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4">
                <StaffFile label="Final approval letter" file={req.approvalLetter} onPreview={setPreview} />
              </CardContent>
            </Card>
          )}
          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-heading text-lg font-medium">Review decision</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {["approved", "completed", "rejected", "changes_required"].includes(req.status)
                      ? reviewer
                        ? `Decided by the assigned reviewer, ${reviewer.name}.`
                        : "Review decision recorded."
                      : reviewer
                        ? `Assigned reviewer: ${reviewer.name}.`
                        : "No reviewer has taken ownership yet."}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {req.status === "rejected" ? (
                <div className="rounded-xl border border-rose-300/70 bg-rose-50 p-4 dark:border-rose-900/70 dark:bg-rose-950/30 min-w-0 break-words [overflow-wrap:anywhere]">
                  <p className="flex items-center gap-2 text-sm font-semibold text-rose-950 dark:text-rose-200">
                    <XCircle className="size-4 shrink-0" aria-hidden="true" /> Rejection reason
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-rose-900/90 dark:text-rose-300/90 break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap">
                    <ExpandableText text={req.rejectionReason || "No rejection reason provided."} />
                  </p>
                </div>
              ) : req.status === "changes_required" || req.status === "resubmitted" || (req.review && flaggedCount > 0) ? (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-800/70 dark:bg-amber-950/30 min-w-0 break-words [overflow-wrap:anywhere]">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-200">
                    <FileEdit className="size-4 shrink-0" aria-hidden="true" />
                    {req.status === "resubmitted"
                      ? "Resident resubmitted corrections"
                      : req.status === "changes_required"
                        ? `Revision requested · ${flaggedCount} flagged item${flaggedCount === 1 ? "" : "s"}`
                        : `Active review round · ${flaggedCount} flagged item${flaggedCount === 1 ? "" : "s"}`}
                  </p>
                  {req.review?.items && req.review.items.filter((it) => it.decision === "flagged").length > 0 ? (
                    <div className="mt-3 space-y-2 min-w-0">
                      {req.review.items
                        .filter((it) => it.decision === "flagged")
                        .map((it) => (
                          <div
                            key={it.fieldId}
                            className="rounded-lg bg-card/70 p-3 text-xs border border-amber-200/80 dark:border-amber-900/60 min-w-0 break-words [overflow-wrap:anywhere]"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1 font-semibold text-foreground">
                              <span className="break-words [overflow-wrap:anywhere]">{it.label}</span>
                              {it.decidedBy && (
                                <span className="font-normal text-[10px] text-muted-foreground">
                                  Flagged by {it.decidedBy.displayName} {it.decidedAt ? `· ${formatDateTime(it.decidedAt)}` : ""}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]"><ExpandableText text={it.reason || "Reviewer flagged this field for correction."} limit={140} /></p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-1.5 text-sm text-amber-900/90 dark:text-amber-300/90 whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                      <ExpandableText text={req.feedback || "Corrections requested by reviewer."} />
                    </p>
                  )}
                </div>
              ) : ["approved", "completed"].includes(req.status) ? (
                <div className="rounded-xl border border-emerald-300/70 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" /> Approved{req.decidedAt ? ` on ${formatDate(req.decidedAt)}` : ""}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center sm:p-6">
                  <div className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {req.status === "withdrawn" ? (
                      <Ban className="size-5" aria-hidden="true" />
                    ) : (
                      <Clock className="size-5" aria-hidden="true" />
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {req.status === "assigned"
                      ? "Awaiting Review Decision"
                      : req.status === "under_review"
                        ? "Review In Progress"
                        : req.status === "submitted"
                          ? "Awaiting Reviewer Assignment"
                          : req.status === "withdrawn"
                            ? "Request Withdrawn"
                            : "No Decision Yet"}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {req.status === "assigned"
                      ? reviewer
                        ? `This request has been assigned to ${reviewer.name}, but a review decision has not been recorded yet.`
                        : "This request has been assigned, but a review decision has not been recorded yet."
                      : req.status === "under_review"
                        ? reviewer
                          ? `${reviewer.name} is currently reviewing this request. A review decision has not been submitted yet.`
                          : "This request is currently under review. A review decision has not been submitted yet."
                        : req.status === "submitted"
                          ? "This request is newly submitted and waiting to be assigned to a reviewer."
                          : req.status === "withdrawn"
                            ? req.withdrawnAt
                              ? `This request was withdrawn on ${formatDate(req.withdrawnAt)}. No review decision is required.`
                              : "This request was withdrawn and is no longer active for review."
                            : "No review decision has been recorded for this request yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {(() => {
            const current = currentSubmissionNumber(req);
            const rounds = [
              ...earlierRounds.map((s) => ({ number: s.number, feedback: feedbackForSubmission(req, s.number) })),
              ...(req.status === "changes_required" && req.feedback ? [{ number: current, feedback: req.feedback }] : []),
            ].filter((r): r is { number: number; feedback: string } => !!r.feedback);
            if (rounds.length === 0) return null;
            return (
              <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
                <CardHeader className="border-b border-border/70 pb-3">
                  <CardTitle className="font-heading text-lg font-medium">Feedback by submission round</CardTitle>
                  <p className="text-xs text-muted-foreground">The reviewer&apos;s note sent to the resident each time changes were requested.</p>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-4">
                  {rounds
                    .sort((a, b) => b.number - a.number)
                    .map((r) => (
                      <div key={r.number} className="rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2.5 text-xs dark:border-amber-800/70 dark:bg-amber-950/30">
                        <p className="font-semibold text-amber-950 dark:text-amber-200">Round {r.number}</p>
                        <p className="mt-1 whitespace-pre-line break-words [overflow-wrap:anywhere] text-amber-900/90 dark:text-amber-300/90"><ExpandableText text={r.feedback} /></p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            );
          })()}

          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="font-heading text-lg font-medium">Approval letter</CardTitle>
              <p className="text-xs text-muted-foreground">The system uses the approval letter uploaded by the reviewer (letters are not auto-generated).</p>
            </CardHeader>
            <CardContent className="pt-5">
              {!(req.completion?.finalApprovalLetter || req.approvalLetter) ? (
                <p className="text-sm text-muted-foreground">No final approval letter has been uploaded yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-3">
                    <FileCheck2 className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{(req.completion?.finalApprovalLetter || req.approvalLetter)!.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatFileSize((req.completion?.finalApprovalLetter || req.approvalLetter)!.size)}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setPreview((req.completion?.finalApprovalLetter || req.approvalLetter)!)}>
                      <Eye />
                      View
                    </Button>
                  </div>
                  {req.completion?.email ? (
                    <div className={cn(
                      "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm",
                      req.completion.email.status === "SENT"
                        ? "border-emerald-300/70 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
                        : req.completion.email.status === "FAILED"
                        ? "border-rose-300/70 bg-rose-50 dark:border-rose-900/70 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200"
                        : "border-amber-300/70 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200"
                    )}>
                      <Mail className={cn(
                        "size-5 shrink-0",
                        req.completion.email.status === "SENT" ? "text-emerald-600 dark:text-emerald-400" :
                        req.completion.email.status === "FAILED" ? "text-rose-600 dark:text-rose-400" :
                        "text-amber-600 dark:text-amber-400"
                      )} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {req.completion.email.status === "SENT" ? "Email Delivered to Resident" :
                           req.completion.email.status === "FAILED" ? "Email Delivery Failed" :
                           req.completion.email.status === "PROCESSING" ? "Email Sending..." : "Email Queued"}
                        </p>
                        <p className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere]">
                          {req.completion.email.status === "SENT" && req.completion.email.sentAt
                            ? `Sent on ${formatDateTime(req.completion.email.sentAt)}`
                            : req.completion.email.status === "FAILED"
                            ? req.completion.email.lastErrorMessage || `Attempt #${req.completion.email.attemptCount}`
                            : "Outbox processing in progress"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-300/70 bg-emerald-50 px-3.5 py-3 text-sm dark:border-emerald-900/70 dark:bg-emerald-950/30">
                      <Mail className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">Emailed to resident</p>
                        <p className="text-[11px] text-muted-foreground">{req.letterEmail ? formatDateTime(req.letterEmail.at) : "Sent on completion"}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposit */}
        <TabsContent value="deposit" className="space-y-5 pt-4">
          {req.deposit.receipt && (
            <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
              <CardHeader className="border-b border-border/70 pb-3">
                <CardTitle className="font-heading text-lg font-medium">Staff documents</CardTitle>
                <p className="text-xs text-muted-foreground">Uploaded by the assigned reviewer when the deposit was recorded.</p>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-4">
                <StaffFile label="Deposit payment receipt" staffOnly file={req.deposit.receipt} onPreview={setPreview} />
              </CardContent>
            </Card>
          )}
          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg font-medium">Deposit</CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:bg-amber-950/40 dark:text-amber-300">
                  <Lock className="size-2.5" /> Staff only
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {!req.deposit.required ? (
                <p className="text-sm text-muted-foreground">
                  {req.decidedAt ? "The reviewer marked this request as not requiring a deposit." : "Deposit is set by the reviewer after approval."}
                </p>
              ) : (
                <dl className="space-y-3">
                  <InfoRow label="Amount">
                    <span className="font-mono text-lg font-bold">${req.deposit.amount?.toLocaleString()}</span>
                  </InfoRow>
                  <InfoRow label="Status">
                    <DepositChip deposit={{ ...req.deposit, amount: undefined }} />
                  </InfoRow>
                  {req.deposit.receivedAt && <InfoRow label="Received">{formatDateTime(req.deposit.receivedAt)}</InfoRow>}
                  {req.deposit.receipt && (
                    <InfoRow label="Receipt">
                      <button
                        type="button"
                        onClick={() => setPreview(req.deposit.receipt!)}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline dark:text-amber-300"
                      >
                        <ReceiptText className="size-3.5" />
                        {req.deposit.receipt.name}
                      </button>
                    </InfoRow>
                  )}
                  <p className="text-[11px] text-muted-foreground">Payment happens outside the application. Deposit entry is a reviewer-only action.</p>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Refund */}
        <TabsContent value="refund" className="space-y-5 pt-4">
          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-lg font-medium">Refund outcome</CardTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-900 uppercase dark:bg-amber-950/40 dark:text-amber-300">
                  <Lock className="size-2.5" /> Staff only
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {!req.refund ? (
                <p className="text-sm text-muted-foreground">
                  {req.deposit.status === "received" && req.status !== "withdrawn"
                    ? "A refund outcome is only recorded if the request is withdrawn after a deposit is received."
                    : "No refund applies to this request."}
                </p>
              ) : (
                <dl className="space-y-3">
                  <InfoRow label="Outcome">
                    <RefundChip refund={req.refund} />
                  </InfoRow>
                  {req.refund.outcome === "no_refund" && (
                    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">“-” indicates No Refund.</span> A reviewer recorded that a refund is not applicable or approved; this is not an unresolved refund.
                    </p>
                  )}
                  <InfoRow label="Recorded by">{req.refund.recordedBy}</InfoRow>
                  {req.refund.proof && (
                    <InfoRow label="Proof">
                      <button type="button" onClick={() => setPreview(req.refund!.proof!)} className="inline-flex items-center gap-1.5 text-primary hover:underline dark:text-amber-300">
                        <ReceiptText className="size-3.5" />
                        {req.refund.proof.name}
                      </button>
                    </InfoRow>
                  )}
                  <InfoRow label={req.refund.outcome === "refunded" ? "Refund date" : "Recorded on"}>
                    {formatDateTime(req.refund.refundDate || req.refund.date)}
                  </InfoRow>
                  {req.refund.correctionReason && (
                    <div className="rounded-lg border border-amber-300/80 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200 min-w-0 break-words [overflow-wrap:anywhere]">
                      <p className="font-semibold mb-0.5 text-amber-800 dark:text-amber-300">Correction Reason:</p>
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">{req.refund.correctionReason}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Residents see this as read-only. {req.refund.outcome ? REFUND_LABEL[req.refund.outcome] : "—"} · partial-refund amounts are out of scope.
                  </p>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="pt-4">
          <Card className="rounded-xl border border-border/70 bg-transparent shadow-none ring-0">
            <CardHeader className="border-b border-border/70 pb-3">
              <CardTitle className="font-heading text-lg font-medium">Activity timeline</CardTitle>
              <p className="text-xs text-muted-foreground">
                Most recent to oldest. Every event records the action, the actual person, the date and time, and relevant details.
                Staff-only records are hidden from the resident.
              </p>
            </CardHeader>
            <CardContent className="pt-5">
              <HistoryTimeline events={req.history} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </CardContent>
      </Card>

      <AssignReviewerDialog request={assigning} onOpenChange={(o) => !o && setAssigning(null)} />
      {withdrawing && (
        <WithdrawRequestAdminDialog
          request={withdrawing}
          open={!!withdrawing}
          onOpenChange={(o) => !o && setWithdrawing(null)}
        />
      )}
      <FilePreviewDialog
        file={preview}
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        onRequestDownloadUrl={(fileId) => getAdminFileDownloadUrl(req.id, fileId).then((r) => r.url)}
      />
    </div>
  );
}

function StaffFile({
  label,
  file,
  staffOnly,
  onPreview,
}: {
  label: string;
  file: AttachedFile;
  staffOnly?: boolean;
  onPreview: (file: AttachedFile) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
        <FileText className="size-4 text-rose-600" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
          {staffOnly && <span className="rounded-full bg-amber-50 px-1.5 py-px text-[9px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Staff only</span>}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => onPreview(file)}>
        <Eye />
        Preview
      </Button>
    </div>
  );
}
