"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, KeyRound, Mail, Pencil, Route, ScrollText, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { StatCard } from "@/components/shared/stat-card";
import { ReviewerFormSheet } from "@/features/reviewers/components/reviewer-form-sheet";
import { ReviewerRowMenu, ReviewerStatusChip } from "@/features/reviewers/components/reviewer-row-menu";
import { useReviewerActions } from "@/features/reviewers/components/use-reviewer-actions";
import { RequestMiniTable } from "@/features/requests/components/request-mini-table";
import { useActivity, useRequests, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { IN_FLIGHT } from "@/lib/domain";
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";

export default function ReviewerDetailPage({ id }: { id: string }) {
  const { data: reviewers, isLoading } = useReviewers();
  const { data: requests } = useRequests();
  const { data: residents } = useResidents();
  const { data: activity } = useActivity();
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

  const reviewer = reviewers?.find((r) => r.id === id);
  if (!reviewer) {
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

  const mine = (requests ?? []).filter((r) => r.assignedReviewerId === reviewer.id);
  const active = mine.filter((r) => IN_FLIGHT.includes(r.status));
  const completed = mine.filter((r) => r.status === "completed").length;
  const intake = (requests ?? []).filter((r) => r.status === "submitted" && !r.assignedReviewerId).length;
  const log = (activity ?? []).filter((a) => a.target?.id === reviewer.id).slice(0, 40);

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
                {reviewer.designation} · <span className="font-mono text-xs">{reviewer.employeeNumber}</span>
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
            <Button onClick={() => actions.sendReset(reviewer)} disabled={!reviewer.loginEnabled}>
              <KeyRound className="size-4" />
              Send password reset
            </Button>
            <ReviewerRowMenu
              reviewer={reviewer}
              showDetails={false}
              onEdit={() => setEditing(true)}
              onReset={() => actions.sendReset(reviewer)}
              onToggleLogin={() => actions.requestLoginChange(reviewer)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active requests" value={active.length} icon={Clock} accent="blue" hint="Currently assigned" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} accent="emerald" hint="Closed out" />
        <StatCard label="Total handled" value={mine.length} icon={UserCog} accent="navy" hint="All time" />
        <StatCard
          label="Incoming list"
          value={reviewer.receiveNewRequests ? intake : "—"}
          icon={Route}
          accent="gold"
          hint={reviewer.receiveNewRequests ? "Awaiting take / assign" : "Not a default reviewer"}
        />
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
              <Switch
                checked={reviewer.receiveNewRequests}
                disabled={!reviewer.loginEnabled}
                onCheckedChange={(v) => actions.toggleReceive(reviewer, v)}
                aria-label="Receive New Requests"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex max-h-[26rem] flex-col overflow-hidden shadow-2xs lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Account activity</CardTitle>
            <p className="text-xs text-muted-foreground">Administrative changes recorded for this reviewer, newest first.</p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 custom-scrollbar">
            {log.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No administrative activity recorded yet.</p>
            ) : (
              <ol className="divide-y divide-border/60">
                {log.map((a, i) => (
                  <li key={a.id} className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary transition-transform group-hover:scale-105 dark:text-amber-300">
                      <ScrollText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm leading-relaxed text-foreground">{a.message}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>
                          By <span className="font-semibold text-foreground">{a.actor.name}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{a.category}</span>
                        {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-px text-[10px] font-bold tracking-wider text-primary uppercase dark:text-amber-300">Latest</span>}
                      </p>
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted-foreground" dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
                      <span className="block">{formatRelative(a.createdAt)}</span>
                      <span className="block text-[11px]">{formatDate(a.createdAt)}</span>
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
          <CardTitle className="font-heading text-lg font-medium">Assigned requests</CardTitle>
          <p className="text-xs text-muted-foreground">Everything this reviewer currently owns or previously handled.</p>
        </CardHeader>
        <CardContent className="p-0">
          <RequestMiniTable requests={mine} residents={residents ?? []} empty="No requests assigned to this reviewer yet." />
        </CardContent>
      </Card>

      <ReviewerFormSheet open={editing} onOpenChange={setEditing} reviewer={reviewer} />
      {actions.dialogs}
    </div>
  );
}
