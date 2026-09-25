"use client";

import { useState } from "react";
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
