"use client";

import { useState } from "react";
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
import { SendResetDialog, type ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useReviewers, useSetLoginEnabled, useSetReceiveNewRequests } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/utils/cn";

type Pending = { reviewer: PublicReviewer; kind: "receive" | "login" };

/**
 * Shared behaviour for reviewer rows and the reviewer detail page: routing
 * toggle (with the "keep at least one Default Reviewer" rule), login access,
 * password reset and the read-only "access as reviewer" view.
 */
export function useReviewerActions() {
  const toast = useToast();
  const { data: reviewers } = useReviewers();
  const setReceive = useSetReceiveNewRequests();
  const setLogin = useSetLoginEnabled();

  const [replace, setReplace] = useState<Pending | null>(null);
  const [replacementId, setReplacementId] = useState<string>("");
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [confirmLogin, setConfirmLogin] = useState<PublicReviewer | null>(null);

  const list = reviewers ?? [];
  const isLastDefault = (rev: PublicReviewer) =>
    rev.receiveNewRequests && rev.loginEnabled && !list.some((r) => r.id !== rev.id && r.receiveNewRequests && r.loginEnabled);
  const replacements = (rev: PublicReviewer) => list.filter((r) => r.id !== rev.id && r.loginEnabled && !r.receiveNewRequests);

  function toggleReceive(rev: PublicReviewer, enabled: boolean) {
    if (!enabled && isLastDefault(rev)) {
      setReplacementId(replacements(rev)[0]?.id ?? "");
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
        onError: (e: Error) => toast.error("Could not update routing", e.message),
      }
    );
  }

  function requestLoginChange(rev: PublicReviewer) {
    if (rev.loginEnabled && isLastDefault(rev)) {
      setReplacementId(replacements(rev)[0]?.id ?? "");
      setReplace({ reviewer: rev, kind: "login" });
      return;
    }
    if (rev.loginEnabled) {
      setConfirmLogin(rev);
      return;
    }
    runLogin(rev, true);
  }

  function runLogin(rev: PublicReviewer, enabled: boolean, replacement?: string) {
    setLogin.mutate(
      { id: rev.id, enabled, replacementId: replacement },
      {
        onSuccess: () => toast.success(enabled ? "Account activated" : "Account deactivated", `${rev.name} is now ${enabled ? "active" : "inactive"}.`),
        onError: (e: Error) => toast.error("Could not update account", e.message),
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
            toast.success("Default reviewer changed", `${list.find((r) => r.id === replacementId)?.name} now receives new requests.`);
            setReplace(null);
          },
          onError: (e: Error) => toast.error("Could not change default", e.message),
        }
      );
    } else {
      setLogin.mutate(
        { id: reviewer.id, enabled: false, replacementId },
        {
          onSuccess: () => {
            toast.success("Account deactivated", `${reviewer.name} was replaced as default by ${list.find((r) => r.id === replacementId)?.name}.`);
            setReplace(null);
          },
          onError: (e: Error) => toast.error("Could not deactivate", e.message),
        }
      );
    }
  }

  function sendReset(rev: PublicReviewer) {
    setResetTarget({ kind: "reviewer", id: rev.id, name: rev.name, email: rev.email });
  }

  const options = replace ? replacements(replace.reviewer) : [];

  const dialogs = (
    <>
      <Dialog open={!!replace} onOpenChange={(o) => !o && setReplace(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-xl font-medium">Select a replacement first</DialogTitle>
            <DialogDescription>
              {replace?.reviewer.name} is the only Default Reviewer. At least one must always receive new requests — choose who takes over.
            </DialogDescription>
          </DialogHeader>
          {options.length === 0 ? (
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
              Confirm change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmLogin}
        onOpenChange={(o) => !o && setConfirmLogin(null)}
        title={`Deactivate ${confirmLogin?.name}?`}
        description="The account becomes inactive: they can no longer sign in and stop receiving new requests. Assigned requests and history are preserved, and you can reactivate the account at any time."
        confirmLabel="Deactivate"
        destructive
        onConfirm={() => {
          if (confirmLogin) runLogin(confirmLogin, false);
          setConfirmLogin(null);
        }}
      />

      <SendResetDialog target={resetTarget} onOpenChange={(o) => !o && setResetTarget(null)} />
    </>
  );

  return {
    toggleReceive,
    requestLoginChange,
    sendReset,
    isLastDefault,
    pendingReceiveId: setReceive.isPending ? setReceive.variables?.id : undefined,
    dialogs,
  };
}
