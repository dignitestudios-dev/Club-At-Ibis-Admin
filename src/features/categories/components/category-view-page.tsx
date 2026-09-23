"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  History,
  Pencil,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RequiredMark } from "@/components/shared/required-mark";
import { useCategory, useCategoryVersions, useCommonForm } from "@/hooks/use-admin-data";
import { useUrlParams } from "@/hooks/use-url-params";
import { describeAccept } from "@/features/categories/components/field-types";
import { FieldHelpTooltip } from "@/components/shared/field-help-tooltip";
import { cn } from "@/utils/cn";

export default function CategoryViewPage({ id }: { id: string }) {
  const { data: category, isLoading: isCategoryLoading } = useCategory(id);
  const { data: versionsData, isLoading: isVersionsLoading } = useCategoryVersions(id);
  const { data: commonFormData, isLoading: isCommonLoading } = useCommonForm();

  const { values, set } = useUrlParams({ v: "" });
  const versions = versionsData?.versions ?? [];
  const currentVersionNumber = category?.currentVersion ?? category?.version ?? 1;
  const selectedVersionNumber = values.v ? Number(values.v) : currentVersionNumber;

  // Selected version details
  const selectedVersion = useMemo(() => {
    if (!versions.length) return null;
    return versions.find((v) => v.version === selectedVersionNumber) ?? versions[0];
  }, [versions, selectedVersionNumber]);

  const activeCategory = selectedVersion || category;
  const isLoading = isCategoryLoading || isVersionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-6 w-36 rounded-md" />
        <Skeleton className="h-14 w-1/3 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!category) {
    return (
      <EmptyState
        icon={FileText}
        title="Category not found"
        description="The category you requested could not be found or may have been deleted."
        action={
          <Button nativeButton={false} render={<Link href="/categories" />}>
            Back to categories
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top action bar with back link, version selector, and edit links */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
        <Link
          href="/categories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to categories
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {versions.length > 1 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs text-muted-foreground">Version:</span>
              <Select
                value={String(selectedVersionNumber)}
                onValueChange={(val) => set({ v: !val || val === String(currentVersionNumber) ? "" : val })}
              >
                <SelectTrigger className="h-8 w-32 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {versions.map((v) => (
                    <SelectItem key={v.version} value={String(v.version)} className="text-xs">
                      v{v.version} {v.version === currentVersionNumber ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/categories/${category.id}/versions`} />}
          >
            <History className="size-3.5" />
            Version history (v{currentVersionNumber})
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/categories/${category.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit form
          </Button>
        </div>
      </div>

      {/* Resident 3-Step Wizard View */}
      <ResidentWizardView
        key={`${category.id}-v${selectedVersionNumber}`}
        categoryName={activeCategory?.name || category.name}
        categoryDescription={activeCategory?.description || category.description}
        dynamicFields={activeCategory?.fields || []}
        commonFields={commonFormData?.fields || []}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3-Step Resident Form View (All fields disabled, no draft button)   */
/* ------------------------------------------------------------------ */

function ResidentWizardView({
  categoryName,
  categoryDescription,
  dynamicFields,
  commonFields,
}: {
  categoryName: string;
  categoryDescription: string;
  dynamicFields: CategoryField[];
  commonFields: CategoryField[];
}) {
  const [stepIndex, setStepIndex] = useState(0);

  // 1. Step 1: Common / Standard project info fields
  const standardFields: CategoryField[] = useMemo(() => {
    if (commonFields.length > 0) return commonFields;
    return [
      { id: "projectTitle", label: "Project Title", type: "text", required: true, order: 0, helpText: "A concise summary of the proposed modification." },
      { id: "propertyAddress", label: "Property / Lot Number", type: "text", required: true, order: 1 },
      { id: "estimatedStartDate", label: "Estimated Start Date", type: "date", required: true, order: 2 },
      { id: "estimatedCompletionDate", label: "Estimated Completion Date", type: "date", required: true, order: 3 },
      { id: "contractorName", label: "Contractor / Company Name", type: "text", required: false, order: 4 },
      { id: "projectDescription", label: "Project Overview & Scope of Work", type: "textarea", required: true, order: 5, helpText: "Include dimensions, materials, color schemes, and contractor details." },
    ];
  }, [commonFields]);

  // 2. Step 2: Dynamic fields (category specific fields)
  // 3. Step 3: Review & Submit
  const stepperSteps = useMemo(() => [
    { id: "common-info", title: "Project Information" },
    { id: "category-specs", title: "Category Details" },
    { id: "review-submit", title: "Review & Submit" },
  ], []);

  function handleNext() {
    if (stepIndex < stepperSteps.length - 1) {
      setStepIndex((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStepIndex((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={categoryName}
        description={categoryDescription || "Architectural review submission form"}
      />

      {/* Stepper Header (Exact resident app styling) */}
      <nav aria-label="Request progress" className="w-full py-2">
        <ol className="flex items-center w-full">
          {stepperSteps.map((step, index) => {
            const isComplete = index < stepIndex;
            const isCurrent = index === stepIndex;
            const isLast = index === stepperSteps.length - 1;

            return (
              <li
                key={step.id}
                aria-current={isCurrent ? "step" : undefined}
                className={cn("flex items-center", isLast ? "w-auto shrink-0" : "flex-1")}
              >
                <button
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className="flex items-center gap-2.5 text-left cursor-pointer group"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 shadow-2xs",
                      isComplete
                        ? "bg-primary text-white"
                        : isCurrent
                        ? "bg-primary text-white ring-4 ring-primary/15"
                        : "bg-slate-100 text-slate-500 border border-border/80 group-hover:border-slate-400 dark:bg-slate-800 dark:text-slate-400"
                    )}
                  >
                    {isComplete ? <Check className="size-3.5 stroke-[2.5]" /> : <span>{index + 1}</span>}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden sm:inline-block text-xs font-medium whitespace-nowrap transition-colors",
                      isCurrent
                        ? "font-semibold text-primary"
                        : isComplete
                        ? "text-foreground font-medium"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </button>

                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="mx-3 sm:mx-4 flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
                  >
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        isComplete ? "w-full bg-primary" : "w-0 bg-transparent"
                      )}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Main Resident Form Card */}
      <Card className="p-5 sm:p-6 shadow-2xs">
        {/* ========================================================= */}
        {/* Step 1: Common / Standard Information                     */}
        {/* ========================================================= */}
        {stepIndex === 0 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="font-heading text-xl font-medium text-foreground">
                Project Information
              </h2>
              <p className="text-sm text-muted-foreground">
                Tell us about the property and the proposed project.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {standardFields.map((field) => (
                <div
                  key={field.id}
                  className={cn(
                    field.type === "textarea" ? "sm:col-span-2" : undefined
                  )}
                >
                  <DisabledFieldRenderer field={field} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Step 2: Dynamic Fields (Category Specific Specifications) */}
        {/* ========================================================= */}
        {stepIndex === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="font-heading text-xl font-medium text-foreground">
                {categoryName} Details
              </h2>
              <p className="text-sm text-muted-foreground">
                {dynamicFields.length === 0
                  ? "No additional category-specific fields configured."
                  : "Provide specific details and required documents for this category."}
              </p>
            </div>

            {dynamicFields.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border py-12 text-center">
                <p className="text-sm font-medium text-foreground">No additional custom fields</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This category collects only standard project information.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {dynamicFields.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      field.type === "textarea" || field.type === "file" || field.type === "checkbox"
                        ? "sm:col-span-2"
                        : undefined
                    )}
                  >
                    <DisabledFieldRenderer field={field} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* Step 3: Review & Submit                                   */}
        {/* ========================================================= */}
        {stepIndex === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="font-heading text-xl font-medium text-foreground">
                Review &amp; Submit
              </h2>
              <p className="text-sm text-muted-foreground">
                Please confirm the details below before submitting to the ARB.
              </p>
            </div>

            {/* Review Sections */}
            <div className="space-y-6">
              {/* Common info summary */}
              <div className="space-y-2.5">
                <p className="text-sm font-medium text-foreground">Project Information</p>
                <dl className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs sm:grid-cols-2">
                  {standardFields.map((field) => (
                    <div key={field.id} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                      <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-foreground">—</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Dynamic fields summary */}
              {dynamicFields.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-sm font-medium text-foreground">{categoryName} Specifications</p>
                  <dl className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs sm:grid-cols-2">
                    {dynamicFields.map((field) => (
                      <div
                        key={field.id}
                        className={field.type === "textarea" || field.type === "file" ? "sm:col-span-2" : ""}
                      >
                        <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-foreground">
                          {field.type === "file" ? "No documents attached" : "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* HOA Approval Card (Disabled in View Mode) */}
            <div className="space-y-2 pt-1" role="group" aria-labelledby="hoa-approval-title">
              <div
                className="group relative flex items-start gap-3.5 sm:gap-4 rounded-2xl border border-border/90 bg-muted/20 p-4.5 sm:p-5 select-none"
              >
                {/* Left Icon Badge */}
                <div
                  className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mt-0.5"
                  aria-hidden="true"
                >
                  <ShieldCheck className="size-5 sm:size-5.5" />
                </div>

                {/* Center Content */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span id="hoa-approval-title" className="font-heading text-sm sm:text-base font-semibold text-foreground">
                      Homeowners Association (HOA) Approval
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                      Required
                    </span>
                  </div>

                  <p className="text-sm font-medium text-foreground leading-snug">
                    I have HOA Approval for this project.
                  </p>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The Club at Ibis Architectural Review Board requires prior written HOA approval from your sub-association before processing this request.
                  </p>
                </div>

                {/* Right Checkbox */}
                <div className="mt-0.5 pl-1 shrink-0">
                  <Checkbox
                    id="hoaApproved"
                    disabled
                    className="size-5 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Action Bar (No Save Draft button, Back/Next navigation only) */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={stepIndex === 0}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>

          <div>
            {stepIndex < stepperSteps.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button disabled>
                <Send className="size-4" />
                Submit Request
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Disabled Resident Field Renderer (All fields disabled)             */
/* ------------------------------------------------------------------ */

function DisabledFieldRenderer({ field }: { field: CategoryField }) {
  return (
    <div className="space-y-1.5 opacity-90">
      <label htmlFor={field.id} className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
        <span>{field.label}</span>
        {field.required && (
          <span className="text-red-500 font-bold text-sm leading-none" aria-hidden="true">*</span>
        )}
        <FieldHelpTooltip content={field.helpText} />
      </label>

      {/* Text */}
      {field.type === "text" && (
        <Input
          id={field.id}
          disabled
          maxLength={255}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Textarea */}
      {field.type === "textarea" && (
        <Textarea
          id={field.id}
          disabled
          rows={3}
          maxLength={2000}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Number */}
      {field.type === "number" && (
        <Input
          id={field.id}
          type="number"
          disabled
          placeholder="0"
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Email */}
      {field.type === "email" && (
        <Input
          id={field.id}
          type="email"
          disabled
          placeholder="name@example.com"
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Phone */}
      {field.type === "phone" && (
        <Input
          id={field.id}
          type="tel"
          disabled
          placeholder="(555) 000-0000"
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Date */}
      {field.type === "date" && (
        <Input
          id={field.id}
          type="date"
          disabled
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Time */}
      {field.type === "time" && (
        <Input
          id={field.id}
          type="time"
          disabled
          className="bg-muted/20 cursor-not-allowed"
        />
      )}

      {/* Select (Dropdown opens to view options, items disabled) */}
      {field.type === "select" && (
        <Select>
          <SelectTrigger className="w-full bg-card">
            <SelectValue placeholder="Choose an option..." />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? ["Option 1", "Option 2"]).map((opt, i) => (
              <SelectItem key={i} value={opt} disabled>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Radio */}
      {field.type === "radio" && (
        <RadioGroup disabled className="space-y-2 pt-1 opacity-70 cursor-not-allowed">
          {(field.options ?? ["Option 1", "Option 2"]).map((opt, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <RadioGroupItem value={opt} id={`${field.id}-opt-${i}`} disabled />
              <label htmlFor={`${field.id}-opt-${i}`} className="text-sm text-foreground cursor-not-allowed">
                {opt}
              </label>
            </div>
          ))}
        </RadioGroup>
      )}

      {/* Checkbox Group */}
      {field.type === "checkbox" && (
        <div className="grid gap-2.5 pt-1 sm:grid-cols-2 opacity-70">
          {(field.options ?? ["Option 1", "Option 2"]).map((opt, i) => (
            <label
              key={i}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 p-3 cursor-not-allowed select-none"
            >
              <Checkbox disabled />
              <span className="text-sm font-medium text-foreground">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {/* File Dropzone (Disabled) */}
      {field.type === "file" && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/20 p-6 text-center shadow-2xs opacity-80 cursor-not-allowed">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <Upload className="size-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Click to upload or drag and drop
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {describeAccept(field.accept)}
              {field.multiple ? " · Multiple files allowed" : " · Single file"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
