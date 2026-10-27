"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, ShieldAlert } from "lucide-react";
import { PasswordInput } from "@/components/shared/password-input";
import { RequiredMark } from "@/components/shared/required-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useDisableMasterPassword, useMasterPasswordStatus, useSetMasterPassword } from "@/features/auth/api/master-access";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/utils/format";

const masterPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your own current password").max(128, "Password must not exceed 128 characters"),
    masterPassword: z
      .string()
      .min(8, "Master password must contain at least 8 characters")
      .max(128, "Password must not exceed 128 characters")
      .regex(/[a-z]/, "Master password must contain a lowercase letter")
      .regex(/[A-Z]/, "Master password must contain an uppercase letter")
      .regex(/\d/, "Master password must contain a number")
      .regex(/[^A-Za-z0-9]/, "Master password must contain a symbol"),
    confirmMasterPassword: z.string().min(1, "Please confirm the master password"),
  })
  .refine((d) => d.masterPassword === d.confirmMasterPassword, {
    message: "Passwords do not match",
    path: ["confirmMasterPassword"],
  });

type MasterPasswordForm = z.infer<typeof masterPasswordSchema>;

function StatusPill({ configured, enabled }: { configured: boolean; enabled: boolean }) {
  const label = !configured ? "Not set" : enabled ? "Active" : "Disabled";
  const cls = enabled
    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function DisableDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const toast = useToast();
  const disable = useDisableMasterPassword();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close(next: boolean) {
    if (disable.isPending) return;
    if (!next) {
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  }

  function submit() {
    if (!password) {
      setError("Enter your own current password");
      return;
    }
    disable.mutate(
      { currentPassword: password },
      {
        onSuccess: () => {
          toast.success("Master password disabled", "New master-password sign-ins stop working now. Admin access from a resident record still works.");
          close(false);
        },
        onError: (e: Error) => setError(e.message || "Could not disable the master password."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disable the master password?</DialogTitle>
          <DialogDescription>
            Nobody can sign in to a resident account with the master password any more, and open master-password sessions end
            immediately. You can set it again at any time.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="disable-master-current">
            Your current password
            <RequiredMark />
          </FieldLabel>
          <FieldContent>
            <PasswordInput
              id="disable-master-current"
              autoComplete="current-password"
              maxLength={128}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
            />
            <FieldError errors={error ? [{ message: error }] : []} />
          </FieldContent>
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={disable.isPending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={disable.isPending}>
            {disable.isPending && <Spinner className="size-4" />}
            Disable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Super Admin: create, change, re-enable or disable the one system-wide master password. */
export function MasterAccessCard() {
  const toast = useToast();
  const { data: status, isLoading, isError, refetch } = useMasterPasswordStatus();
  const setMaster = useSetMasterPassword();
  const isSubmittingRef = useRef(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<MasterPasswordForm>({
    mode: "onChange",
    resolver: zodResolver(masterPasswordSchema),
    defaultValues: { currentPassword: "", masterPassword: "", confirmMasterPassword: "" },
  });

  const configured = !!status?.configured;
  const enabled = !!status?.enabled;

  function onSubmit(values: MasterPasswordForm) {
    if (isSubmittingRef.current || setMaster.isPending) return;
    isSubmittingRef.current = true;
    setMaster.mutate(
      { currentPassword: values.currentPassword, masterPassword: values.masterPassword },
      {
        onSuccess: () => {
          reset();
          toast.success(
            configured ? "Master password updated" : "Master password set",
            "Earlier master-password sessions have ended. Share the new password only with authorised ARB team members."
          );
        },
        onError: (e: Error) => {
          setError("currentPassword", { message: e.message || "Could not save the master password." });
          toast.error("Could not save the master password", e.message);
        },
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      }
    );
  }

  const field = (name: keyof MasterPasswordForm, label: string, autoComplete: string, showStrength = false) => (
    <Controller
      name={name}
      control={control}
      render={({ field: f }) => (
        <Field data-invalid={!!errors[name]}>
          <FieldLabel htmlFor={`master-${name}`}>
            {label}
            <RequiredMark />
          </FieldLabel>
          <FieldContent>
            <PasswordInput
              id={`master-${name}`}
              maxLength={128}
              autoComplete={autoComplete}
              showStrength={showStrength}
              disabled={setMaster.isPending}
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
    <Card id="master-access" className="scroll-mt-20 shadow-2xs">
      <CardHeader className="border-b border-border/70 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-heading text-lg font-medium">
            <KeyRound className="size-4.5 text-primary dark:text-amber-300" aria-hidden="true" />
            Master Access
          </CardTitle>
          {status && <StatusPill configured={configured} enabled={enabled} />}
        </div>
        <p className="text-xs text-muted-foreground">
          One shared password that lets an authorised person open any resident account from the Resident portal (resident email + master password). Sessions last 15 minutes, can&apos;t change the resident&apos;s password or delete the account, and every change is recorded as an admin edit.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : isError ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            Couldn&apos;t load the master password status.
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50/60 p-3 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Because the password is shared, the history can show that an admin made a change but not which person. Share it sparingly and change it when someone no longer needs it. Changing or disabling it ends all open master-password sessions.
              </span>
            </div>

            {configured && status?.updatedAt && (
              <p className="text-xs text-muted-foreground">Last updated {formatDateTime(status.updatedAt)}</p>
            )}

            <form noValidate className="max-w-md" onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup>
                {field("masterPassword", configured ? "New master password" : "Master password", "new-password", true)}
                {field("confirmMasterPassword", "Confirm master password", "new-password")}
                {field("currentPassword", "Your current password", "current-password")}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={setMaster.isPending}>
                    {setMaster.isPending && <Spinner className="size-4" />}
                    {!configured ? "Set master password" : enabled ? "Change master password" : "Set and enable"}
                  </Button>
                  {configured && enabled && (
                    <Button type="button" variant="outline" onClick={() => setDisableOpen(true)} disabled={setMaster.isPending}>
                      Disable
                    </Button>
                  )}
                </div>
              </FieldGroup>
            </form>
          </>
        )}
      </CardContent>
      <DisableDialog open={disableOpen} onOpenChange={setDisableOpen} />
    </Card>
  );
}
