"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole, Mail, Search, Send, ShieldCheck, UserCog, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { SegmentedTabs } from "@/components/shared/pill-tabs";
import { Pagination } from "@/components/shared/pagination";
import { usePageSize } from "@/hooks/use-page-size";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SetPasswordDialog } from "@/features/password-reset/components/set-password-dialog";
import { SendResetDialog, type ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useResets, useResidents, useReviewers } from "@/hooks/use-admin-data";
import { residentFullName } from "@/lib/domain";
import { formatDateTime, formatRelative } from "@/utils/format";
import { cn } from "@/utils/cn";

const STEPS = [
  { icon: Search, title: "Select", body: "Pick a resident or reviewer." },
  { icon: Send, title: "Send link", body: "A secure reset link is emailed." },
  { icon: KeyRound, title: "User sets password", body: "They choose their own new password." },
  { icon: ShieldCheck, title: "Recorded", body: "Initiation is added to activity history." },
];

function resetChip(r: PasswordResetRecord) {
  const expired = r.status === "sent" && Date.now() - new Date(r.createdAt).getTime() > 24 * 60 * 60 * 1000;
  if (r.status === "completed")
    return { label: "Password updated", cls: "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" };
  if (expired) return { label: "Link expired", cls: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" };
  return { label: "Link sent", cls: "border-sky-300/80 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300" };
}

export default function PasswordResetPage() {
  const { data: residents } = useResidents();
  const { data: reviewers } = useReviewers();
  const { data: resets } = useResets();

  const [kind, setKind] = useState<"resident" | "reviewer">("resident");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ResetTarget | null>(null);
  const [dialogTarget, setDialogTarget] = useState<ResetTarget | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ResetTarget | null>(null);
  const [pageSize, setPageSize] = usePageSize();
  const [histPage, setHistPage] = useState(1);
  const historyPages = Math.max(1, Math.ceil((resets ?? []).length / pageSize));
  const safeHistPage = Math.min(histPage, historyPages);
  const historyRows = (resets ?? []).slice((safeHistPage - 1) * pageSize, safeHistPage * pageSize);

  const candidates = useMemo<ResetTarget[]>(() => {
    const q = search.trim().toLowerCase();
    const list: ResetTarget[] =
      kind === "resident"
        ? (residents ?? []).filter((r) => r.active).map((r) => ({ kind: "resident", id: r.id, name: residentFullName(r), email: r.email }))
        : (reviewers ?? []).filter((r) => r.loginEnabled).map((r) => ({ kind: "reviewer", id: r.id, name: r.name, email: r.email }));
    return list.filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q)).slice(0, 7);
  }, [kind, search, residents, reviewers]);

  const invitePending = selected?.kind === "reviewer" && reviewers?.find((r) => r.id === selected.id)?.inviteStatus === "invited";

  const meta = (id: string) =>
    kind === "resident" ? residents?.find((r) => r.id === id)?.residentIdNumber : reviewers?.find((r) => r.id === id)?.employeeNumber;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Password Reset & Change"
        description="Email a password-reset link so the user chooses a new password, or set a new password for an active account directly."
      />

      {/* Flow strip */}
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.title} className="flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-amber-300">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[10px] font-semibold tracking-wider text-brand-gold uppercase">Step {i + 1}</span>
                <span className="block text-sm font-semibold text-foreground">{s.title}</span>
                <span className="block text-xs text-muted-foreground">{s.body}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Selector */}
        <Card className="shadow-2xs lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Select an Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <SegmentedTabs
              label="Account type"
              value={kind}
              onChange={(v) => {
                setKind(v);
                setSelected(null);
              }}
              options={[
                { value: "resident", label: "Resident", icon: Users },
                { value: "reviewer", label: "Reviewer", icon: UserCog },
              ]}
              className="w-full [&>button]:flex-1 [&>button]:justify-center"
            />

            <SearchInput value={search} onChange={setSearch} placeholder={`Search ${kind}s…`} />

            <ul className="space-y-1.5" role="listbox" aria-label={`${kind} results`}>
              {candidates.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No matches.</li>}
              {candidates.map((c) => {
                const isSel = selected?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => setSelected(c)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                        isSel ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5" : "border-border hover:border-foreground/30"
                      )}
                    >
                      <PersonAvatar name={c.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{meta(c.id)} · {c.email}</span>
                      </span>
                      {isSel && <CheckCircle2 className="size-4 shrink-0 text-primary dark:text-amber-300" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button disabled={!selected} onClick={() => setDialogTarget(selected)}>
                <Mail className="size-4" />
                Send Reset Link
              </Button>
              <Button variant="outline" disabled={!selected || invitePending} onClick={() => setPasswordTarget(selected)}>
                <LockKeyhole className="size-4" />
                Set New Password
              </Button>
            </div>
            {invitePending && <p className="text-xs text-muted-foreground">This reviewer hasn&apos;t accepted their invitation yet, so a password can&apos;t be set.</p>}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="overflow-hidden shadow-2xs lg:col-span-3">
          <CardHeader className="border-b border-border/70 pb-3">
            <CardTitle className="font-heading text-lg font-medium">Reset History</CardTitle>
            <p className="text-xs text-muted-foreground">Every reset initiation, who started it, and where it stands.</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Account</TableHead>
                  <TableHead>Initiated by</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((r) => {
                  const chip = resetChip(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <PersonAvatar name={r.userName} className="size-8" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{r.userName}</span>
                            <span className="block truncate text-[11px] text-muted-foreground"><span className="capitalize">{r.userKind}</span> · {r.email}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.initiatedBy}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap text-muted-foreground" title={formatDateTime(r.createdAt)}>
                        {formatRelative(r.createdAt)}
                      </TableCell>
                      <TableCell className="pr-4">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", chip.cls)}>{chip.label}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(resets ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No resets initiated yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="border-t border-border/70 px-4 py-3">
              <Pagination
                page={safeHistPage}
                pageSize={pageSize}
                total={(resets ?? []).length}
                onPageChange={setHistPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setHistPage(1);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <SetPasswordDialog
        target={passwordTarget}
        onOpenChange={(o) => {
          if (!o) {
            setPasswordTarget(null);
            setSelected(null);
          }
        }}
      />

      <SendResetDialog
        target={dialogTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDialogTarget(null);
            setSelected(null);
          }
        }}
      />
    </div>
  );
}
