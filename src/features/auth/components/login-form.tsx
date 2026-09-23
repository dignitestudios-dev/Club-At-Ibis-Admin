"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RequiredMark } from "@/components/shared/required-mark";
import { PasswordInput } from "@/components/shared/password-input";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { loginSchema } from "@/features/auth/schemas/auth.schema";
import { useLoginMutation } from "@/features/auth/api/auth.mutations";
import { useAppDispatch } from "@/store";
import { setUser } from "@/store/slices/auth.slice";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_REDIRECT } from "@/config/routes";

export default function LoginForm() {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { mutate: login, isPending } = useLoginMutation();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    mode: "onChange",
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: LoginCredentials) {
    login(data, {
      onSuccess: ({ token, admin }) => {
        localStorage.removeItem("caia.logged-out");
        localStorage.setItem("auth-token", token);
        localStorage.setItem("auth-user", JSON.stringify(admin));
        document.cookie = `auth-token=${token}; path=/; max-age=1209600; SameSite=Lax`;
        dispatch(setUser(admin));
        toast.success(`Welcome back, ${admin.firstName}.`);
        window.location.href = returnUrl ? decodeURIComponent(returnUrl) : DEFAULT_REDIRECT;
      },
      onError: (error: Error) => toast.error(error.message || "Unable to sign in."),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 sm:px-8 space-y-5">
      <div className="space-y-1 text-center auth-field-enter auth-stagger-1">
        <span className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl border border-brand-gold/40 bg-brand-gold/10 text-brand-gold">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-xl sm:text-2xl font-medium text-foreground">Super Admin sign in</h1>
        <p className="text-xs text-muted-foreground">
          Manage reviewers, categories and oversee every request in the ARB workflow.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <div className="auth-field-enter auth-stagger-2">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Admin email<RequiredMark /></FieldLabel>
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
          </div>

          <div className="auth-field-enter auth-stagger-3">
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Field data-invalid={!!errors.password}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Password<RequiredMark /></FieldLabel>
                    <Link href="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline dark:text-amber-300">
                      Forgot password?
                    </Link>
                  </div>
                  <FieldContent>
                    <PasswordInput
                      id="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      maxLength={128}
                      disabled={isPending}
                      aria-invalid={!!errors.password}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                    <FieldError errors={errors.password ? [errors.password] : []} />
                  </FieldContent>
                </Field>
              )}
            />
          </div>

          <div className="auth-field-enter auth-stagger-4">
            <Button type="submit" className="w-full shadow-xs" disabled={isPending}>
              {isPending && <Spinner className="size-4" />}
              Sign in
            </Button>
          </div>
        </FieldGroup>
      </form>

    </div>
  );
}
