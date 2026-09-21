"use client";

import Link from "next/link";
import { KeyRound, LockKeyhole, MailPlus, MoreHorizontal, Pencil, Power, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ReviewerRowMenu({
  reviewer,
  onEdit,
  onReset,
  onChangePassword,
  onResendInvite,
  onToggleLogin,
  showDetails = true,
}: {
  reviewer: PublicReviewer;
  onEdit: () => void;
  onReset: () => void;
  onChangePassword: () => void;
  onResendInvite: () => void;
  onToggleLogin: () => void;
  showDetails?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${reviewer.name}`} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {showDetails && (
          <DropdownMenuItem render={<Link href={`/reviewers/${reviewer.id}`} />}>
            <UserCog />
            View details &amp; workload
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Edit account details
        </DropdownMenuItem>
        {reviewer.inviteStatus === "invited" ? (
          <DropdownMenuItem onClick={onResendInvite} disabled={!reviewer.loginEnabled}>
            <MailPlus />
            Resend invitation
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={onReset} disabled={!reviewer.loginEnabled}>
              <KeyRound />
              Send password reset
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangePassword} disabled={!reviewer.loginEnabled}>
              <LockKeyhole />
              Change password
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant={reviewer.loginEnabled ? "destructive" : "default"} onClick={onToggleLogin}>
          <Power />
          {reviewer.loginEnabled ? "Deactivate account" : "Activate account"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReviewerStatusChip({ reviewer }: { reviewer: PublicReviewer }) {
  if (!reviewer.loginEnabled) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
        <span className="size-1.5 rounded-full bg-rose-500" />
        Inactive
      </span>
    );
  }
  if (reviewer.inviteStatus === "invited") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
        Invite pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  );
}
