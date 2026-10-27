"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { openResidentAccess } from "@/features/auth/api/master-access";
import { useToast } from "@/hooks/use-toast";

/**
 * Why a resident's account can't be opened with admin access (null when it can). Only fully active accounts
 * qualify: inactive (disabled) and pending-verification accounts can't sign in, so there is nothing to access.
 */
export function accessBlockedReason(resident: { accountStatus?: string; active?: boolean }): string | null {
  const status = (resident.accountStatus || "").toUpperCase();
  if (status === "PENDING_EMAIL_VERIFICATION") return "This account is pending email verification";
  if (resident.active === false || status === "DISABLED") return "This account is inactive. Activate it first";
  if (status && status !== "ACTIVE") return "Only active accounts can be accessed";
  return null;
}

export interface AccessProfileTarget {
  id: string;
  name: string;
  email: string;
}

/**
 * Warning shown before an admin opens a resident's account in the Resident portal. Confirming opens the resident
 * interface (signed in as that resident for 15 minutes) in a new tab.
 */
export function AccessProfileDialog({
  target,
  onOpenChange,
}: {
  target: AccessProfileTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function confirm() {
    if (!target || loading) return;
    setLoading(true);
    // The tab is opened inside this click (see openResidentAccess), so pop-up blockers allow it.
    try {
      await openResidentAccess(target.email);
      toast.success("Opening the resident portal", `Signing in to ${target.name}'s account for 15 minutes. Changes are recorded as admin edits.`);
    } catch (e) {
      toast.error("Could not open the account", (e as Error).message);
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  }

  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(open) => {
        if (!loading) onOpenChange(open);
      }}
      title="Resident Account Access"
      description={`Only one resident account can be accessed at a time. Accessing another resident account will automatically end the current resident session.${target ? ` You are about to access ${target.name}'s account.` : ""}`}
      confirmLabel={loading ? "Opening…" : "Continue"}
      loading={loading}
      icon={
        <span className="flex size-full items-center justify-center rounded-[inherit] bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
      }
      onConfirm={confirm}
    />
  );
}
