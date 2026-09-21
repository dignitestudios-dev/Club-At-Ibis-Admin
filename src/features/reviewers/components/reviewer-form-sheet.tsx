"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dices, Info, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RequiredMark } from "@/components/shared/required-mark";
import { PasswordInput } from "@/components/shared/password-input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateReviewer, useReviewers, useUpdateReviewer } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { generatePassword } from "@/lib/password";
import { cn } from "@/utils/cn";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter the reviewer's full name"),
    employeeNumber: z.string().trim().min(1, "Employee number is required"),
    designation: z.string().trim().min(2, "Designation is required"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    receiveNewRequests: z.boolean(),
    loginMode: z.enum(["invite", "temporary"]),
    temporaryPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.loginMode === "temporary" && (data.temporaryPassword?.length ?? 0) < 8) {
      ctx.addIssue({ code: "custom", path: ["temporaryPassword"], message: "Temporary password must be at least 8 characters" });
    }
  });

type FormValues = z.infer<typeof schema>;

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
  const { data: reviewers } = useReviewers();
  const create = useCreateReviewer();
  const update = useUpdateReviewer();
  const editing = !!reviewer;
  const isFirstReviewer = !editing && (reviewers ?? []).filter((r) => r.receiveNewRequests && r.loginEnabled).length === 0;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      employeeNumber: "",
      designation: "",
      email: "",
      receiveNewRequests: false,
      loginMode: "invite",
      temporaryPassword: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: reviewer?.name ?? "",
      employeeNumber: reviewer?.employeeNumber ?? "",
      designation: reviewer?.designation ?? "",
      email: reviewer?.email ?? "",
      receiveNewRequests: reviewer?.receiveNewRequests ?? isFirstReviewer,
      loginMode: "invite",
      temporaryPassword: "",
    });
  }, [open, reviewer, isFirstReviewer, reset]);

  const loginMode = watch("loginMode");
  const pending = create.isPending || update.isPending;

  function onSubmit(values: FormValues) {
    if (editing && reviewer) {
      update.mutate(
        {
          id: reviewer.id,
          updates: {
            name: values.name,
            employeeNumber: values.employeeNumber,
            designation: values.designation,
            email: values.email,
          },
        },
        {
          onSuccess: () => {
            toast.success("Reviewer updated", `${values.name}'s account details were saved.`);
            onOpenChange(false);
          },
          onError: (e: Error) => toast.error("Could not save", e.message),
        }
      );
      return;
    }
    create.mutate(values, {
      onSuccess: (created) => {
        toast.success(
          "Reviewer account created",
          values.loginMode === "invite"
            ? `An invitation email was sent to ${created.email}.`
            : `${created.name} can sign in with the temporary password.`
        );
        onOpenChange(false);
      },
      onError: (e: Error) => toast.error("Could not create reviewer", e.message),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="font-heading text-xl font-medium">
            {editing ? "Edit reviewer" : "Add reviewer"}
          </SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the reviewer's profile details. Login access is managed from the reviewers list."
              : "Create an ARB reviewer account and set up their login access."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 custom-scrollbar">
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="rev-name">Full name<RequiredMark /></FieldLabel>
                <FieldContent>
                  <Input id="rev-name" placeholder="e.g. Jordan Whitfield" aria-invalid={!!errors.name} {...register("name")} />
                  <FieldError errors={errors.name ? [errors.name] : []} />
                </FieldContent>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.employeeNumber}>
                  <FieldLabel htmlFor="rev-emp">Employee number<RequiredMark /></FieldLabel>
                  <FieldContent>
                    <Input id="rev-emp" placeholder="EMP-1050" aria-invalid={!!errors.employeeNumber} {...register("employeeNumber")} />
                    <FieldError errors={errors.employeeNumber ? [errors.employeeNumber] : []} />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!errors.designation}>
                  <FieldLabel htmlFor="rev-des">Designation<RequiredMark /></FieldLabel>
                  <FieldContent>
                    <Input id="rev-des" placeholder="Architectural Reviewer" aria-invalid={!!errors.designation} {...register("designation")} />
                    <FieldError errors={errors.designation ? [errors.designation] : []} />
                  </FieldContent>
                </Field>
              </div>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="rev-email">Work email (login)<RequiredMark /></FieldLabel>
                <FieldContent>
                  <Input id="rev-email" type="email" placeholder="name@clubatibis.com" aria-invalid={!!errors.email} {...register("email")} />
                  <FieldError errors={errors.email ? [errors.email] : []} />
                </FieldContent>
              </Field>
            </FieldGroup>

            {!editing && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Login access</p>
                  <p className="text-xs text-muted-foreground">How the reviewer gets their first password.</p>
                </div>
                <Controller
                  control={control}
                  name="loginMode"
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2.5">
                      {[
                        { value: "invite", icon: Mail, title: "Send invitation email", body: "The reviewer receives a link and sets their own password." },
                        { value: "temporary", icon: KeyRound, title: "Set a temporary password", body: "You share it securely; they can change it after signing in." },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const selected = field.value === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors",
                              selected ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5" : "border-border hover:border-foreground/30"
                            )}
                          >
                            <RadioGroupItem value={opt.value} className="mt-0.5" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <Icon className="size-3.5" aria-hidden="true" />
                                {opt.title}
                              </span>
                              <span className="block text-xs text-muted-foreground">{opt.body}</span>
                            </span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}
                />

                {loginMode === "temporary" && (
                  <Field data-invalid={!!errors.temporaryPassword} className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="rev-pass">Temporary password<RequiredMark /></FieldLabel>
                      <button
                        type="button"
                        onClick={() => setValue("temporaryPassword", generatePassword(), { shouldValidate: true })}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-amber-300"
                      >
                        <Dices className="size-3.5" />
                        Generate
                      </button>
                    </div>
                    <FieldContent>
                      <Controller
                        control={control}
                        name="temporaryPassword"
                        render={({ field }) => (
                          <PasswordInput id="rev-pass" placeholder="At least 8 characters" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                        )}
                      />
                      <FieldError errors={errors.temporaryPassword ? [errors.temporaryPassword] : []} />
                    </FieldContent>
                  </Field>
                )}
              </div>
            )}

            {!editing && (
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
                        disabled={isFirstReviewer}
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
            )}
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-4" />}
              {editing ? "Save changes" : "Create reviewer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
