"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LockKeyhole, MoreHorizontal, Power, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResidentStatusChip } from "@/features/residents/components/resident-status-chip";
import { SetPasswordDialog } from "@/features/password-reset/components/set-password-dialog";
import { SendResetDialog, type ResetTarget } from "@/features/password-reset/components/send-reset-dialog";
import { useRequests, useResidents, useSetResidentActive } from "@/hooks/use-admin-data";
import { usePageSize } from "@/hooks/use-page-size";
import { useToast } from "@/hooks/use-toast";
import { useUrlParams, useUrlSearch } from "@/hooks/use-url-params";
import { IN_FLIGHT, residentFullName } from "@/lib/domain";
import { formatDate, formatRelative } from "@/utils/format";

export default function ResidentsPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: residents, isLoading } = useResidents();
  const { data: requests } = useRequests();
  const setActive = useSetResidentActive();
  const [search, setSearch] = useUrlSearch("q");
  const { values, set } = useUrlParams({ page: "1" });
  const [pageSize, setPageSize] = usePageSize();
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
  const [toggling, setToggling] = useState<Resident | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ResetTarget | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>();
    (requests ?? []).forEach((r) => {
      const s = map.get(r.residentId) ?? { total: 0, active: 0 };
      s.total += 1;
      if (IN_FLIGHT.includes(r.status)) s.active += 1;
      map.set(r.residentId, s);
    });
    return map;
  }, [requests]);

  const q = search.trim().toLowerCase();
  const filtered = (residents ?? []).filter(
    (r) => !q || `${residentFullName(r)} ${r.residentIdNumber} ${r.email} ${r.address} ${r.lotNo}`.toLowerCase().includes(q)
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number(values.page) || 1), pages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

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
        description="Search residents, review their requests and history, send password-reset links, and activate or deactivate accounts."
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search name, resident ID, email, address or lot…" className="sm:max-w-md" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No residents found" description="Try a different name, resident ID or address." />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Resident</TableHead>
                  <TableHead>Resident ID</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((res) => {
                  const s = stats.get(res.id) ?? { total: 0, active: 0 };
                  const name = residentFullName(res);
                  return (
                    <TableRow key={res.id} className={`cursor-pointer ${res.active ? "" : "opacity-70"}`} onClick={() => router.push(`/residents/${res.id}`)}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-3">
                          <PersonAvatar name={name} className="size-9" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{res.email}</span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{res.residentIdNumber}</TableCell>
                      <TableCell>
                        <span className="block max-w-[200px] truncate text-sm">{res.address}</span>
                        <span className="text-[11px] text-muted-foreground">{res.lotNo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold tabular-nums">{s.total}</span>
                        {s.active > 0 && <span className="ml-1.5 text-[11px] text-sky-700 dark:text-sky-300">{s.active} in progress</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(res.createdAt)}
                        {res.lastLoginAt && <span className="block text-[11px]">Seen {formatRelative(res.lastLoginAt)}</span>}
                      </TableCell>
                      <TableCell>
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
                              Send password reset
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!res.active} onClick={() => setPasswordTarget({ kind: "resident", id: res.id, name, email: res.email })}>
                              <LockKeyhole />
                              Change password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant={res.active ? "destructive" : "default"} onClick={() => setToggling(res)}>
                              <Power />
                              {res.active ? "Deactivate account" : "Activate account"}
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
            total={filtered.length}
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
