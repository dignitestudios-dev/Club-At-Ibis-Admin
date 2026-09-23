"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, KeyRound, LockKeyhole, Mail, MailPlus, Pencil, Route, ScrollText, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { StatCard } from "@/components/shared/stat-card";
import { ReviewerFormSheet } from "@/features/reviewers/components/reviewer-form-sheet";
import { ReviewerRowMenu, ReviewerStatusChip } from "@/features/reviewers/components/reviewer-row-menu";
import { useReviewerActions } from "@/features/reviewers/components/use-reviewer-actions";
import { useReviewer } from "@/hooks/use-admin-data";
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";

export default function ReviewerDetailPage({ id }: { id: string }) {
  const { data, isLoading } = useReviewer(id);
  const actions = useReviewerActions();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={UserCog}
        title="Reviewer not found"
        description="This reviewer account doesn't exist."
        action={
          <Button nativeButton={false} render={<Link href="/reviewers" />}>
            Back to reviewers
          </Button>
        }
      />
    );
  }

  const { reviewer, activities } = data;
  const receivePending = actions.pendingReceiveId === reviewer.id;
  const resendPending = actions.pendingResendId === reviewer.id;
  const loginPending = actions.pendingLoginId === reviewer.id;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/reviewers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All reviewers
      </Link>

      {/* Profile header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-2xs sm:p-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-gold to-amber-600" />
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <PersonAvatar name={reviewer.name} className="size-16" fallbackClassName="text-xl" />
            <div className="space-y-1.5">
              <h1 className="font-heading text-2xl font-medium text-foreground sm:text-3xl">{reviewer.name}</h1>
              <p className="text-sm text-muted-foreground">
                {reviewer.designation || "—"} · <span className="font-mono text-xs">{reviewer.employeeNumber}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ReviewerStatusChip reviewer={reviewer} />
                {reviewer.receiveNewRequests && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-brand-gold uppercase">
                    <Route className="size-3" aria-hidden="true" />
                    Default reviewer
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reviewer.inviteStatus === "invited" ? (
              <Button onClick={() => actions.resendInvite(reviewer)} disabled={!reviewer.loginEnabled || resendPending}>
                {resendPending ? <Spinner className="size-4" /> : <MailPlus className="size-4" />}
                Resend invitation
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => actions.sendReset(reviewer)} disabled={!reviewer.loginEnabled}>
                  <KeyRound className="size-4" />
                  Send reset link
                </Button>
                <Button onClick={() => actions.changePassword(reviewer)} disabled={!reviewer.loginEnabled}>
                  <LockKeyhole className="size-4" />
                  Change password
                </Button>
              </>
            )}
            <ReviewerRowMenu
              reviewer={reviewer}
              showDetails={false}
              onEdit={() => setEditing(true)}
              onReset={() => actions.sendReset(reviewer)}
              onChangePassword={() => actions.changePassword(reviewer)}
              onResendInvite={() => actions.resendInvite(reviewer)}
              onToggleLogin={() => actions.requestLoginChange(reviewer)}
              resendPending={resendPending}
              loginPending={loginPending}
            />
          </div>
        </div>
      </div>

      {/* Requests aren't wired up to a backend yet, so these are placeholders, not FE-computed numbers. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active requests" value="N/A" icon={Clock} accent="blue" />
        <StatCard label="Completed" value="N/A" icon={CheckCircle2} accent="emerald" />
        <StatCard label="Total Handled" value="N/A" icon={UserCog} accent="navy" />
        <StatCard label="Incoming List" value="N/A" icon={Route} accent="gold" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="shadow-2xs lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Account</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 text-sm">
            <dl className="space-y-3">
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Login email</dt>
                <dd className="flex items-center gap-1.5 break-all"><Mail className="size-3.5 shrink-0 text-muted-foreground" />{reviewer.email}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Created</dt>
                <dd>{formatDate(reviewer.createdAt)}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Last sign-in</dt>
                <dd>{reviewer.lastLoginAt ? formatDateTime(reviewer.lastLoginAt) : "Not signed in yet"}</dd>
              </div>
            </dl>
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
              <div>
                <p className="text-sm font-semibold text-foreground">Receive New Requests</p>
                <p className="text-xs text-muted-foreground">Default reviewers get new submissions and can reassign.</p>
              </div>
              <div className="flex items-center gap-2">
                {receivePending && <Spinner className="size-3.5 text-muted-foreground" />}
                <Switch
                  checked={reviewer.receiveNewRequests}
                  disabled={!reviewer.loginEnabled || receivePending}
                  onCheckedChange={(v) => actions.toggleReceive(reviewer, v)}
                  aria-label="Receive New Requests"
                  className={receivePending ? "opacity-60" : ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex max-h-[26rem] flex-col overflow-hidden shadow-2xs lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Account Activity</CardTitle>
            <p className="text-xs text-muted-foreground">The most recent administrative changes recorded for this reviewer.</p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 custom-scrollbar">
            {activities.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No administrative activity recorded yet.</p>
            ) : (
              <ol className="divide-y divide-border/60">
                {activities.map((a, i) => (
                  <li key={a.id} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-transform group-hover:scale-105 dark:text-amber-300">
                      <ScrollText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm leading-relaxed text-foreground">{a.message}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>
                          By <span className="font-semibold text-foreground">{a.actorName}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{a.category.toLowerCase()}</span>
                        {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-px text-[10px] font-bold tracking-wider text-primary uppercase dark:text-amber-300">Latest</span>}
                      </p>
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted-foreground" dateTime={a.occurredAt} title={formatDateTime(a.occurredAt)}>
                      <span className="block">{formatRelative(a.occurredAt)}</span>
                      <span className="block text-[11px]">{formatDate(a.occurredAt)}</span>
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Assigned Requests</CardTitle>
          <p className="text-xs text-muted-foreground">Everything this reviewer currently owns or previously handled.</p>
        </CardHeader>
        <CardContent>
          <EmptyState icon={CheckCircle2} title="Not Available Yet" description="Requests aren't wired up to a backend yet, so this reviewer's assigned requests can't be shown here." />
        </CardContent>
      </Card>

      <ReviewerFormSheet open={editing} onOpenChange={setEditing} reviewer={reviewer} />
      {actions.dialogs}
    </div>
  );
}
