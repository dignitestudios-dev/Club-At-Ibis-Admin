"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Clock, FileText, KeyRound, LockKeyhole, Mail, MapPin, Phone, Power, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { StatCard } from "@/components/shared/stat-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResidentStatusChip } from "@/features/residents/components/resident-status-chip";
import { useToast } from "@/hooks/use-toast";
import { SetPasswordDialog } from "@/features/password-reset/components/set-password-dialog";
import { SendResetDialog } from "@/features/password-reset/components/send-reset-dialog";
import { useResident, useSetResidentActive } from "@/hooks/use-admin-data";
import { residentFullName } from "@/lib/domain";
import { formatRelative } from "@/utils/format";

export default function ResidentDetailPage({ id }: { id: string }) {
  const { data: resident, isLoading } = useResident(id);
  const [resetOpen, setResetOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const toast = useToast();
  const setActive = useSetResidentActive();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (!resident) {
    return (
      <EmptyState
        icon={Users}
        title="Resident not found"
        action={
          <Button nativeButton={false} render={<Link href="/residents" />}>
            Back to residents
          </Button>
        }
      />
    );
  }

  const name = residentFullName(resident);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/residents" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All residents
      </Link>

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary to-slate-700 dark:from-amber-400 dark:to-amber-600" />
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <PersonAvatar name={name} className="size-16" fallbackClassName="text-xl" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-heading text-2xl font-medium text-foreground sm:text-3xl">{name}</h1>
                <ResidentStatusChip active={resident.active} />
              </div>
              <p className="font-mono text-xs text-muted-foreground">{resident.residentIdNumber}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{resident.email}</span>
                {resident.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{resident.phone}</span>}
                {resident.address && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{resident.address} · {resident.lotNo}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setToggleOpen(true)}>
              <Power className="size-4" />
              {resident.active ? "Deactivate account" : "Activate account"}
            </Button>
            <Button variant="outline" onClick={() => setResetOpen(true)} disabled={!resident.active}>
              <KeyRound className="size-4" />
              Send reset link
            </Button>
            <Button onClick={() => setPasswordOpen(true)} disabled={!resident.active}>
              <LockKeyhole className="size-4" />
              Change password
            </Button>
          </div>
        </div>
      </div>

      {/* Requests aren't wired up to a backend yet, so these are placeholders, not FE-computed numbers. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total requests" value="N/A" icon={FileText} accent="navy" />
        <StatCard label="In progress" value="N/A" icon={Clock} accent="blue" />
        <StatCard label="Completed" value="N/A" icon={CheckCircle2} accent="emerald" />
        <StatCard label="Member since" value={format(new Date(resident.createdAt), "MMM yyyy")} icon={Users} accent="slate" hint={resident.lastLoginAt ? `Seen ${formatRelative(resident.lastLoginAt)}` : undefined} />
      </div>

      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Requests &amp; activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="Not available yet"
            description="Requests and this resident's activity history aren't wired up to a backend yet, so they can't be shown here."
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        title={resident.active ? `Deactivate ${name}?` : `Activate ${name}?`}
        description={
          resident.active
            ? "The account becomes inactive and the resident can no longer sign in. Their requests and history are preserved, and you can reactivate the account at any time."
            : "The resident will be able to sign in and submit requests again."
        }
        confirmLabel={resident.active ? "Deactivate" : "Activate"}
        destructive={resident.active}
        loading={setActive.isPending}
        onConfirm={() =>
          setActive.mutate(
            { id: resident.id, active: !resident.active },
            {
              onSuccess: () => {
                toast.success(resident.active ? "Account deactivated" : "Account activated", `${name} is now ${resident.active ? "inactive" : "active"}.`);
                setToggleOpen(false);
              },
            }
          )
        }
      />

      <SetPasswordDialog
        target={passwordOpen ? { kind: "resident", id: resident.id, name, email: resident.email } : null}
        onOpenChange={(o) => !o && setPasswordOpen(false)}
      />

      <SendResetDialog
        target={resetOpen ? { kind: "resident", id: resident.id, name, email: resident.email } : null}
        onOpenChange={(o) => !o && setResetOpen(false)}
      />
    </div>
  );
}
