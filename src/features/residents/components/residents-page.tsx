"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LockKeyhole, MoreHorizontal, Power, RotateCcw, UserCheck, UserX, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { SearchInput } from "@/components/shared/search-input";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResidentStatusChip } from "@/features/residents/components/resident-status-chip";
import { SetPasswordDialog } from "@/features/password-reset/components/set-password-dialog";
import { SendResetDialog, type ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useResidentsPage, useSetResidentActive } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { residentFullName } from "@/lib/domain";
import { formatDate, formatRelative } from "@/utils/format";

export default function ResidentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useUrlSearch("q");
  const { values, set } = useUrlParams({ page: "1", status: "all" });
  const [pageSize, setPageSize] = usePageSize();
  const page = Math.max(1, Number(values.page) || 1);
  const status = values.status || "all";

  // Genuinely server-paginated: page/limit/search/status go to the API as-is, so
  // what's requested always matches what's on screen.
  const { data: pageResult, isLoading } = useResidentsPage({
    page,
    limit: pageSize,
    search,
    status: status !== "all" ? status : undefined,
  });
  const visible = pageResult?.residents ?? [];
  const total = pageResult?.pagination.total ?? 0;

  // Stat counts provided directly in the API response metrics
  const metrics = pageResult?.metrics;
  const totalCount = metrics?.total ?? total;
  const activeCount = metrics ? metrics.active : (isLoading ? "—" : 0);
  const inactiveCount = metrics ? metrics.inactive : (isLoading ? "—" : 0);

  const hasFilters = status !== "all" || search.trim() !== "";

  const setActive = useSetResidentActive();
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [toggling, setToggling] = useState<Resident | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ResetTarget | null>(null);

  function confirmToggle() {
    if (!toggling) return;
    const target = toggling;
    const next = !target.active;
    setActive.mutate(
      { id: target.id, active: next },
      {
        onSuccess: () => {
          toast.success(next ? "Account activated" : "Account deactivated", `${residentFullName(target)} is now ${next ? "active" : "inactive"}.`);
          setToggling(null);
        },
        onError: (e: Error) => toast.error("Could not update account", e.message),
      }
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Resident Records"
        description="Search residents, send password-reset links, and activate or deactivate accounts."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Residents" value={totalCount} icon={Users} accent="navy" hint="All accounts" />
        <StatCard label="Active" value={activeCount} icon={UserCheck} accent="emerald" />
        <StatCard label="Inactive" value={inactiveCount} icon={UserX} accent="red" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            set({ page: "1" });
          }}
          placeholder="Search name, resident ID or email…"
          className="sm:max-w-md"
        />
        <FilterSelect
          label="Account Status"
          hideLabel
          value={status}
          onChange={(s) => set({ status: s, page: "1" })}
          options={[
            { label: "All Statuses", value: "all" },
            { label: "Active", value: "ACTIVE" },
            { label: "Pending Verification", value: "PENDING_EMAIL_VERIFICATION" },
            { label: "Inactive", value: "DISABLED" },
          ]}
          className="w-full sm:w-48"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              set({ status: "all", page: "1" });
            }}
            className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5"
          >
            <RotateCcw className="size-3.5 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Users} title="No Residents Found" description="Try a different name, resident ID or email." />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 max-w-[240px]">Resident</TableHead>
                  <TableHead className="max-w-[140px]">Resident ID</TableHead>
                  <TableHead className="max-w-[160px]">Joined</TableHead>
                  <TableHead className="max-w-[120px]">Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((res) => {
                  const name = residentFullName(res);
                  return (
                    <TableRow key={res.id} className={`cursor-pointer ${res.active ? "" : "opacity-70"}`} onClick={() => router.push(`/residents/${res.id}`)}>
                      <TableCell className="pl-4 max-w-[240px]">
                        <div className="flex items-center gap-3 min-w-0" title={`${name} (${res.email})`}>
                          <PersonAvatar name={name} className="size-9 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{res.email}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate" title={res.residentIdNumber}>{res.residentIdNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate" title={`Joined: ${formatDate(res.createdAt)}${res.lastLoginAt ? `, Seen: ${formatRelative(res.lastLoginAt)}` : ''}`}>
                        {formatDate(res.createdAt)}
                        {res.lastLoginAt && <span className="block text-[11px] truncate">Seen {formatRelative(res.lastLoginAt)}</span>}
                      </TableCell>
                      <TableCell className="max-w-[120px]">
                        <ResidentStatusChip active={res.active} />
                      </TableCell>
                      <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`} />}>
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem disabled={!res.active} onClick={() => setResetTarget({ kind: "resident", id: res.id, name, email: res.email })}>
                              <KeyRound />
                              Send Password Reset
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!res.active} onClick={() => setPasswordTarget({ kind: "resident", id: res.id, name, email: res.email })}>
                              <LockKeyhole />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant={res.active ? "destructive" : "default"} onClick={() => setToggling(res)}>
                              <Power />
                              {res.active ? "Deactivate Account" : "Activate Account"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => set({ page: String(p) })}
            onPageSizeChange={(n) => {
              setPageSize(n);
              set({ page: "1" });
            }}
          />
        </div>
      )}

      <SendResetDialog target={resetTarget} onOpenChange={(o) => !o && setResetTarget(null)} />
      <SetPasswordDialog target={passwordTarget} onOpenChange={(o) => !o && setPasswordTarget(null)} />
      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(o) => !o && setToggling(null)}
        title={toggling?.active ? `Deactivate ${toggling ? residentFullName(toggling) : ""}?` : `Activate ${toggling ? residentFullName(toggling) : ""}?`}
        description={
          toggling?.active
            ? "The account becomes inactive and the resident can no longer sign in. Their requests and history are preserved, and you can reactivate the account at any time."
            : "The resident will be able to sign in and submit requests again."
        }
        confirmLabel={toggling?.active ? "Deactivate" : "Activate"}
        destructive={!!toggling?.active}
        loading={setActive.isPending}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
