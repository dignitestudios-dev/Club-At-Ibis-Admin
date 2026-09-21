"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRoundCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { SearchInput } from "@/components/shared/search-input";
import { useAssignRequest, useRequests, useReviewers } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { IN_FLIGHT } from "@/lib/domain";
import { cn } from "@/utils/cn";

/** Super Admin picks any active reviewer for a request (first assignment or reassignment). */
export function AssignReviewerDialog({
  request,
  onOpenChange,
}: {
  request: RequestRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const assign = useAssignRequest();
  const { data: reviewers } = useReviewers();
  const { data: requests } = useRequests();
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (request) {
      setSelected("");
      setQuery("");
    }
  }, [request]);

  const workload = useMemo(() => {
    const map = new Map<string, number>();
    (requests ?? []).forEach((r) => {
      if (r.assignedReviewerId && IN_FLIGHT.includes(r.status)) map.set(r.assignedReviewerId, (map.get(r.assignedReviewerId) ?? 0) + 1);
    });
    return map;
  }, [requests]);

  const q = query.trim().toLowerCase();
  const options = (reviewers ?? [])
    .filter((r) => r.loginEnabled)
    .filter((r) => !q || `${r.name} ${r.designation} ${r.employeeNumber}`.toLowerCase().includes(q))
    .sort((a, b) => (workload.get(a.id) ?? 0) - (workload.get(b.id) ?? 0));

  if (!request) return null;
  const current = request.assignedReviewerId ? reviewers?.find((r) => r.id === request.assignedReviewerId) : undefined;
  const chosen = reviewers?.find((r) => r.id === selected);

  function submit() {
    if (!request || !chosen) return;
    assign.mutate(
      { requestId: request.id, reviewerId: chosen.id },
      {
        onSuccess: () => {
          toast.success(current ? "Request reassigned" : "Request assigned", `${request.code} is now with ${chosen.name}.`);
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error("Could not assign", e.message),
      }
    );
  }

  return (
    <Dialog open={!!request} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary dark:text-amber-300">
            <UserRoundCheck className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="font-heading text-xl font-medium">{current ? "Reassign request" : "Assign request"}</DialogTitle>
          <DialogDescription>
            <span className="font-mono font-semibold text-foreground">{request.code}</span> · {request.categoryName}.{" "}
            {current
              ? `Currently with ${current.name}. After reassignment they lose authority to act on it; earlier actions stay in the history.`
              : "Choose the reviewer who becomes the request's single owner."}
          </DialogDescription>
        </DialogHeader>

        <SearchInput value={query} onChange={setQuery} placeholder="Search active reviewers…" />

        <RadioGroup value={selected} onValueChange={(v) => setSelected(String(v))} className="grid max-h-64 gap-2 overflow-y-auto pr-1 custom-scrollbar">
          {options.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No active reviewers match.</p>}
          {options.map((r) => {
            const isCurrent = r.id === request.assignedReviewerId;
            return (
              <label
                key={r.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                  isCurrent ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                  selected === r.id ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5" : "border-border hover:border-foreground/30"
                )}
              >
                <RadioGroupItem value={r.id} disabled={isCurrent} />
                <PersonAvatar name={r.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{r.name}</span>
                    {r.receiveNewRequests && <span className="rounded-full bg-brand-gold/15 px-1.5 py-px text-[9px] font-bold tracking-wider text-brand-gold uppercase">Default</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{r.designation}</span>
                </span>
                <span className="shrink-0 text-right text-xs text-muted-foreground">
                  {isCurrent ? <span className="font-semibold text-foreground">Current</span> : <><span className="font-semibold tabular-nums text-foreground">{workload.get(r.id) ?? 0}</span> active</>}
                </span>
              </label>
            );
          })}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || assign.isPending}>
            {assign.isPending && <Spinner className="size-4" />}
            {chosen ? `${current ? "Reassign" : "Assign"} to ${chosen.name.split(" ")[0]}` : current ? "Reassign" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
