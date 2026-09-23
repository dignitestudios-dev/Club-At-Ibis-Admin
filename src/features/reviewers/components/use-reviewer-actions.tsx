"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SetPasswordDialog } from "@/features/password-reset/components/set-password-dialog";
import { InvitationSentDialog } from "@/features/reviewers/components/reviewer-form-sheet";
import { SendResetDialog, type ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useResendInvitation, useReviewers, useSetLoginEnabled, useSetReceiveNewRequests } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";

type Pending = { reviewer: PublicReviewer; kind: "receive" | "login" };

/**
 * Shared behaviour for reviewer rows and the reviewer detail page: routing
 * toggle (with the "keep at least one Default Reviewer" rule), login access,
 * password reset and the read-only "access as reviewer" view.
 */
export function useReviewerActions({ defaultReviewersCount }: { defaultReviewersCount?: number } = {}) {
  const toast = useToast();
  const [replace, setReplace] = useState<Pending | null>(null);
  const [replacementId, setReplacementId] = useState<string>("");
  const { data: reviewers, isLoading: isLoadingReviewers } = useReviewers(100, { enabled: !!replace });
  const setReceive = useSetReceiveNewRequests();
  const setLogin = useSetLoginEnabled();
  const resend = useResendInvitation();
  const [passwordTarget, setPasswordTarget] = useState<ResetTarget | null>(null);
  const [resentTo, setResentTo] = useState<{ name: string; email: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [confirmLogin, setConfirmLogin] = useState<PublicReviewer | null>(null);

  const list = reviewers ?? [];
  // A reviewer who's still "invited" hasn't set a password yet and genuinely
  // cannot sign in or act on anything — `loginEnabled` alone doesn't capture
  // that (it only tracks whether the account is administratively disabled).
  const canActNow = (r: PublicReviewer) => r.loginEnabled && r.inviteStatus === "active";
  const isLastDefault = (rev: PublicReviewer) => {
    if (!rev.receiveNewRequests) return false;
    if (typeof defaultReviewersCount === "number") {
      return defaultReviewersCount <= 1;
    }
    return canActNow(rev) && !list.some((r) => r.id !== rev.id && r.receiveNewRequests && canActNow(r));
  };
  const replacements = (rev: PublicReviewer) => list.filter((r) => r.id !== rev.id && canActNow(r) && !r.receiveNewRequests);

  const options = replace ? replacements(replace.reviewer) : [];

  useEffect(() => {
    if (replace && options.length > 0 && !replacementId) {
      setReplacementId(options[0].id);
    }
  }, [replace, options, replacementId]);

  function toggleReceive(rev: PublicReviewer, enabled: boolean) {
    if (!enabled && isLastDefault(rev)) {
      setReplace({ reviewer: rev, kind: "receive" });
      return;
    }
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
          if (msg.includes("LAST_DEFAULT") || msg.toLowerCase().includes("default reviewer")) {
            setReplace({ reviewer: rev, kind: "receive" });
          } else {
            toast.error("Could not update routing", msg);
          }
        },
      }
    );
  }

  function requestLoginChange(rev: PublicReviewer) {
    if (rev.loginEnabled && isLastDefault(rev)) {
      setReplace({ reviewer: rev, kind: "login" });
      return;
    }
    // Both directions get a confirmation — activating restores sign-in access
    // and (if a Default Reviewer) routing, which is just as worth a second
    // look as deactivating.
    setConfirmLogin(rev);
  }

  function runLogin(rev: PublicReviewer, enabled: boolean, replacement?: string) {
    setLogin.mutate(
      { id: rev.id, enabled, replacementId: replacement },
      {
        onSuccess: () => toast.success(enabled ? "Account activated" : "Account deactivated", `${rev.name} is now ${enabled ? "active" : "inactive"}.`),
        onError: (e: any) => {
          const msg = e?.response?.data?.message || e?.message || "";
          if (msg.includes("LAST_DEFAULT") || msg.toLowerCase().includes("default reviewer")) {
            setReplace({ reviewer: rev, kind: "login" });
          } else {
            toast.error("Could not update account", msg);
          }
        },
      }
    );
  }

  function confirmReplace() {
    if (!replace) return;
    const { reviewer, kind } = replace;
    if (kind === "receive") {
      setReceive.mutate(
        { id: reviewer.id, enabled: false, replacementId },
        {
          onSuccess: () => {
            toast.success("Default Reviewer changed", `${list.find((r) => r.id === replacementId)?.name || "Replacement reviewer"} now receives new requests.`);
            setReplace(null);
            setReplacementId("");
          },
          onError: (e: Error) => toast.error("Could not change default", e.message),
        }
      );
    } else {
      setLogin.mutate(
        { id: reviewer.id, enabled: false, replacementId },
        {
          onSuccess: () => {
            toast.success("Account deactivated", `${reviewer.name} was replaced as default by ${list.find((r) => r.id === replacementId)?.name || "replacement reviewer"}.`);
            setReplace(null);
            setReplacementId("");
          },
          onError: (e: Error) => toast.error("Could not deactivate", e.message),
        }
      );
    }
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
      <Dialog open={!!replace} onOpenChange={(o) => !o && setReplace(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-xl font-medium">Select a Replacement First</DialogTitle>
            <DialogDescription>
              {replace?.reviewer.name} is the only Default Reviewer. At least one must always receive new requests — choose who takes over.
            </DialogDescription>
          </DialogHeader>
          {isLoadingReviewers ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : options.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted/40 p-3.5 text-sm text-muted-foreground">
              No other reviewer with login access is available. Create or enable another reviewer first.
            </p>
          ) : (
            <RadioGroup value={replacementId} onValueChange={(v) => setReplacementId(String(v))} className="grid max-h-64 gap-2 overflow-y-auto">
              {options.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                    replacementId === r.id ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5" : "border-border hover:border-foreground/30"
                  )}
                >
                  <RadioGroupItem value={r.id} />
                  <PersonAvatar name={r.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.designation}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplace(null)}>
              Cancel
            </Button>
            <Button onClick={confirmReplace} disabled={!replacementId || options.length === 0 || setReceive.isPending || setLogin.isPending}>
              {(setReceive.isPending || setLogin.isPending) && <Spinner className="size-4" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    isLastDefault,
    pendingReceiveId: setReceive.isPending ? setReceive.variables?.id : undefined,
    pendingLoginId: setLogin.isPending ? setLogin.variables?.id : undefined,
    pendingResendId: resend.isPending ? resend.variables : undefined,
    // While one reviewer's routing/login state is being changed, the "at
    // least one Default Reviewer" check (`list` above) is based on data that
    // may be about to go stale — so no *other* reviewer's routing/login
    // toggle should be actionable until this one settles.
    routingLocked: setReceive.isPending || setLogin.isPending,
    dialogs,
  };
}
