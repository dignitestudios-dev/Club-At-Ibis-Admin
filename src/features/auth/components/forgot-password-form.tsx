"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { RequiredMark } from "@/components/shared/required-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema";
import { useForgotPasswordMutation } from "@/features/auth/api/auth.mutations";

export default function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const { mutate, isPending } = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordPayload>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  if (submitted) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 sm:px-8 space-y-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
          <MailCheck className="size-5" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-medium text-foreground">Check Your Email</h1>
          <p className="text-sm text-muted-foreground">
            If an administrator account exists for that email, we&apos;ve sent a link to reset the password.
          </p>
        </div>
        <Link href="/auth/login" className="text-sm font-medium text-primary hover:underline block pt-2 dark:text-amber-300">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 sm:px-8 space-y-6">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-medium text-foreground">Forgot Password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your administrator email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit((data) => mutate(data, { onSuccess: () => setSubmitted(true) }))} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Admin Email<RequiredMark /></FieldLabel>
            <FieldContent>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@clubatibis.com"
                maxLength={320}
                disabled={isPending}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={errors.email ? [errors.email] : []} />
            </FieldContent>
          </Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Spinner className="size-4" />}
            Send Reset Link
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="font-medium text-primary hover:underline dark:text-amber-300">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
