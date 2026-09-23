"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Power,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
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
import { type ResidentActivityEntry } from "@/features/residents/api/residents.service";
import { residentFullName } from "@/lib/domain";
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

function getActivityMeta(activity: ResidentActivityEntry) {
  const event = activity.eventType?.toLowerCase() || "";
  const cat = activity.category?.toLowerCase() || "";

  if (event.includes("password") || cat === "security") {
    return {
      icon: KeyRound,
      iconCls: "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
      badgeCls: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    };
  }
  if (event.includes("email") || event.includes("verification")) {
    return {
      icon: Mail,
      iconCls: "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
      badgeCls: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    };
  }
  if (event.includes("registered") || cat === "account") {
    return {
      icon: UserCheck,
      iconCls: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
      badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  return {
    icon: ScrollText,
    iconCls: "border-primary/15 bg-primary/10 text-primary dark:text-amber-300",
    badgeCls: "bg-primary/10 text-primary border-primary/20 dark:text-amber-300 dark:border-amber-400/30",
  };
}

function formatRole(role?: string) {
  if (!role) return "";
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "REVIEWER") return "Reviewer";
  if (role === "RESIDENT") return "Resident";
  return role;
}

export default function ResidentDetailPage({ id }: { id: string }) {
  const { data, isLoading } = useResident(id);
  const [resetOpen, setResetOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const toast = useToast();
  const setActive = useSetResidentActive();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-1" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const resident = data?.resident;
  const activities = data?.activities ?? [];

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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="shadow-2xs lg:col-span-1">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 text-sm">
            <dl className="space-y-3">
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Resident ID</dt>
                <dd className="font-mono text-sm font-medium text-foreground">{resident.residentIdNumber || "—"}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Login Email</dt>
                <dd className="flex items-center gap-1.5 break-all">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  {resident.email}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Account Status</dt>
                <dd className="pt-0.5">
                  <ResidentStatusChip active={resident.active} />
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Created</dt>
                <dd>{formatDate(resident.createdAt)}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Last Sign-In</dt>
                <dd>{resident.lastLoginAt ? formatDateTime(resident.lastLoginAt) : "Not signed in yet"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="flex max-h-[26rem] flex-col overflow-hidden shadow-2xs lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Account Activity</CardTitle>
            <p className="text-xs text-muted-foreground">The most recent activity and security events recorded for this resident.</p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 custom-scrollbar">
            {activities.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ol className="divide-y divide-border/60">
                {activities.map((a, i) => {
                  const meta = getActivityMeta(a);
                  const Icon = meta.icon;
                  const roleLabel = formatRole(a.actorRole);
                  return (
                    <li key={a.id} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105", meta.iconCls)}>
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm leading-relaxed text-foreground">{a.message}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span>
                            By <span className="font-semibold text-foreground">{a.actorName}</span>
                            {roleLabel && <span className="text-muted-foreground/80"> ({roleLabel})</span>}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{a.category.toLowerCase()}</span>
                          {i === 0 && (
                            <span className="rounded-full bg-primary/10 px-2 py-px text-[10px] font-bold tracking-wider text-primary uppercase dark:text-amber-300">
                              Latest
                            </span>
                          )}
                        </p>
                      </div>
                      <time className="shrink-0 text-right text-xs text-muted-foreground" dateTime={a.occurredAt} title={formatDateTime(a.occurredAt)}>
                        <span className="block">{formatRelative(a.occurredAt)}</span>
                        <span className="block text-[11px]">{formatDate(a.occurredAt)}</span>
                      </time>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Submitted Requests</CardTitle>
          <p className="text-xs text-muted-foreground">All architectural review submissions from this resident.</p>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="Not Available Yet"
            description="Requests aren't wired up to a backend yet, so this resident's requests can't be shown here."
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
