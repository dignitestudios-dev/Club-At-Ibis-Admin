"use client";

import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { RequiredMark } from "@/components/shared/required-mark";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useChangePasswordMutation } from "@/features/auth/api/auth.mutations";
import { changePasswordSchema } from "@/features/auth/schemas/auth.schema";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLogout } from "@/hooks/use-logout";
import { useToast } from "@/hooks/use-toast";

function ChangePasswordForm({ userId }: { userId: string }) {
  const toast = useToast();
  const { logout } = useLogout();
  const isSubmittingRef = useRef(false);
  const { mutate, isPending } = useChangePasswordMutation();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordPayload>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const field = (name: keyof ChangePasswordPayload, label: string, extra?: { showStrength?: boolean; autoComplete: string; placeholder?: string }) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f }) => (
        <Field data-invalid={!!errors[name]}>
          <FieldLabel htmlFor={name}>{label}<RequiredMark /></FieldLabel>
          <FieldContent>
            <PasswordInput
              id={name}
              maxLength={128}
              placeholder={extra?.placeholder}
              autoComplete={extra?.autoComplete}
              showStrength={extra?.showStrength}
              disabled={isPending}
              value={f.value}
              onChange={f.onChange}
              onBlur={f.onBlur}
              ref={f.ref}
              aria-invalid={!!errors[name]}
            />
            <FieldError errors={errors[name] ? [errors[name]!] : []} />
          </FieldContent>
        </Field>
      )}
    />
  );

  return (
    <form
      noValidate
      className="max-w-md"
      onSubmit={handleSubmit((payload) => {
        if (isSubmittingRef.current || isPending) return;
        isSubmittingRef.current = true;
        mutate(
          { id: userId, payload },
          {
            onSuccess: () => {
              isSubmittingRef.current = false;
              toast.success("Password updated", "Please sign in with your new password.");
              reset();
              setTimeout(() => {
                logout();
              }, 1200);
            },
            onError: (e: Error) => {
              isSubmittingRef.current = false;
              toast.error("Could not update password", e.message);
            },
            onSettled: () => {
              isSubmittingRef.current = false;
            },
          }
        );
      })}
    >
      <FieldGroup>
        {field("currentPassword", "Current password", { autoComplete: "current-password" })}
        {field("newPassword", "New password", { showStrength: true, autoComplete: "new-password" })}
        {field("confirmNewPassword", "Confirm new password", { autoComplete: "new-password", placeholder: "Re-enter new password" })}
        <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
          {isPending && <Spinner className="size-4" />}
          Update password
        </Button>
      </FieldGroup>
    </form>
  );
}

export default function ProfilePage() {
  const user = useCurrentUser();
  if (!user) return null;
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title="My Profile" description="Your Super Admin account details." />

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-gold to-amber-600" />
        <div className="flex items-center gap-4">
          <PersonAvatar name={name} className="size-16" fallbackClassName="text-xl" />
          <div className="space-y-1.5">
            <h2 className="font-heading text-2xl font-medium text-foreground">{name}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-brand-gold uppercase">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Super Admin
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in duration-300">
        <Card className="shadow-2xs">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Name</dt>
                <dd className="text-sm text-foreground">{name}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Email</dt>
                <dd className="flex items-center gap-1.5 text-sm break-all text-foreground">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  {user.email}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        {/* Change Password card hidden per request — the API and form are still
            here and working, just not surfaced in the profile UI for now. */}
        {/* <Card className="shadow-2xs">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Change Password</CardTitle>
            <p className="text-xs text-muted-foreground">Choose a strong password you don&apos;t use anywhere else.</p>
          </CardHeader>
          <CardContent className="pt-5">
            <ChangePasswordForm userId={user.id} />
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
