"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { RequiredMark } from "@/components/shared/required-mark";
import { PasswordInput } from "@/components/shared/password-input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { useResetPasswordMutation } from "@/features/auth/api/auth.mutations";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const { mutate, isPending } = useResetPasswordMutation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <div className="flex-1 px-6 py-8 sm:px-8 space-y-4 text-center">
        <h1 className="font-heading text-2xl font-medium text-foreground">Link expired</h1>
        <p className="text-sm text-muted-foreground">
          This reset link is missing, invalid or has already been used. Request another one.
        </p>
        <Link href="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline dark:text-amber-300">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 sm:px-8 space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password for your administrator account.</p>
      </div>
      <form
        onSubmit={handleSubmit((data) =>
          mutate(
            { token, ...data },
            {
              onSuccess: () => {
                toast.success("Password updated", "Sign in with your new password.");
                router.push("/auth/login");
              },
              onError: (e: Error) => toast.error(e.message),
            }
          )
        )}
        noValidate
      >
        <FieldGroup>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">New password<RequiredMark /></FieldLabel>
                <FieldContent>
                  <PasswordInput id="password" showStrength maxLength={128} disabled={isPending} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                  <FieldError errors={errors.password ? [errors.password] : []} />
                </FieldContent>
              </Field>
            )}
          />
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <Field data-invalid={!!errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">Confirm password<RequiredMark /></FieldLabel>
                <FieldContent>
                  <PasswordInput id="confirmPassword" maxLength={128} disabled={isPending} value={field.value} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref} />
                  <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : []} />
                </FieldContent>
              </Field>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Spinner className="size-4" />}
            Update password
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
