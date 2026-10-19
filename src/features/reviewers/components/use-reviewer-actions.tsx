"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SetPasswordDialog } from "@/features/password-reset/components/set-password-dialog";
import { InvitationSentDialog } from "@/features/reviewers/components/reviewer-form-sheet";
import { SendResetDialog, type ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useResendInvitation, useSetLoginEnabled, useSetReceiveNewRequests } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Shared behaviour for reviewer rows and the reviewer detail page: routing
 * toggle, login access (activate/deactivate), password reset and resend invitation.
 */
export function useReviewerActions({ defaultReviewersCount }: { defaultReviewersCount?: number } = {}) {
  const toast = useToast();
  const setReceive = useSetReceiveNewRequests();
  const setLogin = useSetLoginEnabled();
  const resend = useResendInvitation();
  const [passwordTarget, setPasswordTarget] = useState<ResetTarget | null>(null);
  const [resentTo, setResentTo] = useState<{ name: string; email: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [confirmLogin, setConfirmLogin] = useState<PublicReviewer | null>(null);
  const [blockedDeactivation, setBlockedDeactivation] = useState<PublicReviewer | null>(null);

  function toggleReceive(rev: PublicReviewer, enabled: boolean) {
    setReceive.mutate(
      { id: rev.id, enabled },
      {
        onSuccess: () =>
          toast.success(
            enabled ? "Now receiving new requests" : "No longer receiving new requests",
            `${rev.name} ${enabled ? "is a Default Reviewer." : "was removed as a Default Reviewer."}`
          ),
        onError: (e: any) => {
          const msg = e?.response?.data?.message || e?.message || "";
          toast.error("Could not update routing", msg);
        },
      }
    );
  }

  function requestLoginChange(rev: PublicReviewer) {
    // If the reviewer is currently active (login enabled) and has active assigned requests,
    // prevent deactivation and display a modal asking the admin to reassign those requests first.
    if (rev.loginEnabled && (rev.activeRequests ?? 0) > 0) {
      setBlockedDeactivation(rev);
      return;
    }
    setConfirmLogin(rev);
  }

  function runLogin(rev: PublicReviewer, enabled: boolean) {
    setLogin.mutate(
      { id: rev.id, enabled },
      {
        onSuccess: () => toast.success(enabled ? "Account activated" : "Account deactivated", `${rev.name} is now ${enabled ? "active" : "inactive"}.`),
        onError: (e: any) => {
          const msg = e?.response?.data?.message || e?.message || "";
          toast.error("Could not update account", msg);
        },
      }
    );
  }

  function changePassword(rev: PublicReviewer) {
    setPasswordTarget({ kind: "reviewer", id: rev.id, name: rev.name, email: rev.email });
  }

  function resendInvite(rev: PublicReviewer) {
    resend.mutate(rev.id, {
      onSuccess: () => setResentTo({ name: rev.name, email: rev.email }),
      onError: (e: Error) => toast.error("Could not resend invitation", e.message),
    });
  }

  function sendReset(rev: PublicReviewer) {
    setResetTarget({ kind: "reviewer", id: rev.id, name: rev.name, email: rev.email });
  }

  const dialogs = (
    <>
      <ConfirmDialog
        open={!!confirmLogin}
        onOpenChange={(o) => !o && setConfirmLogin(null)}
        title={confirmLogin?.loginEnabled ? `Deactivate ${confirmLogin?.name}?` : `Activate ${confirmLogin?.name}?`}
        description={
          confirmLogin?.loginEnabled
            ? "The account becomes inactive: they can no longer sign in and stop receiving new requests. Assigned requests and history are preserved, and you can reactivate the account at any time."
            : "The reviewer will be able to sign in again and, if they're a Default Reviewer, resume receiving new requests."
        }
        confirmLabel={confirmLogin?.loginEnabled ? "Deactivate" : "Activate"}
        destructive={!!confirmLogin?.loginEnabled}
        loading={setLogin.isPending}
        onConfirm={() => {
          if (confirmLogin) runLogin(confirmLogin, !confirmLogin.loginEnabled);
          setConfirmLogin(null);
        }}
      />

      {/* Blocked deactivation warning modal when reviewer has active assigned requests */}
      <AlertDialog open={!!blockedDeactivation} onOpenChange={(o) => !o && setBlockedDeactivation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center text-center">
            <AlertDialogMedia className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-center">Cannot Deactivate Reviewer</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-center">
              <span>
                <strong>{blockedDeactivation?.name}</strong> currently has{" "}
                <strong>
                  {blockedDeactivation?.activeRequests} active request
                  {blockedDeactivation?.activeRequests === 1 ? "" : "s"}
                </strong>{" "}
                assigned.
              </span>
              <span className="block text-muted-foreground">
                Please reassign these requests to another reviewer before deactivating this account. Reviewers with active requests cannot be deactivated.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <Link
              href={`/assignments?search=${encodeURIComponent(blockedDeactivation?.name ?? "")}`}
              onClick={() => setBlockedDeactivation(null)}
              className={buttonVariants({ variant: "default" })}
            >
              Reassign Requests
            </Link>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SendResetDialog target={resetTarget} onOpenChange={(o) => !o && setResetTarget(null)} />
      <SetPasswordDialog target={passwordTarget} onOpenChange={(o) => !o && setPasswordTarget(null)} />
      <InvitationSentDialog target={resentTo} resent onOpenChange={(o) => !o && setResentTo(null)} />
    </>
  );

  return {
    toggleReceive,
    requestLoginChange,
    sendReset,
    changePassword,
    resendInvite,
    isLastDefault: () => false,
    pendingReceiveId: setReceive.isPending ? setReceive.variables?.id : undefined,
    pendingLoginId: setLogin.isPending ? setLogin.variables?.id : undefined,
    pendingResendId: resend.isPending ? resend.variables : undefined,
    routingLocked: setReceive.isPending || setLogin.isPending,
    dialogs,
  };
}
