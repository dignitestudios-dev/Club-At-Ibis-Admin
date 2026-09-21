"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, Clock, FileText, KeyRound, Mail, MapPin, Phone, Power, ScrollText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { StatCard } from "@/components/shared/stat-card";
import { SegmentedTabs } from "@/components/shared/pill-tabs";
import { useUrlParams } from "@/hooks/use-url-params";
import { RequestMiniTable } from "@/features/requests/components/request-mini-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResidentStatusChip } from "@/features/residents/components/resident-status-chip";
import { useToast } from "@/hooks/use-toast";
import { SendResetDialog } from "@/features/password-reset/components/send-reset-dialog";
import { useActivity, useRequests, useResidents, useReviewers, useSetResidentActive } from "@/hooks/use-admin-data";
import { IN_FLIGHT, residentFullName } from "@/lib/domain";
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";

export default function ResidentDetailPage({ id }: { id: string }) {
  const { data: residents, isLoading } = useResidents();
  const { data: requests } = useRequests();
  const { data: reviewers } = useReviewers();
  const { data: adminLog } = useActivity();
  const { values, set } = useUrlParams({ tab: "requests" });
  const tab: "requests" | "activity" = values.tab === "activity" ? "activity" : "requests";
  const [resetOpen, setResetOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const toast = useToast();
  const setActive = useSetResidentActive();

  const resident = residents?.find((r) => r.id === id);
  const mine = useMemo(() => (requests ?? []).filter((r) => r.residentId === id), [requests, id]);

  // One feed: request history events plus admin actions on this account
  // (password-reset links, activate / deactivate), newest first.
  const feed = useMemo(() => {
    const fromRequests = mine.flatMap((r) =>
      r.history.map((e) => ({
        id: e.id,
        at: e.createdAt,
        message: e.message,
        by: e.actor.name,
        role: e.actor.role === "resident" ? "Resident" : e.actor.role === "reviewer" ? "ARB Reviewer" : e.actor.role === "system" ? "System" : "Super Admin",
        request: { id: r.id, code: r.code } as { id: string; code: string } | undefined,
        kind: "request" as "request" | "account",
      }))
    );
    const fromAdmin = (adminLog ?? [])
      .filter((a) => a.target?.kind === "resident" && a.target.id === id)
      .map((a) => ({
        id: a.id,
        at: a.createdAt,
        message: a.message,
        by: a.actor.name,
        role: "Super Admin",
        request: undefined as { id: string; code: string } | undefined,
        kind: "account" as "request" | "account",
      }));
    return [...fromRequests, ...fromAdmin].sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [mine, adminLog, id]);

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
            <Button onClick={() => setResetOpen(true)} disabled={!resident.active}>
              <KeyRound className="size-4" />
              Send password reset
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total requests" value={mine.length} icon={FileText} accent="navy" />
        <StatCard label="In progress" value={mine.filter((r) => IN_FLIGHT.includes(r.status)).length} icon={Clock} accent="blue" />
        <StatCard label="Completed" value={mine.filter((r) => r.status === "completed").length} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Member since" value={format(new Date(resident.createdAt), "MMM yyyy")} icon={Users} accent="slate" hint={resident.lastLoginAt ? `Seen ${formatRelative(resident.lastLoginAt)}` : undefined} />
      </div>

      <SegmentedTabs
        label="Resident sections"
        value={tab}
        onChange={(v) => set({ tab: v })}
        options={[
          { value: "requests", label: "Requests", icon: FileText, count: mine.length },
          { value: "activity", label: "Activity", icon: ScrollText, count: feed.length },
        ]}
      />

      {tab === "requests" ? (
        <Card className="overflow-hidden shadow-2xs animate-in fade-in duration-300">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Requests</CardTitle>
            <p className="text-xs text-muted-foreground">Every request this resident has submitted, including archived categories.</p>
          </CardHeader>
          <CardContent className="p-0">
            <RequestMiniTable requests={mine} residents={residents ?? []} reviewers={reviewers} showReviewer showResident={false} empty="This resident has not submitted any requests." />
          </CardContent>
        </Card>
      ) : (
        <Card className="flex max-h-[34rem] flex-col overflow-hidden shadow-2xs animate-in fade-in duration-300">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Activity &amp; history</CardTitle>
            <p className="text-xs text-muted-foreground">
              Request events together with account actions (password-reset links, activation changes), newest first.
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 custom-scrollbar">
            {feed.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="divide-y divide-border/60">
                {feed.map((e) => (
                  <li key={e.id} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
                        e.kind === "account"
                          ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300"
                          : "border-primary/15 bg-primary/10 text-primary dark:text-amber-300"
                      }`}
                    >
                      {e.kind === "account" ? <KeyRound className="size-4" aria-hidden="true" /> : <ScrollText className="size-4" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm leading-relaxed text-foreground">
                        {e.request && (
                          <Link href={`/requests/${e.request.id}`} className="mr-1.5 font-mono text-xs font-semibold text-primary hover:underline dark:text-amber-300">
                            {e.request.code}
                          </Link>
                        )}
                        {e.message}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>
                          By <span className="font-semibold text-foreground">{e.by}</span>
                        </span>
                        <span className="rounded bg-muted px-1.5 py-px text-[10px] font-medium">{e.role}</span>
                        {e.kind === "account" && (
                          <span className="rounded-full bg-rose-50 px-2 py-px text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Account security</span>
                        )}
                      </p>
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted-foreground" dateTime={e.at} title={formatDateTime(e.at)}>
                      <span className="block">{formatRelative(e.at)}</span>
                      <span className="block text-[11px]">{formatDate(e.at)}</span>
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}

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

      <SendResetDialog
        target={resetOpen ? { kind: "resident", id: resident.id, name, email: resident.email } : null}
        onOpenChange={(o) => !o && setResetOpen(false)}
      />
    </div>
  );
}
