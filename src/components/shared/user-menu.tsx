"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLogout } from "@/hooks/use-logout";

export function UserMenu() {
  const user = useCurrentUser();
  const { logout, isPending } = useLogout();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <Avatar className="size-8 ring-2 ring-brand-gold/60 ring-offset-1 ring-offset-card">
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="flex flex-col gap-0.5 px-2 py-1.5">
            <span className="text-sm font-medium text-foreground">
              {user.firstName} {user.lastName}
            </span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-brand-gold uppercase">
              <ShieldCheck className="size-3" />
              Super Admin
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/profile" />}>
            <UserIcon />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmingLogout(true)}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmingLogout}
        onOpenChange={(open) => {
          if (!isPending) setConfirmingLogout(open);
        }}
        title="Log out?"
        description="You'll need to sign in again to access the admin console."
        confirmLabel={isPending ? "Logging out..." : "Log Out"}
        loading={isPending}
        destructive
        onConfirm={async () => {
          await logout();
        }}
      />
    </>
  );
}
