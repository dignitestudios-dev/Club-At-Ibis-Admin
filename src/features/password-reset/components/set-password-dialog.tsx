"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/shared/password-input";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { RequiredMark } from "@/components/shared/required-mark";
import type { ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useSetUserPassword } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";

/** Super Admin sets a new password for an active resident or reviewer. */
export function SetPasswordDialog({
  target,
  onOpenChange,
}: {
  target: ResetTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const mutation = useSetUserPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (target) {
      setPassword("");
      setConfirm("");
      setTouched(false);
    }
  }, [target]);

  if (!target) return null;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isComplex = hasLower && hasUpper && hasDigit && hasSymbol;
  const tooShort = password.length < 8;
  const mismatch = confirm !== password;
  const invalid = tooShort || !isComplex || mismatch;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (invalid || !target) return;
    mutation.mutate(
      { userKind: target.kind, userId: target.id, password },
      {
        onSuccess: () => {
          toast.success("Password changed", `${target.name} can sign in with the new password. They were notified by email.`);
          onOpenChange(false);
        },
        onError: (err: Error) => toast.error("Could not change password", err.message),
      }
    );
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-amber-300">
              <KeyRound className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-xl font-medium">Change password</DialogTitle>
            <DialogDescription>Set a new password directly. The account owner is emailed that an administrator changed it.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <PersonAvatar name={target.name} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{target.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {target.kind === "reviewer" ? "ARB Reviewer" : "Resident"} · {target.email}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sp-new" className="flex items-center text-sm font-medium text-foreground">
              New password
              <RequiredMark />
            </label>
            <PasswordInput id="sp-new" showStrength autoComplete="new-password" maxLength={128} disabled={mutation.isPending} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={touched && (tooShort || !isComplex)} />
            {touched && tooShort && <p className="text-xs text-destructive" role="alert">Password must be at least 8 characters.</p>}
            {touched && !tooShort && !isComplex && <p className="text-xs text-destructive" role="alert">Password must contain uppercase, lowercase, number, and symbol.</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sp-confirm" className="flex items-center text-sm font-medium text-foreground">
              Confirm new password
              <RequiredMark />
            </label>
            <PasswordInput id="sp-confirm" autoComplete="new-password" maxLength={128} disabled={mutation.isPending} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={touched && mismatch} />
            {touched && mismatch && <p className="text-xs text-destructive" role="alert">Passwords do not match.</p>}
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            This is recorded in the system activity under your name. The password itself is never logged.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="size-4" />}
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
