"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RequiredMark } from "@/components/shared/required-mark";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateReviewer, useReviewers, useUpdateReviewer } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";

const nameRegex = /^[A-Za-z\s]+$/;

const baseSchema = {
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters")
    .regex(nameRegex, "First name cannot contain numbers or special characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(nameRegex, "Last name cannot contain numbers or special characters"),
  designation: z.string().trim().min(2, "Designation is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  receiveNewRequests: z.boolean(),
};
// The invite endpoint requires an employee number; the update endpoint accepts
// it being left blank (omitted entirely rather than sent empty — see
// reviewers.service.ts), so it's only required on the create form.
const createSchema = z.object({ ...baseSchema, employeeNumber: z.string().trim().min(1, "Employee number is required") });
const editSchema = z.object({ ...baseSchema, employeeNumber: z.string().trim() });

type FormValues = z.infer<typeof createSchema>;

function splitReviewerName(name?: string): { firstName: string; lastName: string } {
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

/** Email preview of the invitation the reviewer receives. Shared with "Resend invitation". */
export function InvitationSentDialog({
  target,
  onOpenChange,
  resent,
}: {
  target: { name: string; email: string } | null;
  onOpenChange: (open: boolean) => void;
  resent?: boolean;
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <MailCheck className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="font-heading text-xl font-medium">{resent ? "Invitation Resent" : "Invitation Sent"}</DialogTitle>
          <DialogDescription>
            An invitation link was emailed to <span className="font-semibold text-foreground">{target?.email}</span>. {target?.name.split(" ")[0]} opens it, creates their own password, and can then sign in. You never see or set that password.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
          <div className="border-b border-border bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground">
            <p><span className="font-semibold text-foreground">To:</span> {target?.email}</p>
            <p><span className="font-semibold text-foreground">Subject:</span> You&apos;re invited to the Club At Ibis ARB portal</p>
          </div>
          <div className="space-y-3 px-4 py-4 text-xs leading-relaxed text-foreground/90">
            <p>Hello {target?.name.split(" ")[0]},</p>
            <p>
              You&apos;ve been added as an Architectural Review Board reviewer. Use the button below to create your password and activate your account. The link expires in 72 hours and can only be used once.
            </p>
            <span className="inline-block rounded-md select-none bg-[#112636] px-3.5 py-2 text-[11px] font-semibold text-white">Create Your Password</span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewerFormSheet({
  open,
  onOpenChange,
  reviewer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set the sheet edits this reviewer instead of creating one. */
  reviewer?: PublicReviewer | null;
}) {
  const toast = useToast();
  const editing = !!reviewer;
  const { data: reviewers } = useReviewers(100, { enabled: open && !editing });
  const create = useCreateReviewer();
  const update = useUpdateReviewer();
  const [invited, setInvited] = useState<{ name: string; email: string } | null>(null);
  const isFirstReviewer = !editing && (reviewers ?? []).filter((r) => r.receiveNewRequests && r.loginEnabled).length === 0;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    mode: "onChange",
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: { firstName: "", lastName: "", employeeNumber: "", designation: "", email: "", receiveNewRequests: false },
  });

  useEffect(() => {
    if (!open) return;
    const { firstName, lastName } = splitReviewerName(reviewer?.name);
    reset({
      firstName,
      lastName,
      employeeNumber: reviewer?.employeeNumber ?? "",
      designation: reviewer?.designation ?? "",
      email: reviewer?.email ?? "",
      receiveNewRequests: reviewer?.receiveNewRequests ?? isFirstReviewer,
    });
  }, [open, reviewer, isFirstReviewer, reset]);

  const email = watch("email");
  const pending = create.isPending || update.isPending;

  function onSubmit(values: FormValues) {
    const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
    if (editing && reviewer) {
      update.mutate(
        {
          id: reviewer.id,
          updates: {
            name: fullName,
            firstName: values.firstName.trim(),
            lastName: values.lastName.trim(),
            employeeNumber: values.employeeNumber,
            designation: values.designation,
            email: values.email,
          },
        },
        {
          onSuccess: () => {
            toast.success("Reviewer updated", `${fullName}'s account details were saved.`);
            onOpenChange(false);
          },
          onError: (e: Error) => toast.error("Could not save", e.message),
        }
      );
      return;
    }
    create.mutate(
      {
        ...values,
        name: fullName,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      },
      {
        onSuccess: (created) => {
          onOpenChange(false);
          setInvited({ name: created.name, email: created.email });
        },
        onError: (e: Error) => toast.error("Could not create reviewer", e.message),
      }
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle className="font-heading text-xl font-medium">{editing ? "Edit Reviewer" : "Add Reviewer"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Update the reviewer's profile details. Account status is managed from the reviewers list."
                : "Enter the reviewer's details. They receive an email invitation to set up their own password."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 custom-scrollbar">
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!errors.firstName}>
                    <FieldLabel htmlFor="rev-first-name">First Name<RequiredMark /></FieldLabel>
                    <FieldContent>
                      <Input
                        id="rev-first-name"
                        placeholder="e.g. Jordan"
                        maxLength={50}
                        disabled={pending}
                        aria-invalid={!!errors.firstName}
                        {...register("firstName", {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          },
                        })}
                      />
                      <FieldError errors={errors.firstName ? [errors.firstName] : []} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.lastName}>
                    <FieldLabel htmlFor="rev-last-name">Last Name<RequiredMark /></FieldLabel>
                    <FieldContent>
                      <Input
                        id="rev-last-name"
                        placeholder="e.g. Whitfield"
                        maxLength={50}
                        disabled={pending}
                        aria-invalid={!!errors.lastName}
                        {...register("lastName", {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          },
                        })}
                      />
                      <FieldError errors={errors.lastName ? [errors.lastName] : []} />
                    </FieldContent>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!errors.employeeNumber}>
                    <FieldLabel htmlFor="rev-emp">Employee Number{!editing && <RequiredMark />}</FieldLabel>
                    <FieldContent>
                      <Input id="rev-emp" placeholder="EMP-1050" maxLength={50} disabled={pending} aria-invalid={!!errors.employeeNumber} {...register("employeeNumber")} />
                      <FieldError errors={errors.employeeNumber ? [errors.employeeNumber] : []} />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!errors.designation}>
                    <FieldLabel htmlFor="rev-des">Designation<RequiredMark /></FieldLabel>
                    <FieldContent>
                      <Input id="rev-des" placeholder="Architectural Reviewer" maxLength={100} disabled={pending} aria-invalid={!!errors.designation} {...register("designation")} />
                      <FieldError errors={errors.designation ? [errors.designation] : []} />
                    </FieldContent>
                  </Field>
                </div>
                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="rev-email">Work email (login)<RequiredMark /></FieldLabel>
                  <FieldContent>
                    <Input id="rev-email" type="email" placeholder="name@clubatibis.com" maxLength={100} disabled={pending} aria-invalid={!!errors.email} {...register("email")} />
                    <FieldError errors={errors.email ? [errors.email] : []} />
                  </FieldContent>
                </Field>
              </FieldGroup>

              {!editing && (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-sky-300/70 bg-sky-50 p-3.5 text-sm dark:border-sky-900/70 dark:bg-sky-950/30">
                    <Send className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
                    <p className="text-sky-950 break-all dark:text-sky-200">
                      An invitation link will be emailed to{" "}
                      <span className="font-semibold">{email || "the reviewer"}</span>. The link opens a page where they create their own password — no password is set or shared from here.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Receive New Requests</p>
                        <FieldDescription className="mt-0.5">
                          Makes this reviewer a Default Reviewer — new submissions appear in their incoming list and they can assign or reassign requests.
                        </FieldDescription>
                      </div>
                      <Controller
                        control={control}
                        name="receiveNewRequests"
                        render={({ field }) => (
                          <Switch
                            checked={isFirstReviewer ? true : field.value}
                            onCheckedChange={(v) => field.onChange(v)}
                            disabled={pending || isFirstReviewer}
                            aria-label="Receive New Requests"
                          />
                        )}
                      />
                    </div>
                    {isFirstReviewer && (
                      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        The first reviewer automatically becomes the initial default recipient.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || (editing && !isDirty)}>
                {pending ? <Spinner className="size-4" /> : !editing && <Send className="size-4" />}
                {editing ? "Save changes" : "Create & send invitation"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <InvitationSentDialog target={invited} onOpenChange={(o) => !o && setInvited(null)} />
    </>
  );
}
