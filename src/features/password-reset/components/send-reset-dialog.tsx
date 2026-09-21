"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { useSendPasswordReset } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";

export interface ResetTarget {
  kind: "resident" | "reviewer";
  id: string;
  name: string;
  email: string;
}

export function SendResetDialog({
  target,
  onOpenChange,
}: {
  target: ResetTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const send = useSendPasswordReset();
  const toast = useToast();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (target) setSent(false);
  }, [target]);

  if (!target) return null;

  function handleSend() {
    if (!target) return;
    send.mutate(
      { userKind: target.kind, userId: target.id },
      {
        onSuccess: () => setSent(true),
        onError: (e: Error) => toast.error("Could not send link", e.message),
      }
    );
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!sent ? (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-amber-300">
                <KeyRound className="size-5" aria-hidden="true" />
              </div>
              <DialogTitle className="font-heading text-xl font-medium">Send password-reset link?</DialogTitle>
              <DialogDescription>
                {target.name} will receive an email with a secure link to set a new password. Their current password stays valid until they use it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
              <PersonAvatar name={target.name} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{target.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {target.kind === "reviewer" ? "ARB Reviewer" : "Resident"} · {target.email}
                </p>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              The reset initiation is recorded in the system activity history under your name.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={send.isPending}>
                {send.isPending ? <Spinner className="size-4" /> : <Mail className="size-4" />}
                Send reset link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="size-5" aria-hidden="true" />
              </div>
              <DialogTitle className="font-heading text-xl font-medium">Reset link sent</DialogTitle>
              <DialogDescription>
                {target.name} can now set a new password. This action was recorded in the activity log.
              </DialogDescription>
            </DialogHeader>

            {/* Email preview */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
              <div className="border-b border-border bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground">
                <p><span className="font-semibold text-foreground">To:</span> {target.email}</p>
                <p><span className="font-semibold text-foreground">Subject:</span> Reset your Club At Ibis password</p>
              </div>
              <div className="space-y-3 px-4 py-4 text-xs leading-relaxed text-foreground/90">
                <p>Hello {target.name.split(" ")[0]},</p>
                <p>
                  The Club at Ibis Architectural Review Board administrator requested a password reset for your account. Use the button below to choose a new password. The link expires in 24 hours and can only be used once.
                </p>
                <span className="inline-block rounded-md bg-[#112636] px-3.5 py-2 text-[11px] font-semibold text-white">
                  Set a new password
                </span>
                <p className="text-muted-foreground">If you didn&apos;t expect this email, you can safely ignore it.</p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
